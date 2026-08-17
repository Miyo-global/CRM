import { withAuth, ok, err } from "@/lib/api/helpers";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

const calcSchema = z.object({
  annualCtc: z.number().positive(),
  basicPercentage: z.number().min(0).max(100).optional().default(50),
  hraPercentage: z.number().min(0).max(100).optional().default(40),
  regime: z.enum(["OLD", "NEW"]).optional().default("NEW"),
  pfOptOut: z.boolean().optional().default(false),
});

const OLD_REGIME_SLABS = [
  { min: 0, max: 250000, rate: 0 },
  { min: 250000, max: 500000, rate: 5 },
  { min: 500000, max: 1000000, rate: 20 },
  { min: 1000000, max: Infinity, rate: 30 },
];

const NEW_REGIME_SLABS = [
  { min: 0, max: 300000, rate: 0 },
  { min: 300000, max: 700000, rate: 5 },
  { min: 700000, max: 1000000, rate: 10 },
  { min: 1000000, max: 1200000, rate: 15 },
  { min: 1200000, max: 1500000, rate: 20 },
  { min: 1500000, max: Infinity, rate: 30 },
];

function calculateTax(taxableIncome: number, slabs: typeof OLD_REGIME_SLABS): number {
  let tax = 0;
  for (const slab of slabs) {
    if (taxableIncome <= slab.min) break;
    const taxableInSlab = Math.min(taxableIncome, slab.max) - slab.min;
    tax += (taxableInSlab * slab.rate) / 100;
  }
  return Math.round(tax);
}

export async function POST(req: NextRequest) {
  return withAuth(async () => {
    const body = calcSchema.parse(await req.json());
    const { annualCtc, basicPercentage, hraPercentage, regime, pfOptOut } = body;

    const basic = (annualCtc * basicPercentage) / 100;
    const hra = (basic * hraPercentage) / 100;
    const pfEmployee = pfOptOut ? 0 : Math.min(basic * 0.12, 21600);
    const pfEmployer = pfOptOut ? 0 : Math.min(basic * 0.12, 21600);
    const esiEmployee = annualCtc <= 252000 ? annualCtc * 0.0075 : 0;
    const esiEmployer = annualCtc <= 252000 ? annualCtc * 0.0325 : 0;
    const professionalTax = 2400;
    const standardDeduction = 75000;

    const grossSalary = annualCtc - pfEmployer - esiEmployer;
    const taxableIncome = Math.max(0, grossSalary - standardDeduction - (regime === "OLD" ? pfEmployee : 0));

    const slabs = regime === "NEW" ? NEW_REGIME_SLABS : OLD_REGIME_SLABS;
    const incomeTax = calculateTax(taxableIncome, slabs);
    const cess = Math.round(incomeTax * 0.04);
    const totalTax = incomeTax + cess;
    const monthlyTds = Math.round(totalTax / 12);

    const monthlyNet = Math.round((grossSalary - pfEmployee - esiEmployee - professionalTax - totalTax) / 12);

    return ok({
      annual: {
        ctc: annualCtc,
        basic: Math.round(basic),
        hra: Math.round(hra),
        pfEmployee: Math.round(pfEmployee),
        pfEmployer: Math.round(pfEmployer),
        esiEmployee: Math.round(esiEmployee),
        esiEmployer: Math.round(esiEmployer),
        professionalTax,
        standardDeduction,
        grossSalary: Math.round(grossSalary),
        taxableIncome: Math.round(taxableIncome),
        incomeTax,
        cess,
        totalTax,
      },
      monthly: {
        gross: Math.round(grossSalary / 12),
        basic: Math.round(basic / 12),
        hra: Math.round(hra / 12),
        pf: Math.round(pfEmployee / 12),
        esi: Math.round(esiEmployee / 12),
        professionalTax: Math.round(professionalTax / 12),
        tds: monthlyTds,
        netTakeHome: monthlyNet,
      },
      regime,
      slabs: slabs.map((s) => ({
        range: `${s.min.toLocaleString(DEFAULT_LOCALE)} - ${s.max === Infinity ? "Above" : s.max.toLocaleString(DEFAULT_LOCALE)}`,
        rate: `${s.rate}%`,
      })),
    });
  });
}
