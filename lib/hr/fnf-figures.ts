/**
 * R3-SA-04: the list shows gross / deductions / net, and a settlement with no
 * figures entered cannot be completed.
 */
export interface FnfAmounts {
  basicDues: string | number | null;
  leaveEncashment: string | number | null;
  bonusDue: string | number | null;
  deductions: string | number | null;
  loanRecovery: string | number | null;
}

const n = (v: string | number | null | undefined) => Number(v ?? 0) || 0;

export function fnfTotals(f: FnfAmounts): { gross: number; deductions: number; net: number } {
  const gross = n(f.basicDues) + n(f.leaveEncashment) + n(f.bonusDue);
  const deductions = n(f.deductions) + n(f.loanRecovery);
  return { gross, deductions, net: gross - deductions };
}

export function fnfHasFigures(f: FnfAmounts): boolean {
  const { gross, deductions } = fnfTotals(f);
  return gross !== 0 || deductions !== 0;
}
