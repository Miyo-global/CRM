import { format } from "date-fns";
import { COMPANY_ADDRESS } from "@/lib/constants/company";

export const HR_LETTER_DOCUMENT_TYPES = [
  { value: "OFFER_LETTER",     label: "Offer Letter" },
  { value: "TERMINATION",      label: "Voluntary Resignation" },
  { value: "TERMINATION_HR",   label: "Termination by Company" },
  { value: "APPOINTMENT",      label: "Appointment Letter" },
  { value: "NDA_SALES",        label: "NDA – Sales Roles" },
  { value: "NDA",              label: "NDA – General Roles" },
  { value: "EXPERIENCE",       label: "Experience Certificate" },
  { value: "RELIEVING",        label: "Relieving Letter" },
  { value: "INCREMENT",        label: "Increment Letter" },
  { value: "WARNING",          label: "Warning Letter" },
] as const;

export type HrLetterDocumentType = (typeof HR_LETTER_DOCUMENT_TYPES)[number]["value"];

export const HR_LETTER_TYPE_TITLES: Record<string, string> = {
  NDA_SALES: "NON-DISCLOSURE AGREEMENT (NDA) – SALES",
  NDA: "NON-DISCLOSURE AGREEMENT (NDA)",
  OFFER_LETTER:   "OFFER LETTER",
  TERMINATION:    "VOLUNTARY TERMINATION OF EMPLOYMENT",
  TERMINATION_HR: "TERMINATION OF EMPLOYMENT DUE TO POLICY VIOLATION",
  APPOINTMENT:    "APPOINTMENT LETTER",
  EXPERIENCE:     "EXPERIENCE CERTIFICATE",
  RELIEVING:      "RELIEVING LETTER",
  INCREMENT:      "SALARY INCREMENT LETTER",
  WARNING:        "WARNING LETTER",
};

export interface HrLetterEmployeeInput {
  firstName: string;
  lastName: string;
  employeeId?: string | null;
  designation?: string | null;
  departmentName?: string | null;
  joiningDate?: string | Date | null;
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  try { return format(new Date(d), "dd MMMM yyyy"); } catch { return String(d); }
}

export function buildHrLetterVars(
  employee: HrLetterEmployeeInput,
  org: { name: string; address?: string },
  now: Date,
  extra: Record<string, string> = {}
): Record<string, string> {
  return {
    employeeName:      `${employee.firstName} ${employee.lastName}`.trim(),
    employeeFirstName: employee.firstName,
    employeeLastName:  employee.lastName,
    employeeId:        employee.employeeId ?? "",
    designation:       employee.designation ?? "",
    department:        employee.departmentName ?? "",
    joiningDate:       formatDate(employee.joiningDate),
    date:              format(now, "dd MMMM yyyy"),
    generationDate:    format(now, "dd MMMM yyyy"),
    orgName:           org.name,
    orgAddress:        org.address ?? COMPANY_ADDRESS,
    ...extra,
  };
}

export function applyHrLetterTokens(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, raw: string) => {
    const key = raw.trim();
    // Own properties only — see applyOfferTokens. These letters include
    // terminations, so a stray {{constructor}} must not reach the employee.
    return Object.hasOwn(vars, key) ? vars[key] : "";
  });
}

export const HR_LETTER_TOKEN_LEGEND: Record<string, readonly string[]> = {
  OFFER_LETTER: [],
  TERMINATION_HR: [
    "{{employeeName}} — Full name of the employee",
    "{{employeeId}} — Employee ID (e.g. EMP001)",
    "{{designation}} — Designation",
    "{{terminationDate}} — Effective date of termination",
    "{{hrName}} — Name of the HR signing the letter",
    "{{hrDesignation}} — Designation of HR (e.g. HR Executive)",
    "{{date}} — Letter date",
    "{{orgName}} — Organisation name",
  ],
  TERMINATION: [
    "{{employeeName}} — Full name of the employee",
    "{{employeeId}} — Employee ID (e.g. EMP001)",
    "{{designation}} — Current designation",
    "{{department}} — Department name",
    "{{joiningDate}} — Date of joining",
    "{{effectiveDate}} — Effective date of resignation",
    "{{lastWorkingDay}} — Last working day",
    "{{date}} — Letter generation date",
    "{{orgName}} — Organisation name",
    "{{orgAddress}} — Organisation address",
  ],
  APPOINTMENT: [
    "{{employeeName}} — Full name of the employee",
    "{{employeeId}} — Employee ID",
    "{{designation}} — Offered designation",
    "{{department}} — Department",
    "{{joiningDate}} — Date of joining",
    "{{monthlySalary}} — Monthly gross salary (e.g. 50,000)",
    "{{annualSalary}} — Annual gross salary (e.g. 6,00,000)",
    "{{reportingManager}} — Name of reporting manager",
    "{{date}} — Letter date",
    "{{orgName}} — Organisation name",
    "{{orgAddress}} — Organisation address",
  ],
  EXPERIENCE: [
    "{{employeeName}} — Full name of the employee",
    "{{employeeId}} — Employee ID",
    "{{designation}} — Designation held",
    "{{department}} — Department",
    "{{joiningDate}} — Date of joining",
    "{{relievingDate}} — Last working day / relieving date",
    "{{date}} — Letter date",
    "{{orgName}} — Organisation name",
  ],
  NDA_SALES: [
    "{{employeeName}} — Full name of the receiving party",
    "{{designation}} — Designation / title of the receiving party",
    "{{date}} — Agreement date",
    "{{orgName}} — Disclosing party (organisation name)",
    "{{orgAddress}} — Registered office of the disclosing party",
  ],
  NDA: [
    "{{employeeName}} — Full name of the receiving party",
    "{{designation}} — Designation / title of the receiving party",
    "{{date}} — Agreement date",
    "{{orgName}} — Disclosing party (organisation name)",
    "{{orgAddress}} — Registered office of the disclosing party",
  ],
  RELIEVING: [
    "{{employeeName}} — Full name of the employee",
    "{{employeeId}} — Employee ID",
    "{{designation}} — Designation",
    "{{department}} — Department",
    "{{joiningDate}} — Date of joining",
    "{{relievingDate}} — Date of relieving",
    "{{date}} — Letter date",
    "{{orgName}} — Organisation name",
  ],
  INCREMENT: [
    "{{employeeName}} — Full name of the employee",
    "{{employeeId}} — Employee ID",
    "{{designation}} — Designation",
    "{{department}} — Department",
    "{{newSalary}} — Revised salary",
    "{{effectiveDate}} — Effective date of increment",
    "{{date}} — Letter date",
    "{{orgName}} — Organisation name",
  ],
  WARNING: [
    "{{employeeName}} — Full name of the employee",
    "{{employeeId}} — Employee ID",
    "{{designation}} — Designation",
    "{{department}} — Department",
    "{{incidentDate}} — Date of incident",
    "{{date}} — Letter date",
    "{{orgName}} — Organisation name",
  ],
};

export const HR_LETTER_EXTRA_FIELDS: Record<string, { key: string; label: string; type?: string }[]> = {
  TERMINATION: [
    { key: "effectiveDate",  label: "Effective Date of Resignation", type: "date" },
    { key: "lastWorkingDay", label: "Last Working Day", type: "date" },
  ],
  TERMINATION_HR: [
    { key: "terminationDate",  label: "Termination Effective Date", type: "date" },
    { key: "hrName",           label: "HR Name (signing this letter)" },
    { key: "hrDesignation",    label: "HR Designation (e.g. HR Executive)" },
  ],
  APPOINTMENT: [
    { key: "monthlySalary",    label: "Monthly Salary (e.g. 50,000)" },
    { key: "annualSalary",     label: "Annual Salary (e.g. 6,00,000)" },
    { key: "reportingManager", label: "Reporting Manager Name" },
  ],
  EXPERIENCE: [
    { key: "relievingDate", label: "Relieving Date", type: "date" },
  ],
  RELIEVING: [
    { key: "relievingDate", label: "Relieving Date", type: "date" },
  ],
  INCREMENT: [
    { key: "newSalary",     label: "Revised Salary" },
    { key: "effectiveDate", label: "Effective Date", type: "date" },
  ],
  WARNING: [
    { key: "incidentDate", label: "Date of Incident", type: "date" },
  ],
  NDA_SALES:    [],
  NDA:          [],
  OFFER_LETTER: [],
};

export const HR_LETTER_DEFAULT_BODIES: Record<string, string> = {
  TERMINATION_HR: `Date: {{date}}

To
{{employeeName}}
Emp ID: {{employeeId}}
{{designation}}

Dear {{employeeName}},

This is to formally inform you that your employment with {{orgName}} is terminated effective {{terminationDate}}, due to repeated failure to comply with company policies and guidelines.

Despite documentation and warnings, there has been no satisfactory improvement or adherence to the company's rules and standards. As a result, management has taken this decision after careful consideration and in line with company policy.

You are requested to hand over all company assets, documents, and responsibilities to your Reporting Manager/HR on your last working day. Your full and final settlement will be processed by the end of this month as per company policy.

We wish you the best in your future endeavours.

Sincerely,
{{hrName}}
{{hrDesignation}}
{{orgName}}`,

  TERMINATION: `Date: {{date}}

To
The Management,
{{orgName}}

Subject: Voluntary Termination of Employment

I, {{employeeName}}, working as {{designation}} at {{orgName}} state that I am voluntarily resigning from my position with the company effective {{effectiveDate}}.

I confirm that this decision has been made by me on my own and without any pressure, force, or influence from the company, its management, or any of its representatives.

I request the management to kindly accept my voluntary resignation and relieve me from my duties with effect from {{lastWorkingDay}} (Last Working Day).

I also confirm that I will complete the necessary handover of my responsibilities and return any company property, documents, or confidential information in my possession.

I sincerely thank the management for the opportunity given to work with {{orgName}} and for the cooperation gained during my tenure.`,

  NDA_SALES: `This Non-Disclosure Agreement ("Agreement") is entered into on this {{date}} by and between:

Disclosing Party: {{orgName}}, a company incorporated under the Companies Act, 2013, having its registered office at {{orgAddress}} — hereinafter referred to as the "Disclosing Party".

Receiving Party: {{employeeName}}, who is employed by the Disclosing Party — hereinafter referred to as the "Receiving Party".

1. Purpose
The purpose of this Agreement is to protect the confidential and proprietary information shared in connection with software development activities, including but not limited to planning, coding, design, documentation, and support services.

2. Definition of Confidential Information
"Confidential Information" includes, but is not limited to:
- Technical information (e.g., software code, algorithms, system designs)
- Project documentation and system architecture
- Client business models, customer lists, and user data
- Business plans, pricing structures, legal documents, financials

Such information may be disclosed verbally, in writing, electronically, or visually, and includes any analysis, compilation, studies, or other documents prepared by the Receiving Party.

3. Legal Compliance (India)
This Agreement is governed by the provisions of the Indian Contract Act, 1872 and is legally binding under Indian law. Any digital transmission, receipt, or storage of Confidential Information shall be maintained under the Information Technology Act, 2000, including adherence to reasonable security practices and procedures (as defined in Section 43A of the IT Act).

Any breach involving personal or sensitive information will be subject to penalties under the IT (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.

4. Obligations of the Receiving Party
The Receiving Party shall:
- Keep all Confidential Information strictly confidential and not disclose it to any third party without prior written consent
- Use the Confidential Information solely for the intended business purpose
- Limit access to the Confidential Information solely to its employees or consultants on a strict need-to-know basis, ensuring they are bound by similar confidentiality obligations
- Maintain physical, electronic, and managerial procedures to safeguard the Confidential Information

5. Exceptions
Confidential Information shall not include information that:
- Is or enters the public domain without breach of this Agreement
- Was independently developed without use of the Confidential Information
- Is required to be disclosed under applicable law or a court or government directive (with prior written notice to the Disclosing Party)

6. Term & Survival
This Agreement shall remain in force for two (2) years from the date of execution. The confidentiality obligations shall survive for a period of three (3) years after the termination or expiration of this Agreement.

7. Return on Destruction
Upon termination of this Agreement, or upon written request from the Disclosing Party, the Receiving Party shall return or securely destroy all Confidential Information and provide written certification of such return or destruction.

8. No Intellectual Property Transfer
This Agreement does not transfer any rights, title, or interest in the Confidential Information or any intellectual property of the Disclosing Party.

9. Remedies and Indemnity
The Receiving Party acknowledges that breach of this Agreement may cause irreparable harm to the Disclosing Party shall be entitled to:
- Seek injunctive relief from a court of competent jurisdiction in India
- Claim damages and legal costs

The Receiving Party agrees to indemnify and hold the Disclosing Party harmless from any losses arising out of breach, including third-party claims.

10. Governing Law and Jurisdiction
This Agreement shall be governed by and construed in accordance with the laws of India. Any dispute arising out of or in connection with this Agreement shall be subject to the exclusive jurisdiction of the courts of India.

11. Miscellaneous
This Agreement constitutes the entire understanding between the Parties. Any amendment must be in writing and signed by both Parties. If any clause is held invalid, the remainder shall remain enforceable.

Performance-Based Compensation Structure:

Compensation & Performance Terms:
- The Employee shall receive full agreed salary for the first two (2) months from the date of joining.

From the third (3rd) month onwards:
- If the assigned sales targets are not achieved in the third month, a fixed support payment of Rs. 7,500 shall be provided
- The same support payment of Rs. 7,500 shall be applicable in the fourth month if targets are not met

From the fifth (5th) month onwards:
- In the event of continued non-achievement of sales targets, the Employee may be transitioned to a Freelancer / Commission-based engagement at the discretion of the Company.

Sales Incentive:
- An additional incentive of 2% shall be payable on each successfully completed sales order.

IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first above written.

Disclosing Party ({{orgName}})          Receiving Party

Name: Vamsi Siva Sairam                 Name: {{employeeName}}

Title: Founder and President            Title: {{designation}}

Signature: _______________________      Signature: ___________________

Date: {{date}}                          Date: _______________________`,

  NDA: `This Non-Disclosure Agreement ("Agreement") is entered into on this {{date}} by and between:

Disclosing Party: {{orgName}}, a company incorporated under the Companies Act, 2013, having its registered office at {{orgAddress}} — hereinafter referred to as the "Disclosing Party".

Receiving Party: {{employeeName}}, employed as {{designation}} with the Disclosing Party — hereinafter referred to as the "Receiving Party".

1. Purpose
The purpose of this Agreement is to protect the confidential and proprietary information shared in connection with activities of the Company, including but not limited to planning, operations, client management, documentation, and support services.

2. Definition of Confidential Information
"Confidential Information" includes, but is not limited to:
- Technical information (e.g., software code, algorithms, system designs)
- Project documentation and system architecture
- Client business models, customer lists, and user data
- Business plans, pricing structures, legal documents, financials

3. Legal Compliance (India)
This Agreement is governed by the provisions of the Indian Contract Act, 1872 and is legally binding under Indian law. Any digital transmission, receipt, or storage of Confidential Information shall be maintained under the Information Technology Act, 2000.

Any breach involving personal or sensitive information will be subject to penalties under the IT (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.

4. Obligations of the Receiving Party
The Receiving Party shall:
- Keep all Confidential Information strictly confidential and not disclose it to any third party without prior written consent
- Use the Confidential Information solely for the intended business purpose
- Limit access to the Confidential Information on a strict need-to-know basis
- Maintain physical, electronic, and managerial procedures to safeguard the Confidential Information

5. Exceptions
Confidential Information shall not include information that:
- Is or enters the public domain without breach of this Agreement
- Was independently developed without use of the Confidential Information
- Is required to be disclosed under applicable law or a court directive

6. Term & Survival
This Agreement shall remain in force for two (2) years from the date of execution. The confidentiality obligations shall survive for a period of three (3) years after the termination or expiration of this Agreement.

7. Return or Destruction
Upon termination of this Agreement, the Receiving Party shall return or securely destroy all Confidential Information and provide written certification of such return or destruction.

8. No Intellectual Property Transfer
This Agreement does not transfer any rights, title, or interest in the Confidential Information or any intellectual property of the Disclosing Party.

9. Remedies and Indemnity
The Receiving Party agrees to indemnify and hold the Disclosing Party harmless from any losses arising out of breach, including third-party claims. The Disclosing Party shall be entitled to seek injunctive relief and claim damages.

10. Governing Law and Jurisdiction
This Agreement shall be governed by and construed in accordance with the laws of India. Any dispute shall be subject to the exclusive jurisdiction of the courts of India.

11. Miscellaneous
This Agreement constitutes the entire understanding between the Parties. Any amendment must be in writing and signed by both Parties. If any clause is held invalid, the remainder shall remain enforceable.

IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first above written.

Disclosing Party ({{orgName}})          Receiving Party

Name: Vamsi Siva Sairam                 Name: {{employeeName}}

Title: Founder and President            Title: {{designation}}

Signature: _______________________      Signature: ___________________

Date: {{date}}                          Date: _______________________`,

  APPOINTMENT: `Date: {{date}}

Dear {{employeeName}},

With reference to your application and subsequent interview you have had with us, we are pleased to appoint you as {{designation}} in our organisation with effect from {{joiningDate}}, subject to the following terms and conditions. This letter of appointment supersedes all other commitments made to you prior to the date of issue of this appointment letter.

- PLACE OF WORK: Your place of work will be {{orgName}}, {{orgAddress}}.

- EMOLUMENTS (Remuneration): Your total compensation (Gross Salary) will be Rs. {{monthlySalary}} per Month and Rs. {{annualSalary}} per Annum.

- REPORTING: You will report to {{reportingManager}} and will be responsible for overseeing your performance.

- PROBATION: You will be on probation for a period of Six Months from your date of joining. On the successful completion of your probation period, you will be confirmed in writing. Your probation period can be extended if the management is not satisfied with your performance. The employee will be required to serve a notice period of 2 months in the event of resignation or termination at the conclusion of the probationary period.

- PERFORMANCE REVIEWS: Performance reviews will be done on a half-yearly basis once every six months. Increments are discretionary and will be subjective and based on your overall performance and results of the company.

- RESPONSIBILITIES: In view of your office, you will be required to carry out the duties and responsibilities effectively in whatever manner is decided by the management, which may include working late hours.

- NO MOONLIGHTING/EMPLOYMENT: While employed with the company, you may not offer your services to any other firm or person or act as an advisor, director, or partner, whether paid or unpaid, for your services, performance, and overall professional conduct while in the employment of the Company.

- CONFIDENTIALITY OF INFORMATION: The employee shall treat all information obtained by him/her during his/her employment with the Company, either directly from other employees of the Company, or during his/her work with the Company, as strictly confidential. Such information may include, without limitation, the Company's finances, customers, clients, analysis of data, information related to trading in securities, databases, trade secrets, domain names, addresses, telephone numbers, etc.

- DISCIPLINE: You will be eligible for paid leave of 12 days per annum and sick leave of 6 days per person per year. Sick leave for more than 3 days requires a medical certificate from a qualified doctor.

- WORKING HOURS: The working hours are a minimum of 40 hours a week on weekdays. The working hours are subject to change, depending on the requirements of the Company.

AUTHENTICITY OF INFORMATION: This appointment is made based on information provided by you in the application and at the time of interview. If any declaration given by you to the Company is found to be false or if you are found to have willfully suppressed any material information, you will be liable to be removed from the service forthwith.

The above terms and conditions are subject to changes from time to time and the same will be communicated to you in writing. Please sign a copy of this letter as a token of acceptance of your appointment on the terms and conditions mentioned above.

We welcome you aboard and wish you a pleasant, fruitful and mutually beneficial association with the company.

Warm Regards,
{{orgName}}

Vamsi Siva Sairam
Founder and President

---

I agree to abide by the terms and conditions mentioned in the letter of appointment.

Name: _______________________

Signature: ___________________

Date: ________________________`,

  EXPERIENCE: `Date: {{date}}

To Whom It May Concern

This is to certify that {{employeeName}} (Employee ID: {{employeeId}}) was employed with {{orgName}} as {{designation}} in the {{department}} department from {{joiningDate}} to {{relievingDate}}.

During the period of employment, {{employeeName}} demonstrated professionalism, dedication, and competence in all assigned responsibilities.

We wish {{employeeName}} all the best in future endeavours.

For {{orgName}}`,

  RELIEVING: `Date: {{date}}

To
{{employeeName}}

Dear {{employeeName}},

This is to confirm that {{employeeName}} (Employee ID: {{employeeId}}), working as {{designation}} in the {{department}} department, has been relieved from the services of {{orgName}} with effect from {{relievingDate}}.

{{employeeName}} has been relieved from all duties and responsibilities. We wish {{employeeName}} the very best in future pursuits.

For {{orgName}}`,

  INCREMENT: `Date: {{date}}

To
{{employeeName}}

Dear {{employeeName}},

We are pleased to inform you that your annual compensation has been revised. Your new salary of {{newSalary}} will be effective from {{effectiveDate}}.

This revision is in recognition of your contribution and performance. We appreciate your continued efforts and look forward to your continued contribution.

Yours sincerely,
For {{orgName}}`,

  WARNING: `Date: {{date}}

To
{{employeeName}}
{{designation}}, {{department}}

Dear {{employeeName}},

This letter serves as a formal warning regarding the incident that occurred on {{incidentDate}}. This behaviour is in violation of company policy and is not acceptable.

You are expected to strictly adhere to the company's code of conduct going forward. Failure to do so may result in further disciplinary action, up to and including termination of employment.

This warning will be placed on file.

For {{orgName}}`,
};
