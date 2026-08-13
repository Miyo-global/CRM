import type { PayslipViewModel } from "@/lib/hr/payslip-view-model";
import { fmtInr } from "@/lib/hr/payslip-view-model";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type BuildPayslipHtmlOptions = {
  logoSvg: string;
  includePrintToolbar?: boolean;
};

export function buildPayslipHtml(vm: PayslipViewModel, options: BuildPayslipHtmlOptions): string {
  const { logoSvg, includePrintToolbar = true } = options;
  const rows = Math.max(vm.earnings.length, vm.deductions.length);
  const tableRows: string[] = [];
  for (let i = 0; i < rows; i++) {
    const e = vm.earnings[i];
    const d = vm.deductions[i];
    const eAmt = e ? fmtInr(e.amount) : "";
    const dAmt = d ? fmtInr(d.amount) : "";
    tableRows.push(
      `<tr><td>${e ? esc(e.label) : ""}</td><td>${e ? esc(eAmt) : ""}</td><td>${d ? esc(d.label) : ""}</td><td class="deduction">${d ? esc(dAmt) : ""}</td></tr>`
    );
  }

  const paidBlock = vm.showPaidBadge
    ? `<div class="header-slip" style="min-width:72px;text-align:right;"><div class="paid-badge">PAID</div></div>`
    : `<div class="header-slip" style="min-width:72px;text-align:right;"></div>`;

  const printBlock = includePrintToolbar
    ? `<div class="no-print" style="text-align:center;padding:12px;background:#e8edf7;">
    <button onclick="window.print()" style="padding:8px 22px;background:#0f2b7f;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600;">
      Print / Save as PDF
    </button>
  </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payslip – ${esc(vm.employeeName)} – ${esc(vm.monthLabel)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, 'Segoe UI', sans-serif; background: #f0f0f0; color: #111; font-size: 13px; }
    .page { max-width: 800px; margin: 20px auto; background: #fff; border: 1px solid #ccc; }
    .header { display: flex; align-items: center; padding: 16px 20px; border-bottom: 3px solid #0f2b7f; gap: 16px; }
    .header-logo { width: 64px; height: 64px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #bd882c; font-size: 22px; font-weight: 900; letter-spacing: -1px; flex-shrink: 0; overflow: hidden; }
    .header-logo svg { width: 54px; height: 54px; }
    .header-company { flex: 1; }
    .header-company h1 { font-size: 20px; font-weight: 700; color: #0f2b7f; }
    .header-company p { font-size: 11px; color: #555; margin-top: 2px; }
    .header-slip { text-align: right; }
    .paid-badge { display: inline-block; background: #15803d; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 3px; margin-top: 4px; letter-spacing: 0.05em; }
    .detail-section { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #ddd; }
    .detail-col { padding: 14px 20px; }
    .detail-col:first-child { border-right: 1px solid #ddd; }
    .detail-col h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #0f2b7f; border-bottom: 1px solid #e0e8ff; padding-bottom: 5px; margin-bottom: 10px; }
    .dl { display: flex; justify-content: space-between; margin-bottom: 5px; }
    .dl .dk { font-size: 11px; color: #555; }
    .dl .dv { font-size: 11px; font-weight: 600; color: #111; text-align: right; }
    .salary-section { padding: 0 20px 16px; }
    .salary-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #0f2b7f; padding: 12px 0 6px; border-bottom: 1px solid #e0e8ff; margin-bottom: 0; }
    table.salary { width: 100%; border-collapse: collapse; }
    table.salary thead tr { background: #f5f7ff; }
    table.salary th { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #0f2b7f; padding: 7px 10px; border: 1px solid #dde3f0; text-align: left; }
    table.salary th:not(:first-child) { text-align: right; }
    table.salary td { padding: 6px 10px; border: 1px solid #eef0f6; font-size: 12px; vertical-align: top; }
    table.salary td:not(:first-child) { text-align: right; }
    table.salary tr.subtotal td { background: #f5f7ff; font-weight: 600; border-top: 2px solid #dde3f0; }
    table.salary tr.deduction td { color: #b91c1c; }
    .net-bar { background: #0f2b7f; color: #fff; margin: 0 0 0 0; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; }
    .net-bar .nb-label { font-size: 13px; font-weight: 700; }
    .net-bar .nb-amt { font-size: 18px; font-weight: 800; color: #bd882c; }
    .net-words { background: #f5f7ff; padding: 7px 20px; font-size: 11px; color: #333; border-bottom: 2px solid #0f2b7f; font-style: italic; }
    .bottom-section { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #ddd; }
    .bottom-col { padding: 14px 20px; }
    .bottom-col:first-child { border-right: 1px solid #ddd; }
    .bottom-col h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #0f2b7f; border-bottom: 1px solid #e0e8ff; padding-bottom: 5px; margin-bottom: 10px; }
    .sign-area { margin-top: 24px; border-top: 1px solid #aaa; padding-top: 6px; font-size: 10px; color: #666; text-align: center; }
    .footer { background: #f9f9f9; border-top: 1px solid #e0e0e0; padding: 8px 20px; font-size: 10px; color: #888; text-align: center; }
    @media print {
      body { background: #fff; }
      .page { border: none; margin: 0; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  ${printBlock}
  <div class="page">
    <div class="header" style="border-bottom:1px solid #ccc;padding-bottom:12px;">
      <div class="header-logo">${logoSvg || "M"}</div>
      <div class="header-company" style="flex:1;text-align:center;">
        <h1 style="font-size:15px;margin:0;text-decoration:underline;">PAYSLIP FOR THE MONTH OF ${esc(vm.monthLabel.toUpperCase())}</h1>
        <p style="font-size:11px;color:#555;margin-top:6px;">${esc(vm.orgFullName)}</p>
        ${vm.orgAddressLine ? `<p style="font-size:10px;color:#666;">${esc(vm.orgAddressLine)}</p>` : ""}
      </div>
      ${paidBlock}
    </div>
    <div class="detail-section">
      <div class="detail-col">
        <div class="dl"><span class="dk">Employee Name</span><span class="dv">${esc(vm.employeeName)}</span></div>
        <div class="dl"><span class="dk">Designation</span><span class="dv">${esc(vm.designation)}</span></div>
        <div class="dl"><span class="dk">EMP ID</span><span class="dv">${esc(vm.employeeId)}</span></div>
        <div class="dl"><span class="dk">Bank Name</span><span class="dv">${esc(vm.bankName)}</span></div>
        <div class="dl"><span class="dk">Bank Acc Number</span><span class="dv">${esc(vm.bankAccountDisplay)}</span></div>
      </div>
      <div class="detail-col">
        <div class="dl"><span class="dk">Date of Joining</span><span class="dv">${esc(vm.joiningDateDisplay)}</span></div>
        <div class="dl"><span class="dk">No of Days</span><span class="dv">${vm.daysInPayMonth} Days</span></div>
        <div class="dl"><span class="dk">PAN Number</span><span class="dv">${esc(vm.pan)}</span></div>
        <div class="dl"><span class="dk">LOP</span><span class="dv">${esc(String(vm.lopDays))}</span></div>
        <div class="dl"><span class="dk">Leaves</span><span class="dv">${esc(String(vm.leaveDays))}</span></div>
      </div>
    </div>
    <div class="salary-section">
      <div class="salary-title">Earnings &amp; Deductions</div>
      <table class="salary">
        <thead>
          <tr>
            <th>Earnings</th>
            <th>Amount (₹)</th>
            <th>Deductions</th>
            <th>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows.join("\n")}
          <tr class="subtotal">
            <td>Total Earnings</td>
            <td>${esc(fmtInr(vm.grossSalary))}</td>
            <td>Total Deductions</td>
            <td>${esc(fmtInr(vm.totalDeductions))}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="net-bar">
      <div class="nb-label">Net Salary</div>
      <div class="nb-amt">${esc(fmtInr(vm.netSalary))}</div>
    </div>
    <div class="net-words">In Words: <strong>${esc(vm.netInWords)}</strong></div>
    <div class="bottom-section">
      <div class="bottom-col">
        <h3>Bank Details</h3>
        <div class="dl"><span class="dk">Bank Name</span><span class="dv">${esc(vm.bankName)}</span></div>
        <div class="dl"><span class="dk">Account Number</span><span class="dv">${esc(vm.bankAccountDisplay)}</span></div>
        <div class="dl"><span class="dk">IFSC Code</span><span class="dv">${esc(vm.bankIfsc)}</span></div>
        <div class="dl"><span class="dk">Branch</span><span class="dv">${esc(vm.bankBranch)}</span></div>
      </div>
      <div class="bottom-col">
        <h3>Authorisation</h3>
        <p style="font-size:11px;color:#555;margin-bottom:8px;">This is a system-generated Pay slip and does not require a physical signature</p>
        <div class="sign-area">Authorised Signatory</div>
      </div>
    </div>
    <div class="footer">
      Generated on ${esc(vm.monthLabel)} &nbsp;·&nbsp; ${esc(vm.orgShortName)} &nbsp;·&nbsp; Confidential — For Employee Use Only
    </div>
  </div>
</body>
</html>`;
}

export async function loadLogoSvgForPayslip(): Promise<string> {
  const fs = await import("fs/promises");
  const { LOGO_SVG_PATH } = await import("@/lib/constants/paths");
  try {
    const svgContent = await fs.readFile(LOGO_SVG_PATH, "utf-8");
    // Resize via the root <svg> width/height only. The viewBox must be left
    // alone — overriding it crops the artwork to that region instead of
    // scaling it, and it differs between logo revisions.
    return svgContent.replace(/<\?xml[^?]*\?>/, "").replace(/<svg\b[^>]*>/, (tag) =>
      tag
        .replace(/\swidth="[^"]*"/, "")
        .replace(/\sheight="[^"]*"/, "")
        .replace(/^<svg/, '<svg width="54" height="54"')
    );
  } catch {
    return "";
  }
}
