"use client";

import { useRef, useState, useCallback } from "react";
import { formatCurrencyFull } from "@/lib/format-utils";
import type { ExportResult } from "@/server/actions/expense-export";
import { BRAND } from "@/lib/design/brand-hex";

export type PdfData = NonNullable<Extract<ExportResult, { format: "pdf" }>["data"]>;

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING: { bg: BRAND.warningSoft, color: BRAND.warning },
  APPROVED: { bg: BRAND.successSoft, color: BRAND.success },
  PAID: { bg: BRAND.infoSoft, color: BRAND.info },
  REJECTED: { bg: BRAND.dangerSoft, color: BRAND.danger },
};

const SUMMARY_BORDER_COLORS: Record<string, string> = {
  total: BRAND.info,
  pending: BRAND.warning,
  approved: BRAND.success,
  paid: BRAND.info,
  rejected: BRAND.danger,
};

const formatInr = (amount: number) => formatCurrencyFull(amount);

const cellStyle: React.CSSProperties = {
  padding: "10px 8px",
  borderBottom: `1px solid ${BRAND.border}`,
  fontSize: "12px",
};

const thStyle: React.CSSProperties = {
  ...cellStyle,
  background: BRAND.sunken,
  fontWeight: 600,
  borderBottom: `2px solid ${BRAND.border}`,
  textAlign: "left",
};

function SummaryCard({
  label,
  value,
  count,
  borderColor,
}: {
  label: string;
  value: string;
  count?: string;
  borderColor: string;
}) {
  return (
    <div
      style={{
        background: BRAND.sunken,
        padding: "20px",
        borderRadius: "8px",
        borderLeft: `4px solid ${borderColor}`,
      }}
    >
      <div style={{ fontSize: "12px", color: BRAND.inkMuted, marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: 700 }}>{value}</div>
      {count && <div style={{ fontSize: "12px", color: BRAND.inkSubtle, marginTop: "4px" }}>{count}</div>}
    </div>
  );
}

function ExpensePdfContent({ data }: { data: PdfData }) {
  return (
    <div
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "40px",
        color: BRAND.ink,
        width: "800px",
        background: BRAND.white,
      }}
    >
      <div style={{ borderBottom: `2px solid ${BRAND.ink}`, paddingBottom: "20px", marginBottom: "30px" }}>
        <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>{data.title}</h1>
        <p style={{ color: BRAND.inkMuted, fontSize: "14px" }}>Generated on {data.generatedAt}</p>
      </div>

      <div
        style={{
          background: BRAND.sunken,
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "30px",
          fontSize: "13px",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
          {[
            { label: "Period", value: data.filters.period },
            { label: "Status", value: data.filters.status },
            { label: "Category", value: data.filters.category },
            { label: "Total Records", value: String(data.summary.totalCount) },
          ].map((f) => (
            <div key={f.label}>
              <div style={{ color: BRAND.inkMuted, marginBottom: "2px" }}>{f.label}</div>
              <div style={{ fontWeight: 600 }}>{f.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "15px",
          marginBottom: "30px",
        }}
      >
        <SummaryCard
          label="Total Amount"
          value={formatInr(data.summary.totalAmount)}
          count={`${data.summary.totalCount} expenses`}
          borderColor={SUMMARY_BORDER_COLORS.total}
        />
        <SummaryCard
          label="Pending Approval"
          value={formatInr(data.summary.pendingAmount)}
          borderColor={SUMMARY_BORDER_COLORS.pending}
        />
        <SummaryCard
          label="Approved"
          value={formatInr(data.summary.approvedAmount)}
          borderColor={SUMMARY_BORDER_COLORS.approved}
        />
        <SummaryCard
          label="Paid"
          value={formatInr(data.summary.paidAmount)}
          borderColor={SUMMARY_BORDER_COLORS.paid}
        />
        <SummaryCard
          label="Rejected"
          value={formatInr(data.summary.rejectedAmount)}
          borderColor={SUMMARY_BORDER_COLORS.rejected}
        />
      </div>

      {data.byCategory.length > 0 && (
        <div style={{ marginBottom: "30px" }}>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 600,
              marginBottom: "15px",
              paddingBottom: "8px",
              borderBottom: `1px solid ${BRAND.border}`,
            }}
          >
            Expenses by Category
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Category</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Count</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                <th style={thStyle}>Distribution</th>
              </tr>
            </thead>
            <tbody>
              {data.byCategory.map((cat) => (
                <tr key={cat.category}>
                  <td style={cellStyle}>{cat.category}</td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>{cat.count}</td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>{formatInr(cat.amount)}</td>
                  <td style={cellStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          height: "8px",
                          width: `${cat.percentage}%`,
                          background: BRAND.info,
                          borderRadius: "4px",
                        }}
                      />
                      <span>{cat.percentage.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginBottom: "30px" }}>
        <div
          style={{
            fontSize: "18px",
            fontWeight: 600,
            marginBottom: "15px",
            paddingBottom: "8px",
            borderBottom: `1px solid ${BRAND.border}`,
          }}
        >
          Expense Details
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Merchant</th>
              <th style={thStyle}>Employee</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.expenses.map((exp, idx) => {
              const statusColor = STATUS_COLORS[exp.status] ?? STATUS_COLORS.PENDING;
              return (
                <tr key={idx} style={idx % 2 === 1 ? { background: BRAND.sunken } : undefined}>
                  <td style={cellStyle}>{exp.date}</td>
                  <td style={cellStyle}>{exp.category}</td>
                  <td style={cellStyle}>{exp.description}</td>
                  <td style={cellStyle}>{exp.merchant}</td>
                  <td style={cellStyle}>{exp.employee}</td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>{formatInr(exp.amount)}</td>
                  <td style={cellStyle}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 500,
                        background: statusColor.bg,
                        color: statusColor.color,
                      }}
                    >
                      {exp.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: "40px",
          paddingTop: "20px",
          borderTop: `1px solid ${BRAND.border}`,
          fontSize: "11px",
          color: BRAND.inkSubtle,
          textAlign: "center",
        }}
      >
        <p>This report was generated automatically. For questions, please contact your administrator.</p>
      </div>
    </div>
  );
}

export function usePdfRenderer() {
  const pdfRef = useRef<HTMLDivElement>(null);
  const [pdfData, setPdfData] = useState<PdfData | null>(null);

  const downloadPDF = useCallback(async (data: PdfData, filename: string) => {
    const [html2canvasModule, jsPDFModule] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const html2canvas = html2canvasModule.default;
    const jsPDF = jsPDFModule.default;

    setPdfData(data);

    const container = await new Promise<HTMLDivElement>((resolve, reject) => {
      let elapsed = 0;
      const interval = 50;
      const maxWait = 3000;
      const check = () => {
        if (pdfRef.current) {
          resolve(pdfRef.current);
          return;
        }
        elapsed += interval;
        if (elapsed >= maxWait) {
          reject(new Error("PDF content failed to render in time"));
          return;
        }
        setTimeout(check, interval);
      };
      requestAnimationFrame(() => setTimeout(check, interval));
    });

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: BRAND.white,
        logging: false,
        allowTaint: true,
        foreignObjectRendering: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(filename);
    } finally {
      setPdfData(null);
    }
  }, []);

  const pdfPortal = pdfData ? (
    <div
      ref={pdfRef}
      style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1 }}
      aria-hidden="true"
    >
      <ExpensePdfContent data={pdfData} />
    </div>
  ) : null;

  return { downloadPDF, pdfPortal };
}
