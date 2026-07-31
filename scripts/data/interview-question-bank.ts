export type InterviewQuestionSeed = {
  question: string;
  category:
    | "GENERAL"
    | "TECHNICAL"
    | "BEHAVIOURAL"
    | "SITUATIONAL"
    | "ROLE_SPECIFIC"
    | "CULTURE_FIT";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  role?: string;
  tags: string[];
};

export const INTERVIEW_QUESTION_BANK_SEED: InterviewQuestionSeed[] = [
  // GENERAL
  {
    question: "Tell us about yourself and what drew you to this opportunity.",
    category: "GENERAL",
    difficulty: "EASY",
    tags: ["introduction", "motivation"],
  },
  {
    question: "Why are you exploring a change from your current role at this point in your career?",
    category: "GENERAL",
    difficulty: "EASY",
    tags: ["motivation", "career"],
  },
  {
    question: "What do you know about Miyo Global and how our business operates?",
    category: "GENERAL",
    difficulty: "MEDIUM",
    tags: ["company-research", "preparation"],
  },
  {
    question: "Where do you see yourself professionally in three to five years?",
    category: "GENERAL",
    difficulty: "MEDIUM",
    tags: ["career-goals", "growth"],
  },
  {
    question: "What are your compensation expectations for this role?",
    category: "GENERAL",
    difficulty: "MEDIUM",
    tags: ["compensation", "expectations"],
  },
  {
    question: "If selected, when would you be available to join?",
    category: "GENERAL",
    difficulty: "EASY",
    tags: ["availability", "logistics"],
  },
  {
    question: "What professional achievement are you most proud of, and why?",
    category: "GENERAL",
    difficulty: "MEDIUM",
    tags: ["achievements", "impact"],
  },
  {
    question: "How do you prioritize work when multiple deadlines compete for your attention?",
    category: "GENERAL",
    difficulty: "MEDIUM",
    tags: ["prioritization", "time-management"],
  },
  {
    question: "What does a highly productive workday look like for you?",
    category: "GENERAL",
    difficulty: "EASY",
    tags: ["work-style", "productivity"],
  },
  {
    question: "What questions do you have for us about the role, team, or company?",
    category: "GENERAL",
    difficulty: "EASY",
    tags: ["candidate-questions", "closing"],
  },

  // TECHNICAL
  {
    question: "Walk us through a complex problem you solved using data, analysis, or structured reasoning.",
    category: "TECHNICAL",
    difficulty: "HARD",
    tags: ["analytics", "problem-solving"],
  },
  {
    question: "How do you validate assumptions before making a business or technical recommendation?",
    category: "TECHNICAL",
    difficulty: "MEDIUM",
    tags: ["critical-thinking", "validation"],
  },
  {
    question: "Explain a financial or analytical concept you use often (e.g. DCF, IRR, or risk-adjusted return) in simple terms.",
    category: "TECHNICAL",
    difficulty: "MEDIUM",
    tags: ["finance", "communication"],
  },
  {
    question: "Describe your hands-on experience with Excel, SQL, Python, or BI tools for reporting and analysis.",
    category: "TECHNICAL",
    difficulty: "MEDIUM",
    tags: ["tools", "reporting"],
  },
  {
    question: "How do you ensure accuracy and auditability when building models or working with large datasets?",
    category: "TECHNICAL",
    difficulty: "HARD",
    tags: ["accuracy", "controls"],
  },
  {
    question: "Tell us about a process you improved using technology or automation.",
    category: "TECHNICAL",
    difficulty: "MEDIUM",
    tags: ["automation", "efficiency"],
  },
  {
    question: "What KPIs would you track to evaluate pipeline, portfolio, or operational performance?",
    category: "TECHNICAL",
    difficulty: "MEDIUM",
    tags: ["metrics", "performance"],
  },
  {
    question: "How do you stay current with market, regulatory, or technical developments in your field?",
    category: "TECHNICAL",
    difficulty: "EASY",
    tags: ["learning", "industry"],
  },
  {
    question: "Describe a technical trade-off you faced and how you decided between options.",
    category: "TECHNICAL",
    difficulty: "HARD",
    tags: ["trade-offs", "decision-making"],
  },
  {
    question: "How would you design a repeatable workflow to replace a manual reporting task?",
    category: "TECHNICAL",
    difficulty: "HARD",
    tags: ["workflow", "design"],
  },

  // BEHAVIOURAL
  {
    question: "Tell me about a time you resolved a conflict with a colleague or stakeholder.",
    category: "BEHAVIOURAL",
    difficulty: "MEDIUM",
    tags: ["conflict", "collaboration"],
  },
  {
    question: "Describe a situation where you failed or missed a goal. What did you learn and change afterward?",
    category: "BEHAVIOURAL",
    difficulty: "HARD",
    tags: ["failure", "growth"],
  },
  {
    question: "Give an example of when you went above and beyond for a client, customer, or teammate.",
    category: "BEHAVIOURAL",
    difficulty: "MEDIUM",
    tags: ["ownership", "service"],
  },
  {
    question: "Tell me about a time you had to influence someone without direct authority.",
    category: "BEHAVIOURAL",
    difficulty: "HARD",
    tags: ["influence", "stakeholders"],
  },
  {
    question: "How have you responded to critical feedback from a manager or peer?",
    category: "BEHAVIOURAL",
    difficulty: "MEDIUM",
    tags: ["feedback", "self-awareness"],
  },
  {
    question: "Share an example of delivering a project or initiative under a tight deadline.",
    category: "BEHAVIOURAL",
    difficulty: "MEDIUM",
    tags: ["deadlines", "delivery"],
  },
  {
    question: "Tell me about a time priorities shifted suddenly. How did you adapt?",
    category: "BEHAVIOURAL",
    difficulty: "MEDIUM",
    tags: ["adaptability", "change"],
  },
  {
    question: "Describe a situation where you took ownership of an issue that was not explicitly your responsibility.",
    category: "BEHAVIOURAL",
    difficulty: "MEDIUM",
    tags: ["ownership", "initiative"],
  },
  {
    question: "Give an example of collaborating across teams with different goals or incentives.",
    category: "BEHAVIOURAL",
    difficulty: "HARD",
    tags: ["cross-functional", "teamwork"],
  },
  {
    question: "Tell me about a time you had to push back or say no while maintaining a professional relationship.",
    category: "BEHAVIOURAL",
    difficulty: "HARD",
    tags: ["boundaries", "communication"],
  },

  // SITUATIONAL
  {
    question: "A client is upset about a missed deadline. What do you do in the first 30 minutes?",
    category: "SITUATIONAL",
    difficulty: "MEDIUM",
    tags: ["client-management", "crisis"],
  },
  {
    question: "Your manager assigns two urgent tasks due the same day. How do you handle it?",
    category: "SITUATIONAL",
    difficulty: "MEDIUM",
    tags: ["prioritization", "pressure"],
  },
  {
    question: "You discover a material error in a report already shared with leadership. What steps do you take?",
    category: "SITUATIONAL",
    difficulty: "HARD",
    tags: ["integrity", "escalation"],
  },
  {
    question: "A teammate repeatedly misses commitments on a shared project. How do you respond?",
    category: "SITUATIONAL",
    difficulty: "MEDIUM",
    tags: ["accountability", "team-dynamics"],
  },
  {
    question: "You must present findings to senior leadership with very little notice. How do you prepare?",
    category: "SITUATIONAL",
    difficulty: "HARD",
    tags: ["presentation", "executive"],
  },
  {
    question: "Someone shares confidential information in the wrong channel. What do you do immediately?",
    category: "SITUATIONAL",
    difficulty: "MEDIUM",
    tags: ["confidentiality", "compliance"],
  },
  {
    question: "You disagree with your manager's decision on a hiring or business recommendation. How do you proceed?",
    category: "SITUATIONAL",
    difficulty: "HARD",
    tags: ["disagreement", "professionalism"],
  },
  {
    question: "A key team member resigns mid-project. How do you stabilize delivery?",
    category: "SITUATIONAL",
    difficulty: "HARD",
    tags: ["resilience", "project-management"],
  },
  {
    question: "You notice a compliance or policy gap in a current process. What actions do you take?",
    category: "SITUATIONAL",
    difficulty: "MEDIUM",
    tags: ["compliance", "process"],
  },
  {
    question: "An external party pressures you to share data you are not authorized to release. How do you respond?",
    category: "SITUATIONAL",
    difficulty: "HARD",
    tags: ["security", "ethics"],
  },

  // ROLE_SPECIFIC
  {
    question: "How do you qualify a lead before investing significant sales time?",
    category: "ROLE_SPECIFIC",
    difficulty: "MEDIUM",
    role: "Sales",
    tags: ["qualification", "pipeline"],
  },
  {
    question: "How do you balance speed of hiring with quality of hire?",
    category: "ROLE_SPECIFIC",
    difficulty: "MEDIUM",
    role: "HR / Recruitment",
    tags: ["hiring", "quality"],
  },
  {
    question: "How do you approach code review and quality standards when delivery pressure is high?",
    category: "ROLE_SPECIFIC",
    difficulty: "HARD",
    role: "Software Engineering",
    tags: ["code-quality", "delivery"],
  },
  {
    question: "Walk us through your month-end close process and the controls you enforce.",
    category: "ROLE_SPECIFIC",
    difficulty: "HARD",
    role: "Finance",
    tags: ["close", "controls"],
  },
  {
    question: "How do you design SOPs that teams will actually follow in day-to-day work?",
    category: "ROLE_SPECIFIC",
    difficulty: "MEDIUM",
    role: "Operations",
    tags: ["sops", "execution"],
  },
  {
    question: "How do you identify churn or dissatisfaction risk early in a client relationship?",
    category: "ROLE_SPECIFIC",
    difficulty: "MEDIUM",
    role: "Customer Success",
    tags: ["retention", "risk"],
  },
  {
    question: "How do you manage scope creep while keeping stakeholders aligned?",
    category: "ROLE_SPECIFIC",
    difficulty: "MEDIUM",
    role: "Project Management",
    tags: ["scope", "stakeholders"],
  },
  {
    question: "How do you translate company objectives into clear goals for your team?",
    category: "ROLE_SPECIFIC",
    difficulty: "HARD",
    role: "Leadership / Management",
    tags: ["strategy", "goals"],
  },
  {
    question: "How do you present ambiguous data when leadership needs a clear recommendation?",
    category: "ROLE_SPECIFIC",
    difficulty: "HARD",
    role: "Business Analyst",
    tags: ["analysis", "communication"],
  },
  {
    question: "How do you handle high-volume requests while maintaining service quality?",
    category: "ROLE_SPECIFIC",
    difficulty: "MEDIUM",
    role: "Admin / Support",
    tags: ["throughput", "service"],
  },

  // CULTURE_FIT
  {
    question: "What kind of team environment helps you do your best work?",
    category: "CULTURE_FIT",
    difficulty: "EASY",
    tags: ["work-style", "team"],
  },
  {
    question: "How do you handle ambiguity when goals or processes are still evolving?",
    category: "CULTURE_FIT",
    difficulty: "MEDIUM",
    tags: ["ambiguity", "startup-mindset"],
  },
  {
    question: "Which workplace values matter most to you, and how do you live them?",
    category: "CULTURE_FIT",
    difficulty: "MEDIUM",
    tags: ["values", "authenticity"],
  },
  {
    question: "How do you contribute to building trust within a team?",
    category: "CULTURE_FIT",
    difficulty: "MEDIUM",
    tags: ["trust", "collaboration"],
  },
  {
    question: "Describe your approach to continuous learning and skill development.",
    category: "CULTURE_FIT",
    difficulty: "EASY",
    tags: ["learning", "growth"],
  },
  {
    question: "How do you balance individual excellence with collective team success?",
    category: "CULTURE_FIT",
    difficulty: "MEDIUM",
    tags: ["teamwork", "performance"],
  },
  {
    question: "What does integrity mean to you in everyday work decisions?",
    category: "CULTURE_FIT",
    difficulty: "MEDIUM",
    tags: ["integrity", "ethics"],
  },
  {
    question: "How do you support inclusion and respectful collaboration on diverse teams?",
    category: "CULTURE_FIT",
    difficulty: "MEDIUM",
    tags: ["inclusion", "respect"],
  },
  {
    question: "How do you stay professional and constructive during stressful periods?",
    category: "CULTURE_FIT",
    difficulty: "MEDIUM",
    tags: ["resilience", "composure"],
  },
  {
    question: "Why do you believe you would thrive at Miyo Global specifically?",
    category: "CULTURE_FIT",
    difficulty: "EASY",
    tags: ["fit", "motivation"],
  },
];
