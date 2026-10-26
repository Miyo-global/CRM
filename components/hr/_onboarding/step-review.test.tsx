import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useForm } from "react-hook-form";
import { StepReview } from "./step-review";

function Review({ values }: { values: Record<string, unknown> }) {
  const form = useForm({ defaultValues: values as never });
  return (
    <StepReview
      form={form}
      allDepartmentOptions={[]}
      assignableRoles={[]}
      managerOptions={[]}
      confirmed={false}
      onConfirmedChange={() => {}}
    />
  );
}

describe("wizard Confirm step (FR1-004)", () => {
  it("shows Basic, HRA, Special, PT and Net", () => {
    const html = renderToStaticMarkup(<Review values={{ monthlySalary: 50000, professionalTax: "200.50" }} />);
    for (const label of ["Basic pay", "HRA", "Special allowance", "Professional Tax", "Net salary (monthly)"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("25,000");
    expect(html).toContain("49,799.5");
    expect(html).toContain("₹200.50 / month");
  });
});
