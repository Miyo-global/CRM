import path from "path";
import fs from "fs/promises";
import React, { type ReactNode } from "react";
import { Document, Image, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { PayslipViewModel } from "@/lib/hr/payslip-view-model";

function fmtPdfInr(amount: number): string {
  const s = amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `Rs.${s}`;
}

const NAVY = "#0f2b7f";
const GOLD = "#bd882c";
const LIGHT_HEADER = "#f5f7ff";
const BORDER = "#dde3f0";
const DED_RED = "#b91c1c";
const PAID_GREEN = "#15803d";
const MUTED = "#555555";
const FOOTER_GRAY = "#888888";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, color: "#111" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: NAVY,
    paddingBottom: 12,
    marginBottom: 0,
  },
  logoBox: { width: 56, height: 56, marginRight: 12 },
  logoFallback: {
    width: 56,
    height: 56,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  logoLetter: { fontSize: 20, fontWeight: 700, color: GOLD },
  headerCenter: { flex: 1, alignItems: "center" },
  title: { fontSize: 11, fontWeight: 700, color: NAVY, textDecoration: "underline", textAlign: "center" },
  orgName: { fontSize: 10, color: MUTED, marginTop: 4, textAlign: "center" },
  orgAddr: { fontSize: 9, color: "#666666", marginTop: 2, textAlign: "center" },
  paidWrap: { minWidth: 56, alignItems: "flex-end" },
  paidBadge: {
    backgroundColor: PAID_GREEN,
    color: "#ffffff",
    fontSize: 8,
    fontWeight: 700,
    paddingVertical: 3,
    paddingHorizontal: 8,
    letterSpacing: 0.5,
  },
  twoCol: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#dddddd" },
  col: { flex: 1, paddingVertical: 12, paddingHorizontal: 14 },
  colLeft: { borderRightWidth: 1, borderRightColor: "#dddddd" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  label: { fontSize: 10, color: MUTED, maxWidth: "42%" },
  value: { fontSize: 10, fontWeight: 600, maxWidth: "55%", textAlign: "right" },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: NAVY,
    letterSpacing: 0.6,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e8ff",
    marginHorizontal: 14,
  },
  table: { marginHorizontal: 14, marginBottom: 12 },
  thRow: { flexDirection: "row", backgroundColor: LIGHT_HEADER, borderWidth: 1, borderColor: BORDER },
  th: {
    flex: 1,
    fontSize: 8,
    fontWeight: 700,
    color: NAVY,
    paddingVertical: 6,
    paddingHorizontal: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  thRight: { textAlign: "right" },
  tr: { flexDirection: "row", borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#eef0f6" },
  td: { flex: 1, fontSize: 10, paddingVertical: 5, paddingHorizontal: 8 },
  tdRight: { textAlign: "right" },
  tdDed: { color: DED_RED },
  subtotalRow: {
    flexDirection: "row",
    backgroundColor: LIGHT_HEADER,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopWidth: 2,
    borderColor: BORDER,
  },
  subTd: { flex: 1, fontSize: 10, fontWeight: 600, paddingVertical: 6, paddingHorizontal: 8 },
  subTdRight: { textAlign: "right" },
  netBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: NAVY,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  netLabel: { color: "#ffffff", fontSize: 11, fontWeight: 700 },
  netAmt: { color: GOLD, fontSize: 16, fontWeight: 800 },
  netWords: {
    backgroundColor: LIGHT_HEADER,
    paddingVertical: 7,
    paddingHorizontal: 14,
    fontSize: 10,
    color: "#333333",
    borderBottomWidth: 2,
    borderBottomColor: NAVY,
  },
  bottomRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#dddddd" },
  bottomCol: { flex: 1, paddingVertical: 12, paddingHorizontal: 14 },
  bottomColLeft: { borderRightWidth: 1, borderRightColor: "#dddddd" },
  h3: {
    fontSize: 9,
    fontWeight: 700,
    color: NAVY,
    letterSpacing: 0.6,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e8ff",
    paddingBottom: 5,
    marginBottom: 8,
  },
  authNote: { fontSize: 10, color: MUTED, marginBottom: 8 },
  signLine: { borderTopWidth: 1, borderTopColor: "#aaaaaa", marginTop: 20, paddingTop: 6, textAlign: "center", fontSize: 9, color: "#666666" },
  footer: {
    backgroundColor: "#f9f9f9",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingVertical: 8,
    paddingHorizontal: 14,
    fontSize: 9,
    color: FOOTER_GRAY,
    textAlign: "center",
  },
});

async function loadLogoPngBase64(): Promise<string | null> {
  const pngCandidates = [
    path.join(process.cwd(), "docs/word-docs/_assets/logo.png"),
    path.join(process.cwd(), "public", "logo.png"),
  ];
  for (const p of pngCandidates) {
    try {
      const buf = await fs.readFile(p);
      return `data:image/png;base64,${buf.toString("base64")}`;
    } catch {
      /* try next */
    }
  }
  const svgPath = path.join(process.cwd(), "public", "logo.svg");
  try {
    const sharp = (await import("sharp")).default;
    const buf = await sharp(svgPath).resize(200, 200).png().toBuffer();
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    /* no logo available */
  }
  return null;
}

function PayslipPdfPage({ vm, logoDataUri }: { vm: PayslipViewModel; logoDataUri: string | null }) {
  const rows = Math.max(vm.earnings.length, vm.deductions.length);
  const tableBody: ReactNode[] = [];
  for (let i = 0; i < rows; i++) {
    const e = vm.earnings[i];
    const d = vm.deductions[i];
    tableBody.push(
      <View key={i} style={styles.tr} wrap={false}>
        <Text style={styles.td}>{e?.label ?? ""}</Text>
        <Text style={[styles.td, styles.tdRight]}>{e ? fmtPdfInr(e.amount) : ""}</Text>
        <Text style={styles.td}>{d?.label ?? ""}</Text>
        <Text style={[styles.td, styles.tdRight, d ? styles.tdDed : {}]}>{d ? fmtPdfInr(d.amount) : ""}</Text>
      </View>
    );
  }

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.headerRow}>
        {logoDataUri ? (
          <Image src={logoDataUri} style={styles.logoBox} />
        ) : (
          <View style={styles.logoFallback}>
            <Text style={styles.logoLetter}>V</Text>
          </View>
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.title}>PAYSLIP FOR THE MONTH OF {vm.monthLabel.toUpperCase()}</Text>
          <Text style={styles.orgName}>{vm.orgFullName}</Text>
          {vm.orgAddressLine ? <Text style={styles.orgAddr}>{vm.orgAddressLine}</Text> : null}
        </View>
        <View style={styles.paidWrap}>{vm.showPaidBadge ? <Text style={styles.paidBadge}>PAID</Text> : null}</View>
      </View>

      <View style={styles.twoCol}>
        <View style={[styles.col, styles.colLeft]}>
          <View style={styles.row}>
            <Text style={styles.label}>Employee Name</Text>
            <Text style={styles.value}>{vm.employeeName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Designation</Text>
            <Text style={styles.value}>{vm.designation}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>EMP ID</Text>
            <Text style={styles.value}>{vm.employeeId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Bank Name</Text>
            <Text style={styles.value}>{vm.bankName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Bank Acc Number</Text>
            <Text style={styles.value}>{vm.bankAccountDisplay}</Text>
          </View>
        </View>
        <View style={styles.col}>
          <View style={styles.row}>
            <Text style={styles.label}>Date of Joining</Text>
            <Text style={styles.value}>{vm.joiningDateDisplay}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>No of Days</Text>
            <Text style={styles.value}>{vm.daysInPayMonth} Days</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>PAN Number</Text>
            <Text style={styles.value}>{vm.pan}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>LOP</Text>
            <Text style={styles.value}>{String(vm.lopDays)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Leaves</Text>
            <Text style={styles.value}>{String(vm.leaveDays)}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Earnings & Deductions</Text>
      <View style={styles.table}>
        <View style={styles.thRow}>
          <Text style={styles.th}>Earnings</Text>
          <Text style={[styles.th, styles.thRight]}>Amount (Rs.)</Text>
          <Text style={styles.th}>Deductions</Text>
          <Text style={[styles.th, styles.thRight]}>Amount (Rs.)</Text>
        </View>
        {tableBody}
        <View style={styles.subtotalRow}>
          <Text style={styles.subTd}>Total Earnings</Text>
          <Text style={[styles.subTd, styles.subTdRight]}>{fmtPdfInr(vm.grossSalary)}</Text>
          <Text style={styles.subTd}>Total Deductions</Text>
          <Text style={[styles.subTd, styles.subTdRight]}>{fmtPdfInr(vm.totalDeductions)}</Text>
        </View>
      </View>

      <View style={styles.netBar}>
        <Text style={styles.netLabel}>Net Salary</Text>
        <Text style={styles.netAmt}>{fmtPdfInr(vm.netSalary)}</Text>
      </View>
      <View style={styles.netWords}>
        <Text style={{ fontSize: 10, color: "#444444" }}>
          In Words: <Text style={{ fontWeight: 700, color: "#111111" }}>{vm.netInWords}</Text>
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <View style={[styles.bottomCol, styles.bottomColLeft]}>
          <Text style={styles.h3}>Bank Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Bank Name</Text>
            <Text style={styles.value}>{vm.bankName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Account Number</Text>
            <Text style={styles.value}>{vm.bankAccountDisplay}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>IFSC Code</Text>
            <Text style={styles.value}>{vm.bankIfsc}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Branch</Text>
            <Text style={styles.value}>{vm.bankBranch}</Text>
          </View>
        </View>
        <View style={styles.bottomCol}>
          <Text style={styles.h3}>Authorisation</Text>
          <Text style={styles.authNote}>
            This is a system-generated Pay slip and does not require a physical signature
          </Text>
          <Text style={styles.signLine}>Authorised Signatory</Text>
        </View>
      </View>

      <Text style={styles.footer} fixed>
        Generated on {vm.monthLabel} | {vm.orgShortName} | Confidential - For Employee Use Only
      </Text>
    </Page>
  );
}

export function BrandedPayslipDocument({
  vm,
  logoDataUri,
}: {
  vm: PayslipViewModel;
  logoDataUri: string | null;
}): React.ReactElement {
  return (
    <Document>
      <PayslipPdfPage vm={vm} logoDataUri={logoDataUri} />
    </Document>
  );
}

export async function renderBrandedPayslipPdf(vm: PayslipViewModel): Promise<Buffer> {
  const logoDataUri = await loadLogoPngBase64();
  const element = <BrandedPayslipDocument vm={vm} logoDataUri={logoDataUri} />;
  const buf = await renderToBuffer(element);
  return Buffer.from(buf);
}
