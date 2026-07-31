export interface ResignationLetterTemplateFields {
  date?: string;
  companyName?: string;
  employeeName?: string;
  designation?: string;
  department?: string;
  joiningDate?: string;
  reason?: string;
  lastWorkingDate?: string;
  employeeId?: string;
  contactNumber?: string;
}

export function buildResignationLetterTemplateHtml(
  fields: ResignationLetterTemplateFields = {},
): string {
  const f = {
    date: fields.date ?? "[Date]",
    companyName: fields.companyName ?? "[Company Name]",
    employeeName: fields.employeeName ?? "[Your Full Name]",
    designation: fields.designation ?? "[Your Designation]",
    department: fields.department ?? "[Your Department]",
    joiningDate: fields.joiningDate ?? "[Joining Date]",
    reason: fields.reason ?? "[State your reason briefly]",
    lastWorkingDate: fields.lastWorkingDate ?? "[Last Working Date]",
    employeeId: fields.employeeId ?? "[Employee ID]",
    contactNumber: fields.contactNumber ?? "[Your Contact Number]",
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Resignation Letter</title>
  <style>
    body {
      font-family: "Times New Roman", serif;
      max-width: 700px;
      margin: 40px auto;
      padding: 40px;
      line-height: 1.8;
      font-size: 12pt;
    }
  </style>
</head>
<body>
  <p style="text-align: right">Date: ${f.date}</p>
  <p>To,<br />The HR Manager,<br />${f.companyName}</p>
  <p><strong>Subject: Resignation from the position of ${f.designation}</strong></p>
  <p>Dear Sir/Madam,</p>
  <p>
    I, <strong>${f.employeeName}</strong>, holding the position of
    <strong>${f.designation}</strong> in the <strong>${f.department}</strong> department,
    having joined on <strong>${f.joiningDate}</strong>, hereby tender my resignation from my
    position at <strong>${f.companyName}</strong>.
  </p>
  <p><strong>Reason for Resignation:</strong> ${f.reason}</p>
  <p>
    As per the company's notice period policy, my last working date will be
    <strong>${f.lastWorkingDate}</strong>. I am committed to ensuring a smooth transition during
    this period and will complete all pending tasks and hand over my responsibilities.
  </p>
  <p>
    I would like to express my sincere gratitude for the opportunities, support, and growth I have
    experienced during my tenure. I have greatly valued my time here and the relationships I have
    built with my colleagues.
  </p>
  <p>I request you to kindly accept my resignation and initiate the necessary formalities.</p>
  <p>Thanking you,<br />Yours sincerely,</p>
  <p>
    <br /><strong>${f.employeeName}</strong><br />${f.employeeId}<br />${f.designation}<br />${f.department}<br />${f.contactNumber}
  </p>
</body>
</html>`;
}

/** Triggers a browser download for the resignation letter HTML template. */
export function downloadResignationLetterTemplate(
  fields: ResignationLetterTemplateFields = {},
  filename = "Resignation Letter Template.html",
): void {
  const html = buildResignationLetterTemplateHtml(fields);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
