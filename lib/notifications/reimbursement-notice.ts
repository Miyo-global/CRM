/** Bell notice for the employee when HR decides their reimbursement (FR1-006). */
export function reimbursementDecisionNotice(r: {
  status: "APPROVED" | "REJECTED" | "PAID";
  amount: string | number;
  category: string;
  rejectionReason?: string | null;
}): { type: "SUCCESS" | "WARNING"; title: string; message: string; link: string } {
  const amount = `₹${Number(r.amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  const what = `${amount} (${r.category})`;
  if (r.status === "APPROVED") {
    return { type: "SUCCESS", title: "Reimbursement approved", message: `Your reimbursement of ${what} was approved.`, link: "/hr/reimbursements" };
  }
  if (r.status === "PAID") {
    return { type: "SUCCESS", title: "Reimbursement paid", message: `Your reimbursement of ${what} has been paid.`, link: "/hr/reimbursements" };
  }
  const reason = r.rejectionReason?.trim() ? ` Reason: ${r.rejectionReason.trim()}` : "";
  return { type: "WARNING", title: "Reimbursement not approved", message: `Your reimbursement of ${what} was not approved.${reason}`, link: "/hr/reimbursements" };
}
