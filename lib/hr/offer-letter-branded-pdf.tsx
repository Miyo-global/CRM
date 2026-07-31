import path from "path";
import fs from "fs/promises";
import React from "react";
import {
  Document,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";


const NAVY = "#0f2b7f";
const GOLD = "#bd882c";
const MUTED = "#555555";
const BORDER = "#dde3f0";

const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingHorizontal: 40, paddingBottom: 60, fontSize: 10, color: "#111", fontFamily: "Helvetica" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: NAVY,
    paddingBottom: 12,
    marginBottom: 20,
  },
  logoBox: { width: 52, height: 52, marginRight: 12 },
  logoFallback: {
    width: 52,
    height: 52,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  logoLetter: { fontSize: 20, fontWeight: 700, color: GOLD },
  headerCenter: { flex: 1, alignItems: "center" },
  orgName: { fontSize: 13, fontWeight: 700, color: NAVY, textAlign: "center" },
  orgAddr: { fontSize: 9, color: "#666666", marginTop: 3, textAlign: "center" },
  titleBar: {
    backgroundColor: NAVY,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  titleText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 700,
    textAlign: "center",
    letterSpacing: 1,
  },
  bodyContainer: { flex: 1, paddingHorizontal: 4 },
  paragraph: { fontSize: 10, color: "#111111", marginBottom: 10, lineHeight: 1.6 },
  bullet: {
    fontSize: 10,
    color: "#111111",
    marginBottom: 6,
    flexDirection: "row",
    lineHeight: 1.6,
  },
  bulletDot: { width: 14, fontSize: 10, color: MUTED },
  bulletText: { flex: 1, fontSize: 10, color: "#111111" },
  signatureBlock: {
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 16,
  },
  signatureRow: {
    flexDirection: "row",
    marginBottom: 14,
    alignItems: "flex-start",
  },
  signatureLabel: { width: 130, fontSize: 10, color: MUTED },
  signatureValue: { flex: 1, fontSize: 10, color: "#111111", borderBottomWidth: 1, borderBottomColor: "#cccccc", paddingBottom: 2 },
  signatureSpace: { flex: 1, height: 32, borderBottomWidth: 1, borderBottomColor: "#cccccc" },
  watermark: {
    position: "absolute",
    top: 281,
    left: 158,
    width: 280,
    height: 280,
    opacity: 0.07,
  },
  stamp: {
    position: "absolute",
    bottom: 65,
    right: 30,
    width: 90,
    height: 90,
    opacity: 0.22,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: -40,
    right: -40,
    backgroundColor: NAVY,
    paddingVertical: 8,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerCol: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  footerColLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-start",
  },
  footerColRight: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  footerText: { fontSize: 7.5, color: "#ffffff" },
  footerIcon: { fontSize: 8, color: "#ffffff", marginRight: 4 },
});

async function loadLogoPngBase64(): Promise<string | null> {
  const candidates = [
    path.join(process.cwd(), "docs/word-docs/_assets/logo.png"),
    path.join(process.cwd(), "public", "logo.png"),
  ];
  for (const p of candidates) {
    try {
      const buf = await fs.readFile(p);
      return `data:image/png;base64,${buf.toString("base64")}`;
    } catch {
      /* try next */
    }
  }
  return null;
}

function isBulletLine(line: string): boolean {
  return line.startsWith("- ") || line.startsWith("* ");
}

function BodyContent({ bodyText }: { bodyText: string }): React.ReactElement {
  const blocks: React.ReactElement[] = [];
  const rawParagraphs = bodyText.split(/\n{2,}/);

  rawParagraphs.forEach((block, bi) => {
    const lines = block.split("\n");
    const paragraphChildren: React.ReactElement[] = [];

    lines.forEach((line, li) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (isBulletLine(trimmed)) {
        blocks.push(
          <View key={`${bi}-${li}-b`} style={styles.bullet}>
            <Text style={styles.bulletDot}>{"•"}</Text>
            <Text style={styles.bulletText}>{trimmed.slice(2).trim()}</Text>
          </View>
        );
      } else {
        paragraphChildren.push(
          <Text key={`${bi}-${li}`}>{trimmed}</Text>
        );
      }
    });

    if (paragraphChildren.length > 0) {
      blocks.push(
        <Text key={`p-${bi}`} style={styles.paragraph}>
          {paragraphChildren}
        </Text>
      );
    }
  });

  return <>{blocks}</>;
}

interface OfferLetterHeaderVm {
  orgName: string;
  orgAddress?: string;
  orgEmail?: string;
  orgPhone?: string;
  orgWebsite?: string;
}

export interface HrLetterSignatureBlock {
  employeeName: string;
  employeeId: string;
  designation: string;
}

function SignatureBlockView({ block }: { block: HrLetterSignatureBlock }): React.ReactElement {
  return (
    <View style={styles.signatureBlock}>
      <View style={styles.signatureRow}>
        <Text style={styles.signatureLabel}>Employee Name</Text>
        <Text style={styles.signatureValue}>{block.employeeName}</Text>
      </View>
      <View style={styles.signatureRow}>
        <Text style={styles.signatureLabel}>Employee ID</Text>
        <Text style={styles.signatureValue}>{block.employeeId}</Text>
      </View>
      <View style={styles.signatureRow}>
        <Text style={styles.signatureLabel}>Designation</Text>
        <Text style={styles.signatureValue}>{block.designation}</Text>
      </View>
      <View style={styles.signatureRow}>
        <Text style={styles.signatureLabel}>Signature of Employee</Text>
        <View style={styles.signatureSpace} />
      </View>
    </View>
  );
}

function OfferLetterPage({
  bodyText,
  headerVm,
  logoDataUri,
  title,
  signatureBlock,
}: {
  bodyText: string;
  headerVm: OfferLetterHeaderVm;
  logoDataUri: string | null;
  title?: string;
  signatureBlock?: HrLetterSignatureBlock;
}): React.ReactElement {
  const email   = headerVm.orgEmail   ?? "support@miyoglobal.com";
  const phone   = headerVm.orgPhone   ?? "+91 9063991881";
  const address = headerVm.orgAddress ?? "Vijay Tech Park, 3rd Floor, Madhapur, HITEC City, Hyderabad 500081";

  return (
    <Page size="A4" style={styles.page}>
      {logoDataUri && (
        <Image src={logoDataUri} style={styles.watermark} fixed />
      )}
      {logoDataUri && (
        <Image src={logoDataUri} style={styles.stamp} />
      )}

      <View style={styles.headerRow} fixed>
        {logoDataUri ? (
          <Image src={logoDataUri} style={styles.logoBox} />
        ) : (
          <View style={styles.logoFallback}>
            <Text style={styles.logoLetter}>V</Text>
          </View>
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.orgName}>{headerVm.orgName}</Text>
          {headerVm.orgAddress ? (
            <Text style={styles.orgAddr}>{headerVm.orgAddress}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.titleBar}>
        <Text style={styles.titleText}>{title ?? "OFFER LETTER"}</Text>
      </View>

      <View style={styles.bodyContainer}>
        <BodyContent bodyText={bodyText} />
        {signatureBlock && <SignatureBlockView block={signatureBlock} />}
      </View>

      <View style={styles.footer} fixed>
        <View style={styles.footerColLeft}>
          <Text style={styles.footerIcon}>✉</Text>
          <Text style={styles.footerText}>{email}</Text>
        </View>
        <View style={styles.footerCol}>
          <Text style={styles.footerIcon}>⌖</Text>
          <Text style={styles.footerText}>{address}</Text>
        </View>
        <View style={styles.footerColRight}>
          <Text style={styles.footerIcon}>✆</Text>
          <Text style={styles.footerText}>{phone}</Text>
        </View>
      </View>
    </Page>
  );
}

export interface RenderOfferLetterPdfInput {
  bodyText: string;
  headerVm: OfferLetterHeaderVm;
  title?: string;
  signatureBlock?: HrLetterSignatureBlock;
}

export async function renderOfferLetterPdf(
  input: RenderOfferLetterPdfInput
): Promise<Buffer> {
  const logoDataUri = await loadLogoPngBase64();
  const element = (
    <Document>
      <OfferLetterPage
        bodyText={input.bodyText}
        headerVm={input.headerVm}
        logoDataUri={logoDataUri}
        title={input.title}
        signatureBlock={input.signatureBlock}
      />
    </Document>
  );
  const buf = await renderToBuffer(element);
  return Buffer.from(buf);
}
