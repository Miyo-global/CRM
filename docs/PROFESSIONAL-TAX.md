# Per-employee professional tax (PT)

PT is a monthly amount set per employee. Nothing in code decides it: the
`PT_BANDS` table and `professionalTax(salary)` helper are gone.

## Data

| Where | Column | Meaning |
|---|---|---|
| `salary_structures` | `professional_tax numeric(10,2) NULL` | The employee's monthly PT in INR. `NULL` = not applicable; payroll deducts 0. |
| `payrolls` | `pt_amount numeric(10,2) NOT NULL DEFAULT 0` | Snapshot taken when the payslip is generated. Editing the employee's PT later never changes a saved payslip. Only DRAFT rows are recomputed. |

Migration `drizzle/0195_per_employee_professional_tax.sql` resets every
existing `salary_structures.professional_tax` to `NULL`, with no backfill.
Before this change payroll ignored every stored value except `0` and used the
bands instead, so no value that payroll used is lost.

> **Deploy impact:** after this ships, every employee's PT is 0 until HR sets
> it on their profile. Set the values before the next payroll run.

## Validation

`lib/validations/professional-tax.ts` has `ptAmountSchema`. The wizard, the
profile editor and every server route use it:

- Accepted: `0`, `200`, `200.5`, `2500`. An empty value or `null` means not applicable.
- Rejected: negative numbers, more than 2 decimals, more than `PT_MAX_MONTHLY` (₹2,500), exponents (`1e9`),
  signs, commas, `₹`, leading or trailing spaces, non-ASCII digits, `NaN`, `Infinity`.
- `PT_MAX_MONTHLY` and `PT_ANNUAL_CAP` live in `lib/payroll/rules.ts`. A month
  may carry a large part of the ₹2,500 a year allowed under Article 276(2), so
  the field cap is monthly. The UI warns, without blocking, when 12 × the
  amount is above ₹2,500.

## Where it is set

- **Add Employee wizard → Skills & Pay → Deductions.** This field has a ₹ prefix,
  helper text and a "Not applicable" checkbox. The review step shows the amount.
  The first value writes `EMPLOYEE_PT_SET`.
- **Employee profile → Compensation card**, for HR, Admin and Super Admin only:
  `GET` / `PATCH /api/hr/salary-structures/:userId/professional-tax`. A change
  writes `EMPLOYEE_PT_UPDATED` with the old and new values. Saving the same
  value writes nothing.
- **Salary structure create or revise.** `professionalTax` may be omitted, which
  keeps the current value. `null` means not applicable.

## Permissions

| Permission | Super Admin | Admin | HR | Employee |
|---|---|---|---|---|
| `hr:payroll:pt:view` (others' PT) | ✓ | ✓ | ✓ | — |
| `hr:payroll:pt:edit` | ✓ | ✓ | ✓ | — |
| Edit own PT | ✓ | — | — | — |

`withAuth` enforces both permissions through `ROUTE_PERMISSIONS`. The
own-PT rule is `canEditOwnProfessionalTax` (owner decision, default Super Admin
only). Employees see their own PT only as the "Professional Tax" line on
their payslip. A salary-structure list for a user who lacks `pt:view` leaves
the field out of other people's rows.

## Payroll

`net = gross − (LOP + PT + PF + ESI + structure + other deductions + loan EMI)`,
with PT read from the structure picked for the month. Sums are rounded to
2 dp once, at the end. A run whose deductions exceed gross is refused:
the single-employee generate route answers 422, and the org-wide run skips
that employee and notifies CEO/HR. The payslip PDF and the on-screen sheets
hide the PT line when it is 0 or not applicable.

## Future work (not built)

- Per-month override, for example Maharashtra's ₹300 in February.
- State slab tables keyed on the work location, calculated automatically.
- Tracking the ₹2,500 annual cap per employee.
- Money arithmetic in integer paise across `computePayroll`. Today it uses
  floats and rounds once at the end, which is exact to the paisa for the
  amounts payroll handles.
