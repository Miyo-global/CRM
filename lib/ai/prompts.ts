

export type {
  LeadScoreResult,
  GeneratedEmail,
  EmailVariations,
  DealPredictionResult,
  NextActionResult,
  ChurnRiskResult,
  ConversationSummaryResult,
  LeadEnrichmentResult,
  CandidateScoreResult,
  ReviewDraftResult,
  HelpdeskReplyResult,
  AttritionRiskResult,
} from "./schemas";

import type { EmailTone } from "./schemas";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";
export type { EmailTone };

export interface LeadScoringInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  designation?: string | null;
  city?: string | null;
  source?: string | null;
  priority?: string | null;
  potentialValue?: string | null;
  investmentInterest?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  daysSinceCreated: number;
  activityCount: number;
  hasAssignee: boolean;
}

export function leadScoringPrompt(lead: LeadScoringInput) {
  return {
    system: `You are an expert sales lead scoring analyst for an Indian investment/financial services company.
Score the lead from 0 to 100 based on:
- Contact completeness (name, email, phone, company): 0-15 points
- Financial signals (potentialValue, investmentInterest): 0-25 points
- Engagement signals (activityCount, daysSinceCreated, hasAssignee): 0-20 points
- Source quality (referral > website > campaign > cold_call > walk_in > other): 0-15 points
- Priority indicator (HOT > WARM > COLD): 0-10 points
- Company/designation presence (indicates serious buyer): 0-15 points

Return JSON with exactly these fields:
{
  "score": <number 0-100>,
  "reasoning": "<1-2 sentence explanation>",
  "strengths": ["<strength1>", "<strength2>"],
  "weaknesses": ["<weakness1>"],
  "suggestedActions": ["<action1>", "<action2>"]
}`,
    user: `Score this lead:
Name: ${lead.name}
Email: ${lead.email || "Not provided"}
Phone: ${lead.phone || "Not provided"}
Company: ${lead.company || "Not provided"}
Designation: ${lead.designation || "Not provided"}
City: ${lead.city || "Not provided"}
Source: ${lead.source || "unknown"}
Priority: ${lead.priority || "WARM"}
Potential Value: ${lead.potentialValue ? `${CURRENCY_SYMBOL}${lead.potentialValue}` : "Not specified"}
Investment Interest: ${lead.investmentInterest ? `${CURRENCY_SYMBOL}${lead.investmentInterest}` : "Not specified"}
Notes: ${lead.notes || "None"}
Tags: ${lead.tags?.length ? lead.tags.join(", ") : "None"}
Days since created: ${lead.daysSinceCreated}
Activities logged: ${lead.activityCount}
Has assignee: ${lead.hasAssignee ? "Yes" : "No"}`,
  };
}

export interface EmailGeneratorInput {
  leadName: string;
  company?: string | null;
  designation?: string | null;
  dealStage?: string | null;
  lastActivityType?: string | null;
  lastActivityDate?: string | null;
  lastActivityNotes?: string | null;
  potentialValue?: string | null;
  senderName: string;
  senderRole?: string | null;
  tone: EmailTone;
  context?: string;
}

export interface DealPredictionInput {
  dealName: string;
  value: number;
  stage: string;
  probability: number;
  daysInPipeline: number;
  daysInCurrentStage: number;
  activityCount: number;
  lastActivityDaysAgo: number | null;
  contactPerson?: string | null;
  assignedTo?: string | null;
  hasExpectedCloseDate: boolean;
  daysUntilExpectedClose: number | null;
  notes?: string | null;
}

export function dealPredictionPrompt(deal: DealPredictionInput) {
  return {
    system: `You are an expert sales deal analyst for an Indian investment/financial services company.
Predict the probability of winning this deal (0-100%) and provide analysis.

Consider these factors:
- Stage progression speed (fast = good)
- Activity frequency (regular engagement = good)
- Deal value vs stage (high value deals need more nurturing)
- Days without activity (stale = risk)
- Whether expected close date is set and how close it is
- Having a contact person and assigned rep (both = good)

Return JSON:
{
  "winProbability": <number 0-100>,
  "confidence": "<low|medium|high>",
  "reasoning": "<1-2 sentence explanation>",
  "riskFactors": ["<risk1>", "<risk2>"],
  "positiveSignals": ["<signal1>"],
  "recommendedActions": ["<action1>", "<action2>"]
}`,
    user: `Predict win probability for this deal:
Deal: ${deal.dealName}
Value: ${CURRENCY_SYMBOL}${deal.value.toLocaleString(DEFAULT_LOCALE)}
Stage: ${deal.stage}
Current Probability: ${deal.probability}%
Days in Pipeline: ${deal.daysInPipeline}
Days in Current Stage: ${deal.daysInCurrentStage}
Total Activities: ${deal.activityCount}
Last Activity: ${deal.lastActivityDaysAgo !== null ? `${deal.lastActivityDaysAgo} days ago` : "None logged"}
Contact Person: ${deal.contactPerson || "Not set"}
Assigned To: ${deal.assignedTo || "Unassigned"}
Expected Close Date: ${deal.hasExpectedCloseDate ? (deal.daysUntilExpectedClose !== null ? `in ${deal.daysUntilExpectedClose} days` : "Set") : "Not set"}
Notes: ${deal.notes || "None"}`,
  };
}

export interface NextActionInput {
  entityType: "lead" | "deal";
  name: string;
  status: string;
  priority?: string | null;
  lastActivityType?: string | null;
  lastActivityDate?: string | null;
  daysSinceLastActivity: number | null;
  value?: number | null;
  assignedTo?: string | null;
  followUpDate?: string | null;
  isOverdueFollowUp: boolean;
  notes?: string | null;
}

export function nextActionPrompt(input: NextActionInput) {
  return {
    system: `You are a sales productivity advisor for an Indian investment/financial services company.
Suggest the ONE most impactful next action for this ${input.entityType}.

Consider:
- Stage/status: what action moves it forward?
- Recency: if stale (>7 days no activity), suggest re-engagement
- Follow-up: if overdue, make that the priority
- Value: higher value = more personal touch (call/meeting vs email)

Return JSON:
{
  "action": "<concise action description, max 10 words>",
  "urgency": "<low|medium|high|critical>",
  "reasoning": "<1 sentence why this action>",
  "template": "<optional: short message template if action is email/call>"
}`,
    user: `What should the sales rep do next for this ${input.entityType}?
Name: ${input.name}
Status: ${input.status}
${input.priority ? `Priority: ${input.priority}` : ""}
${input.value ? `Value: ${CURRENCY_SYMBOL}${input.value.toLocaleString(DEFAULT_LOCALE)}` : ""}
Assigned To: ${input.assignedTo || "Unassigned"}
Last Activity: ${input.lastActivityType ? `${input.lastActivityType} (${input.daysSinceLastActivity ?? "?"} days ago)` : "No activity logged"}
Follow-up Date: ${input.followUpDate || "Not set"}${input.isOverdueFollowUp ? " (OVERDUE)" : ""}
Notes: ${input.notes || "None"}`,
  };
}

export interface ChurnRiskInput {
  clientName: string;
  company?: string | null;
  healthScore: number;
  investmentValue?: number | null;
  daysSinceLastActivity: number | null;
  openTickets: number;
  totalTicketsLast90Days: number;
  accountManagerName?: string | null;
  status: string;
  daysSinceConversion: number;
}

export function churnRiskPrompt(input: ChurnRiskInput) {
  return {
    system: `You are a customer success analyst for an Indian investment/financial services company.
Assess the churn risk for this client (0-100, where 100 = certain to churn).

Scoring factors:
- Activity recency: no activity >30 days = high risk
- Support ticket volume: increasing tickets = frustration signal
- Investment value: higher value clients need proactive retention
- Account age: newer clients (<90 days) are more volatile
- Health score: existing score provides baseline

Return JSON:
{
  "churnRiskScore": <number 0-100>,
  "riskLevel": "<low|medium|high|critical>",
  "reasoning": "<1-2 sentences>",
  "riskFactors": ["<factor1>", "<factor2>"],
  "retentionActions": ["<action1>", "<action2>"]
}`,
    user: `Assess churn risk for:
Client: ${input.clientName}${input.company ? ` (${input.company})` : ""}
Current Health Score: ${input.healthScore}/100
Investment Value: ${input.investmentValue ? `${CURRENCY_SYMBOL}${input.investmentValue.toLocaleString(DEFAULT_LOCALE)}` : "Unknown"}
Last Activity: ${input.daysSinceLastActivity !== null ? `${input.daysSinceLastActivity} days ago` : "No activity recorded"}
Open Tickets: ${input.openTickets}
Tickets in Last 90 Days: ${input.totalTicketsLast90Days}
Account Manager: ${input.accountManagerName || "Unassigned"}
Status: ${input.status}
Client Since: ${input.daysSinceConversion} days ago`,
  };
}

export interface ConversationSummaryInput {
  activityType: string;
  subject?: string;
  notes: string;
  leadName?: string;
  dealName?: string;
}

export function conversationSummaryPrompt(input: ConversationSummaryInput) {
  return {
    system: `You are a sales assistant. Summarize this ${input.activityType} log into structured insights.
Return JSON:
{
  "summary": "<1-2 sentence summary>",
  "keyPoints": ["<point1>", "<point2>"],
  "actionItems": ["<action1>", "<action2>"],
  "sentiment": "<positive|neutral|negative>"
}`,
    user: `Summarize this ${input.activityType}:
${input.subject ? `Subject: ${input.subject}` : ""}
${input.leadName ? `Lead: ${input.leadName}` : ""}${input.dealName ? `Deal: ${input.dealName}` : ""}
Notes: ${input.notes}`,
  };
}

export interface LeadEnrichmentInput {
  name: string;
  company?: string | null;
  email?: string | null;
  designation?: string | null;
  city?: string | null;
}

export function leadEnrichmentPrompt(input: LeadEnrichmentInput) {
  return {
    system: `You are a sales research assistant for an Indian investment/financial services company.
Given a lead's basic info, generate a research brief to help the sales rep prepare.
Base your analysis on the company name, designation, and city. Make educated estimates.

Return JSON:
{
  "companyInsight": "<1-2 sentences about the company or type of business>",
  "estimatedCompanySize": "<e.g. 50-200 employees, Mid-market>",
  "industry": "<industry sector>",
  "talkingPoints": ["<point1>", "<point2>", "<point3>"],
  "potentialNeeds": ["<need1>", "<need2>"],
  "recommendedApproach": "<1 sentence recommended sales approach>"
}`,
    user: `Research brief for:
Name: ${input.name}
Company: ${input.company || "Unknown"}
Email: ${input.email || "Not provided"}
Designation: ${input.designation || "Not provided"}
City: ${input.city || "Not provided"}`,
  };
}

const TONE_INSTRUCTIONS: Record<EmailTone, string> = {
  formal: "Use formal, professional business language. Address with 'Dear'. Sign off with 'Best regards'.",
  friendly: "Use warm, conversational tone. First-name basis. Sign off with 'Cheers' or 'Looking forward'.",
  urgent: "Convey time-sensitivity. Mention deadlines or limited availability. Be direct and action-oriented.",
};

export interface CandidateScoringInput {
  firstName: string;
  lastName: string;
  email: string;
  currentCompany?: string | null;
  currentRole?: string | null;
  experienceYears?: string | number | null;
  skills?: string[] | null;
  source?: string | null;
  notes?: string | null;
  jobTitle?: string | null;
  jobDescription?: string | null;
  jobRequiredSkills?: string[] | null;
}

export function candidateScoringPrompt(input: CandidateScoringInput) {
  return {
    system: `You are an expert HR recruiter scoring candidates for an Indian company.
Score the candidate from 0-100 based on:
- Experience match (0-25): years of experience vs role requirements
- Skill match (0-30): how well their skills align with required skills
- Company background (0-15): quality of current/previous companies
- Role progression (0-15): is their current role a good stepping stone for this position?
- Profile completeness (0-15): contact info, resume, portfolio, LinkedIn

Return JSON:
{
  "score": <number 0-100>,
  "fitLevel": "<excellent|good|average|poor>",
  "reasoning": "<1-2 sentences>",
  "strengths": ["<strength1>", "<strength2>"],
  "concerns": ["<concern1>"],
  "suggestedQuestions": ["<question1>", "<question2>", "<question3>"]
}`,
    user: `Score this candidate:
Name: ${input.firstName} ${input.lastName}
Email: ${input.email}
Current Company: ${input.currentCompany || "Not specified"}
Current Role: ${input.currentRole || "Not specified"}
Experience: ${input.experienceYears ? `${input.experienceYears} years` : "Unknown"}
Skills: ${input.skills?.length ? input.skills.join(", ") : "Not listed"}
Source: ${input.source || "Direct"}
Notes: ${input.notes || "None"}
${input.jobTitle ? `\nApplying for: ${input.jobTitle}` : ""}
${input.jobDescription ? `Job Description: ${input.jobDescription}` : ""}
${input.jobRequiredSkills?.length ? `Required Skills: ${input.jobRequiredSkills.join(", ")}` : ""}`,
  };
}

export interface ReviewDraftInput {
  employeeName: string;
  role?: string | null;
  department?: string | null;
  periodStart: string;
  periodEnd: string;
  goals?: { goal: string; achieved?: boolean; progress?: number }[] | null;
  recentActivities?: string[] | null;
  attendanceRate?: number | null;
  managerNotes?: string | null;
}

export function reviewDraftPrompt(input: ReviewDraftInput) {
  return {
    system: `You are an HR expert drafting balanced performance reviews for an Indian company.
Generate a constructive, specific, and actionable review.

Rating scale: 1-5 (1=needs improvement, 5=exceptional)

Categories to rate:
- Job Knowledge & Skills
- Quality of Work
- Productivity & Output
- Communication & Teamwork
- Initiative & Ownership

Return JSON:
{
  "overallRating": <number 1-5>,
  "strengths": "<2-3 sentences highlighting top strengths>",
  "improvements": "<2-3 sentences on areas for growth, framed constructively>",
  "comments": "<1-2 sentences overall summary>",
  "ratings": [
    { "category": "Job Knowledge & Skills", "score": <1-5>, "comment": "<brief>" },
    { "category": "Quality of Work", "score": <1-5>, "comment": "<brief>" },
    { "category": "Productivity & Output", "score": <1-5>, "comment": "<brief>" },
    { "category": "Communication & Teamwork", "score": <1-5>, "comment": "<brief>" },
    { "category": "Initiative & Ownership", "score": <1-5>, "comment": "<brief>" }
  ]
}`,
    user: `Draft a performance review for:
Employee: ${input.employeeName}
Role: ${input.role || "Not specified"}
Department: ${input.department || "Not specified"}
Period: ${input.periodStart} to ${input.periodEnd}

Goals during this period:
${input.goals?.length
        ? input.goals.map((g) => `- ${g.goal} (${g.achieved ? "Achieved" : `${g.progress ?? 0}% complete`})`).join("\n")
        : "No goals tracked"}

Recent activities:
${input.recentActivities?.length ? input.recentActivities.map((a) => `- ${a}`).join("\n") : "None logged"}

${input.attendanceRate !== null && input.attendanceRate !== undefined ? `Attendance Rate: ${input.attendanceRate}%` : ""}
${input.managerNotes ? `\nManager Notes: ${input.managerNotes}` : ""}`,
  };
}

export interface HelpdeskReplyInput {
  ticketTitle: string;
  ticketDescription?: string | null;
  category?: string | null;
  priority?: string | null;
  employeeName?: string | null;
}

export function helpdeskReplyPrompt(input: HelpdeskReplyInput) {
  return {
    system: `You are an empathetic HR support agent for an Indian company.
Generate a professional, helpful reply to an employee helpdesk ticket.

Rules:
- Be warm and empathetic but professional
- Acknowledge the employee's concern
- Provide concrete next steps
- Use simple, clear language
- Maximum 100 words for the reply

Return JSON:
{
  "suggestedReply": "<professional reply text>",
  "category": "<inferred category: Leave / Payroll / IT / Benefits / Policy / Other>",
  "estimatedResolutionTime": "<e.g. 24 hours, 2-3 business days>",
  "followUpActions": ["<action1>", "<action2>"]
}`,
    user: `Generate a reply for this helpdesk ticket:
Title: ${input.ticketTitle}
Description: ${input.ticketDescription || "No description"}
Category: ${input.category || "Uncategorized"}
Priority: ${input.priority || "MEDIUM"}
Employee: ${input.employeeName || "Anonymous"}`,
  };
}

export interface AttritionRiskInput {
  employeeName: string;
  role?: string | null;
  department?: string | null;
  tenureMonths: number;
  attendanceRate?: number | null;
  recentLeaveDays?: number | null;
  openTickets?: number | null;
  lastReviewRating?: number | null;
  lastPromotionMonths?: number | null;
  hasGoals?: boolean;
}

export function attritionRiskPrompt(input: AttritionRiskInput) {
  return {
    system: `You are an HR analytics expert assessing employee attrition risk for an Indian company.
Score the attrition risk 0-100 (100 = very likely to leave).

Risk factors to consider:
- Low attendance rate (<85%) = increasing disengagement
- High recent leave usage = potentially job hunting
- Many open helpdesk tickets = unresolved frustrations
- Low last review rating (<3/5) = performance gap or dissatisfaction
- Long time since last promotion (>24 months) = stagnation risk
- No goals set = lack of direction
- New employees (<3 months) are higher risk
- Senior employees (>3 years) without recent recognition

Return JSON:
{
  "attritionRiskScore": <number 0-100>,
  "riskLevel": "<low|medium|high|critical>",
  "reasoning": "<1-2 sentences>",
  "riskFactors": ["<factor1>", "<factor2>"],
  "retentionActions": ["<action1>", "<action2>", "<action3>"]
}`,
    user: `Assess attrition risk for:
Employee: ${input.employeeName}
Role: ${input.role || "Not specified"}
Department: ${input.department || "Not specified"}
Tenure: ${input.tenureMonths} months
Attendance Rate: ${input.attendanceRate !== null && input.attendanceRate !== undefined ? `${input.attendanceRate}%` : "Unknown"}
Recent Leave Days (last 90d): ${input.recentLeaveDays ?? "Unknown"}
Open Helpdesk Tickets: ${input.openTickets ?? 0}
Last Performance Review Rating: ${input.lastReviewRating ? `${input.lastReviewRating}/5` : "No recent review"}
Months Since Last Promotion: ${input.lastPromotionMonths ?? "Never promoted"}
Has Active Goals: ${input.hasGoals ? "Yes" : "No"}`,
  };
}

export function emailGeneratorPrompt(input: EmailGeneratorInput) {
  return {
    system: `You are a sales email copywriter for an Indian investment/financial services company.
Write a short, compelling follow-up email (max 150 words body).
${TONE_INSTRUCTIONS[input.tone]}

Rules:
- Do NOT use placeholder brackets like [Company] or [Name] — use actual values provided
- Keep subject line under 60 characters
- Include one clear call-to-action
- Reference the last interaction if provided
- Amounts are in Indian Rupees (₹)
- Do NOT include email headers (From, To, Date) — just subject and body

Return JSON:
{
  "subject": "<email subject>",
  "body": "<email body text>"
}`,
    user: `Write a ${input.tone} follow-up email:

To: ${input.leadName}${input.designation ? `, ${input.designation}` : ""}${input.company ? ` at ${input.company}` : ""}
From: ${input.senderName}${input.senderRole ? `, ${input.senderRole}` : ""}
${input.dealStage ? `Deal Stage: ${input.dealStage}` : ""}
${input.potentialValue ? `Deal Value: ${CURRENCY_SYMBOL}${input.potentialValue}` : ""}
${input.lastActivityType ? `Last Activity: ${input.lastActivityType} on ${input.lastActivityDate || "recently"}` : "No previous activity"}
${input.lastActivityNotes ? `Notes: ${input.lastActivityNotes}` : ""}
${input.context ? `Additional context: ${input.context}` : ""}`,
  };
}
