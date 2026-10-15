import fs from "fs/promises";
import React, { type ReactNode } from "react";
import { LOGO_PNG_PATH, LOGO_SVG_PATH, LOGO_WORDMARK_PATH } from "@/lib/constants/paths";
import { Document, Image, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { PayslipViewModel } from "@/lib/hr/payslip-view-model";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";
import { BRAND } from "@/lib/design/brand-hex";

function fmtPdfInr(amount: number): string {
  const s = amount.toLocaleString(DEFAULT_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `Rs.${s}`;
}

const INK = BRAND.ink;
const GOLD = BRAND.gold;
const LIGHT_HEADER = BRAND.goldSoft;
const BORDER = BRAND.border;
const DED_RED = BRAND.danger;
const PAID_GREEN = BRAND.success;
const MUTED = BRAND.inkMuted;
const FOOTER_GRAY = BRAND.inkSubtle;

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, color: BRAND.ink },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: INK,
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
  logoLetter: { fontSize: 20, fontWeight: 700, color: BRAND.goldDark },
  headerCenter: { flex: 1, alignItems: "center" },
  title: { fontSize: 11, fontWeight: 700, color: INK, textDecoration: "underline", textAlign: "center" },
  orgName: { fontSize: 10, color: MUTED, marginTop: 4, textAlign: "center" },
  orgAddr: { fontSize: 9, color: BRAND.inkMuted, marginTop: 2, textAlign: "center" },
  paidWrap: { minWidth: 56, alignItems: "flex-end" },
  paidBadge: {
    backgroundColor: PAID_GREEN,
    color: BRAND.white,
    fontSize: 8,
    fontWeight: 700,
    paddingVertical: 3,
    paddingHorizontal: 8,
    letterSpacing: 0.5,
  },
  draftBadge: {
    backgroundColor: BRAND.inkMuted,
    color: BRAND.white,
    fontSize: 8,
    fontWeight: 700,
    paddingVertical: 3,
    paddingHorizontal: 8,
    letterSpacing: 0.5,
  },
  twoCol: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BRAND.border },
  col: { flex: 1, paddingVertical: 12, paddingHorizontal: 14 },
  colLeft: { borderRightWidth: 1, borderRightColor: BRAND.border },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  label: { fontSize: 10, color: MUTED, maxWidth: "42%" },
  value: { fontSize: 10, fontWeight: 600, maxWidth: "55%", textAlign: "right" },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: INK,
    letterSpacing: 0.6,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    marginHorizontal: 14,
  },
  table: { marginHorizontal: 14, marginBottom: 12 },
  thRow: { flexDirection: "row", backgroundColor: LIGHT_HEADER, borderWidth: 1, borderColor: BORDER },
  th: {
    flex: 1,
    fontSize: 8,
    fontWeight: 700,
    color: INK,
    paddingVertical: 6,
    paddingHorizontal: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  thRight: { textAlign: "right" },
  tr: { flexDirection: "row", borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BRAND.border },
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
    backgroundColor: INK,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  netLabel: { color: BRAND.white, fontSize: 11, fontWeight: 700 },
  netAmt: { color: GOLD, fontSize: 16, fontWeight: 800 },
  netWords: {
    backgroundColor: LIGHT_HEADER,
    paddingVertical: 7,
    paddingHorizontal: 14,
    fontSize: 10,
    color: BRAND.ink,
    borderBottomWidth: 2,
    borderBottomColor: INK,
  },
  bottomRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: BRAND.border },
  bottomCol: { flex: 1, paddingVertical: 12, paddingHorizontal: 14 },
  bottomColLeft: { borderRightWidth: 1, borderRightColor: BRAND.border },
  h3: {
    fontSize: 9,
    fontWeight: 700,
    color: INK,
    letterSpacing: 0.6,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    paddingBottom: 5,
    marginBottom: 8,
  },
  authNote: { fontSize: 10, color: MUTED, marginBottom: 8 },
  signLine: { borderTopWidth: 1, borderTopColor: BRAND.inkSubtle, marginTop: 20, paddingTop: 6, textAlign: "center", fontSize: 9, color: BRAND.inkMuted },
  footer: {
    backgroundColor: BRAND.sunken,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
    paddingVertical: 8,
    paddingHorizontal: 14,
    fontSize: 9,
    color: FOOTER_GRAY,
    textAlign: "center",
  },
});

async function loadLogoPngBase64(): Promise<string | null> {
  const pngCandidates = [LOGO_WORDMARK_PATH, LOGO_PNG_PATH];
  for (const pngPath of pngCandidates) {
    try {
      const buf = await fs.readFile(pngPath);
      return `data:image/png;base64,${buf.toString("base64")}`;
    } catch {
      /* try next */
    }
  }
  try {
    const sharp = (await import("sharp")).default;
    const buf = await sharp(LOGO_SVG_PATH).resize(200, 200).png().toBuffer();
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
            <Text style={styles.logoLetter}>M</Text>
          </View>
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.title}>PAYSLIP FOR THE MONTH OF {vm.monthLabel.toUpperCase()}</Text>
          <Text style={styles.orgName}>{vm.orgFullName}</Text>
          {vm.orgAddressLine ? <Text style={styles.orgAddr}>{vm.orgAddressLine}</Text> : null}
        </View>
        <View style={styles.paidWrap}>
          {vm.showPaidBadge ? (
            <Text style={styles.paidBadge}>PAID</Text>
          ) : vm.watermark ? (
            <Text style={styles.draftBadge}>{vm.watermark}</Text>
          ) : null}
        </View>
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
        <Text style={{ fontSize: 10, color: BRAND.inkMuted }}>
          In Words: <Text style={{ fontWeight: 700, color: BRAND.ink }}>{vm.netInWords}</Text>
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
