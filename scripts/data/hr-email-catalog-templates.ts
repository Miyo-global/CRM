/**
 * HR email catalog — seeded into hr_email_templates (see scripts/seed-hr-email-templates.ts).
 * Stable `name` values enable idempotent upserts per org.
 */
export type CatalogTemplate = {
  name: string;
  category: string;
  subject: string;
  body: string;
};

export const HR_EMAIL_CATALOG_TEMPLATES: CatalogTemplate[] = [
  {
    name: "01 — Late Coming — 1st Reminder (Soft)",
    category: "Warning / Discipline & Attendance",
    subject: "Reminder: Late Coming on {{date}}",
    body: `<p>Dear {{employee_name}},</p>
<p>This is a gentle reminder regarding your late arrival on {{date}}. We request you to adhere to the company’s working hours and maintain punctuality.</p>
<p>If you are facing any challenges, please feel free to discuss them with your manager.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "02 — Late Coming — 2nd Warning",
    category: "Warning / Discipline & Attendance",
    subject: "Written Warning: Repeated Late Coming",
    body: `<p>Dear {{employee_name}},</p>
<p>This is a written warning regarding repeated instances of late coming. Despite prior communication, the issue persists.</p>
<p>You are advised to maintain punctuality going forward. Continued occurrences may lead to further disciplinary action.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "03 — Late Coming — Final Warning",
    category: "Warning / Discipline & Attendance",
    subject: "Final Warning: Continued Late Coming",
    body: `<p>Dear {{employee_name}},</p>
<p>This is a final warning regarding your continued late coming.</p>
<p>Failure to improve immediately may result in strict disciplinary action as per company policy.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "04 — Early Leaving / Short Hours",
    category: "Warning / Discipline & Attendance",
    subject: "Warning: Early Leaving / Short Working Hours",
    body: `<p>Dear {{employee_name}},</p>
<p>It has been observed that you have been leaving early / not completing required working hours.</p>
<p>Please ensure compliance with company working hours. Repeated occurrences will lead to further action.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "05 — Unapproved Leave / AWOL",
    category: "Warning / Discipline & Attendance",
    subject: "Notice: Unapproved Leave / Absence Without Intimation",
    body: `<p>Dear {{employee_name}},</p>
<p>You were absent on {{date}} without prior approval or notification.</p>
<p>Please provide an explanation immediately. Such behavior is against company policy and may lead to disciplinary action.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "06 — Break Violations",
    category: "Warning / Discipline & Attendance",
    subject: "Warning: Excess Break Time Observed",
    body: `<p>Dear {{employee_name}},</p>
<p>It has been noticed that your break times exceed the allowed limit.</p>
<p>You are advised to adhere to company guidelines regarding breaks.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "07 — Missing Punch Reminder",
    category: "Warning / Discipline & Attendance",
    subject: "Reminder: Attendance Regularization Required",
    body: `<p>Dear {{employee_name}},</p>
<p>Your attendance records show missing punches on {{date}}.</p>
<p>Kindly regularize your attendance in the system by {{due_date}}.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "08 — Policy Violation",
    category: "Warning / Discipline & Attendance",
    subject: "Warning: Violation of Company Policy",
    body: `<p>Dear {{employee_name}},</p>
<p>This is to inform you that you have violated company policy related to {{policy_name}}.</p>
<p>Please ensure strict adherence moving forward.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "09 — Misconduct — Show Cause",
    category: "Warning / Discipline & Attendance",
    subject: "Show Cause Notice: Explanation Required by {{due_date}}",
    body: `<p>Dear {{employee_name}},</p>
<p>You are required to explain your actions regarding the incident on {{date}} involving {{incident_details}}.</p>
<p>Submit your explanation by {{due_date}}, failing which further action will be taken.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "10 — Insubordination",
    category: "Warning / Discipline & Attendance",
    subject: "Warning: Insubordination / Unprofessional Conduct",
    body: `<p>Dear {{employee_name}},</p>
<p>Your recent behavior has been found to be unprofessional and not aligned with expected workplace conduct.</p>
<p>You are advised to correct this immediately.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "11 — Performance Below Expectations",
    category: "Performance Management",
    subject: "Notice: Performance Below Expectations",
    body: `<p>Dear {{employee_name}},</p>
<p>Your recent performance has not met the expected standards for your role.</p>
<p>We encourage you to improve and discuss support required with your manager.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "12 — PIP Initiation",
    category: "Performance Management",
    subject: "Performance Improvement Plan (PIP) Initiation",
    body: `<p>Dear {{employee_name}},</p>
<p>You are being placed on a Performance Improvement Plan effective {{date}}.</p>
<p>Detailed goals and expectations will be shared with you. Your progress will be reviewed regularly.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "13 — PIP Check-in",
    category: "Performance Management",
    subject: "Reminder: PIP Review Due on {{due_date}}",
    body: `<p>Dear {{employee_name}},</p>
<p>This is a reminder for your upcoming PIP review scheduled on {{due_date}}.</p>
<p>Please ensure you are prepared to discuss your progress.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "14 — PIP Successful",
    category: "Performance Management",
    subject: "PIP Completion: Successful Outcome",
    body: `<p>Dear {{employee_name}},</p>
<p>We are pleased to inform you that you have successfully completed your Performance Improvement Plan.</p>
<p>Keep up the good work and continue maintaining performance standards.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "15 — PIP Not Successful",
    category: "Performance Management",
    subject: "PIP Outcome: Further Action Required",
    body: `<p>Dear {{employee_name}},</p>
<p>Despite the Performance Improvement Plan, required improvements have not been achieved.</p>
<p>Further action will be taken as per company policy.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "16 — Salary Revision",
    category: "Compensation",
    subject: "Notification: Salary Revision Effective {{date}}",
    body: `<p>Dear {{employee_name}},</p>
<p>We are pleased to inform you that your salary has been revised effective {{date}}.</p>
<p>Further details will be shared separately.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "17 — Good Work",
    category: "Appreciation / Recognition",
    subject: "Appreciation: Great Work on Recent Task",
    body: `<p>Dear {{employee_name}},</p>
<p>We appreciate your excellent work and timely delivery.</p>
<p>Keep up the great effort!</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "18 — Client Feedback",
    category: "Appreciation / Recognition",
    subject: "Appreciation: Positive Client Feedback Received",
    body: `<p>Dear {{employee_name}},</p>
<p>We have received positive feedback from a client regarding your work.</p>
<p>Thank you for representing the organization so well.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "19 — Attendance Appreciation",
    category: "Appreciation / Recognition",
    subject: "Appreciation: Excellent Attendance Record",
    body: `<p>Dear {{employee_name}},</p>
<p>Your consistent punctuality and attendance are commendable.</p>
<p>Keep up the discipline.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "20 — Teamwork",
    category: "Appreciation / Recognition",
    subject: "Appreciation: Outstanding Team Collaboration",
    body: `<p>Dear {{employee_name}},</p>
<p>Your teamwork and support to colleagues have been highly appreciated.</p>
<p>Thank you for contributing positively to the team.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "21 — Ownership",
    category: "Appreciation / Recognition",
    subject: "Appreciation: Exceptional Initiative Taken",
    body: `<p>Dear {{employee_name}},</p>
<p>We appreciate the ownership and initiative you have demonstrated in your work.</p>
<p>Keep leading by example.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "22 — Spot Award",
    category: "Appreciation / Recognition",
    subject: "Congratulations: Spot Award Recognition",
    body: `<p>Dear {{employee_name}},</p>
<p>Congratulations! You have been selected for a Spot Award in recognition of your efforts.</p>
<p>Well deserved!</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "23 — Work Anniversary / Birthday",
    category: "Appreciation / Recognition",
    subject: "Celebrating You: Work Anniversary / Birthday Wishes",
    body: `<p>Dear {{employee_name}},</p>
<p>Wishing you a wonderful {{occasion}}!</p>
<p>Thank you for being a valued part of our organization.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "24 — Promotion",
    category: "Appreciation / Recognition",
    subject: "Congratulations on Your Promotion",
    body: `<p>Dear {{employee_name}},</p>
<p>Congratulations on your well-deserved promotion to {{designation}}.</p>
<p>We wish you continued success.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "25 — Training Completion",
    category: "Appreciation / Recognition",
    subject: "Congratulations: Training / Certification Completed",
    body: `<p>Dear {{employee_name}},</p>
<p>Congratulations on successfully completing your training/certification.</p>
<p>We encourage you to apply your new skills in your role.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "26 — Exceeds Expectations",
    category: "Appreciation / Recognition",
    subject: "Appreciation: Exceeds Expectations Performance",
    body: `<p>Dear {{employee_name}},</p>
<p>Your performance has exceeded expectations, and we truly appreciate your efforts.</p>
<p>Keep up the outstanding work!</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "27 — Meeting Scheduled",
    category: "Admin / Action Notices",
    subject: "Meeting Scheduled: HR Discussion on {{date}}",
    body: `<p>Dear {{employee_name}},</p>
<p>A meeting has been scheduled on {{date}} regarding {{meeting_agenda}}.</p>
<p>Please be available.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "28 — Document Pending",
    category: "Admin / Action Notices",
    subject: "Reminder: Pending Document Submission",
    body: `<p>Dear {{employee_name}},</p>
<p>This is a reminder to submit pending documents by {{due_date}}.</p>
<p>Please treat this as a priority.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "29 — Policy Acknowledgment",
    category: "Admin / Action Notices",
    subject: "Action Required: Policy Acknowledgment Pending",
    body: `<p>Dear {{employee_name}},</p>
<p>You are required to acknowledge the company policy shared earlier.</p>
<p>Kindly complete this by {{due_date}}.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "30 — Asset Return",
    category: "Admin / Action Notices",
    subject: "Reminder: Company Asset Return Required",
    body: `<p>Dear {{employee_name}},</p>
<p>Please return all company assets assigned to you by {{due_date}}.</p>
<p>Contact HR for any clarification.</p>
<p>Regards,<br/>HR Team</p>`,
  },
  {
    name: "31 — Offboarding",
    category: "Admin / Action Notices",
    subject: "Reminder: Offboarding Clearance Process",
    body: `<p>Dear {{employee_name}},</p>
<p>Please complete all offboarding formalities and clearance steps before your last working day.</p>
<p>Reach out to HR for assistance.</p>
<p>Regards,<br/>HR Team</p>`,
  },
];
