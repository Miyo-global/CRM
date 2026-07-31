import "server-only";

export type { PayslipPdfData, BuildPayslipPdfOptions, PayslipViewModel } from "./payslip-pdf-core";
export { buildPayslipPdfDataFromPayroll, generatePayslipPdf } from "./payslip-pdf-core";
