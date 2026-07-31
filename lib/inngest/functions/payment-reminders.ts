import { inngest } from "../client";
import { db } from "@/lib/db";
import { invoices, notifications } from "@/lib/db/schema";
import { eq, and, lte, or, sql } from "drizzle-orm";
import { addDays, startOfDay } from "date-fns";

export const paymentReminders = inngest.createFunction(
  { id: "payment-reminders", name: "Invoice Payment Reminders", triggers: { cron: "0 9 * * *" } },
  async ({ step }) => {
    const result = await step.run("send-payment-reminders", async () => {
      const today = startOfDay(new Date());
      const in3DaysStr = addDays(today, 3).toISOString().split("T")[0];

      const pendingInvoices = await db.query.invoices.findMany({
        where: and(
          or(eq(invoices.status, "SENT"), eq(invoices.status, "OVERDUE")),
          lte(sql`${invoices.dueDate}::text`, in3DaysStr)
        ),
        with: {
          creator: { columns: { id: true } },
        },
        columns: {
          id: true,
          orgId: true,
          invoiceNumber: true,
          total: true,
          dueDate: true,
          status: true,
          createdBy: true,
        },
      });

      const sent: number[] = [];

      for (const inv of pendingInvoices) {
        const dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
        if (!dueDate) continue;

        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        let message = "";

        if (daysUntilDue < 0) {
          message = `Invoice ${inv.invoiceNumber} is overdue by ${Math.abs(daysUntilDue)} day(s). Amount: ₹${Number(inv.total).toLocaleString("en-IN")}`;
        } else if (daysUntilDue === 0) {
          message = `Invoice ${inv.invoiceNumber} payment is due today. Amount: ₹${Number(inv.total).toLocaleString("en-IN")}`;
        } else {
          message = `Invoice ${inv.invoiceNumber} payment due in ${daysUntilDue} day(s). Amount: ₹${Number(inv.total).toLocaleString("en-IN")}`;
        }

        await db.insert(notifications).values({
          orgId: inv.orgId,
          userId: inv.createdBy,
          type: daysUntilDue < 0 ? "ERROR" : "WARNING",
          title: daysUntilDue < 0 ? "Overdue Invoice" : "Payment Reminder",
          message,
          link: `/billing/invoices/${inv.id}`,
          metadata: { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber },
        });

        if (daysUntilDue < 0 && inv.status === "SENT") {
          await db
            .update(invoices)
            .set({ status: "OVERDUE", updatedAt: new Date() })
            .where(and(eq(invoices.id, inv.id), eq(invoices.orgId, inv.orgId)));
        }

        sent.push(inv.id);
      }

      return { processed: sent.length, invoiceIds: sent };
    });

    return result;
  }
);
