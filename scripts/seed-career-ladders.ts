import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

async function main() {
  const { db } = await import("../lib/db");
  const { careerLadders } = await import("../lib/db/schema");
  const { eq } = await import("drizzle-orm");

  const orgs = await db.query.organizations.findMany({ limit: 1 });
  if (!orgs.length) {
    console.error("No organization found. Run seed.ts first.");
    process.exit(1);
  }
  const orgId = orgs[0]!.id;

  const existing = await db
    .select({ id: careerLadders.id })
    .from(careerLadders)
    .where(eq(careerLadders.orgId, orgId));

  if (existing.length > 0) {
    console.log(`Skipping — ${existing.length} career ladder(s) already exist for this org.`);
    process.exit(0);
  }

  const ladders = [
    {
      orgId,
      title: "Engineering - Individual Contributor",
      department: "Engineering",
      description:
        "Defines the growth path for individual contributors in the engineering team, from junior engineers solving well-scoped problems to principal engineers shaping company-wide technical direction.",
      status: "active" as const,
      trackType: "individual_contributor" as const,
      visibility: "all" as const,
      levels: [
        {
          level: 1,
          title: "Junior Engineer",
          description:
            "Builds foundational software engineering skills under close mentorship. Focuses on shipping well-defined tasks with high code quality.",
          minExperience: 0,
          skills: ["JavaScript", "TypeScript", "React", "Git", "REST APIs", "HTML/CSS", "SQL basics"],
          scope: "Works on clearly defined, scoped tasks within a single feature or service. Pairs frequently with senior engineers.",
          responsibilities: [
            "Write clean, readable, and tested code for assigned tickets",
            "Participate actively in code reviews and apply feedback",
            "Follow team coding standards and PR guidelines",
            "Communicate blockers proactively to the team lead",
          ],
          behaviors: [
            "Asks clarifying questions before starting work",
            "Proactively seeks feedback rather than waiting for it",
            "Documents learnings and shares them with the team",
          ],
          salaryBandMin: 500000,
          salaryBandMax: 900000,
          typicalDuration: "12–18 months",
          promotionCriteria:
            "Consistently ships well-scoped tasks with minimal rework. Demonstrates ability to debug independently and shows initiative in improving code quality.",
          competencies: ["Code Quality", "Learning Agility", "Collaboration", "Communication"],
        },
        {
          level: 2,
          title: "Software Engineer",
          description:
            "Owns features end-to-end and begins to take broader technical decisions within a team. Mentors junior engineers.",
          minExperience: 2,
          skills: [
            "TypeScript", "Next.js", "Node.js", "PostgreSQL", "Drizzle ORM",
            "System Design basics", "Testing (Jest/Playwright)", "Docker",
          ],
          scope:
            "Owns full feature development from design to production. Contributes to architectural decisions within a service or module.",
          responsibilities: [
            "Design and implement complete features with minimal oversight",
            "Write unit and integration tests for all new code",
            "Review pull requests and provide constructive feedback",
            "Help junior engineers debug and unblock their work",
            "Contribute to technical documentation and runbooks",
          ],
          behaviors: [
            "Raises technical risks early in the planning phase",
            "Breaks down complex problems into incremental deliverables",
            "Gives and receives feedback gracefully",
          ],
          leadershipExpectations: "Informally mentors L1 engineers. Owns on-call rotation for assigned services.",
          salaryBandMin: 900000,
          salaryBandMax: 1600000,
          typicalDuration: "18–24 months",
          promotionCriteria:
            "Has shipped multiple production features end-to-end. Demonstrates ability to mentor others. Contributes to architectural discussions with reasoned trade-offs.",
          competencies: ["Technical Excellence", "Ownership", "Mentoring", "Problem Solving"],
        },
        {
          level: 3,
          title: "Senior Engineer",
          description:
            "A force multiplier for the team. Leads technical design for medium-to-large projects and sets quality standards across the squad.",
          minExperience: 4,
          skills: [
            "System Design", "Performance Optimization", "API Design", "Database indexing & query tuning",
            "CI/CD pipelines", "Security best practices", "Observability (Sentry/Grafana)",
          ],
          scope:
            "Drives technical direction for an entire product area. Influences decisions across multiple services and works closely with the product team to shape scope.",
          responsibilities: [
            "Lead technical design reviews and produce design documents",
            "Set and enforce coding standards for the squad",
            "Identify and resolve performance bottlenecks proactively",
            "Collaborate with product managers to refine requirements and flag risks",
            "Drive incident resolution and post-mortem analysis",
          ],
          behaviors: [
            "Makes complexity visible and proposes simplifications",
            "Champions reliability and observability in all designs",
            "Provides direct, kind, and actionable code review feedback",
          ],
          leadershipExpectations:
            "Mentors L1–L2 engineers through pairing and structured feedback. Participates in hiring interviews.",
          salaryBandMin: 1600000,
          salaryBandMax: 2800000,
          typicalDuration: "24–36 months",
          promotionCriteria:
            "Demonstrates consistent technical leadership across at least two major projects. Has positively impacted team velocity and code quality metrics. Recognized as a go-to resource for technical decisions.",
          competencies: ["Technical Leadership", "System Thinking", "Influence", "Quality Mindset"],
        },
        {
          level: 4,
          title: "Staff Engineer",
          description:
            "Operates across multiple teams and product areas. Drives foundational platform decisions and raises the engineering bar company-wide.",
          minExperience: 7,
          skills: [
            "Distributed systems", "Platform architecture", "API gateway & microservices",
            "Cost optimization", "SLAs / SLOs / SLIs", "Cross-team technical alignment",
          ],
          scope:
            "Scoped to the entire engineering org. Identifies cross-cutting technical concerns and leads resolution across squads.",
          responsibilities: [
            "Own the technical roadmap for platform and infrastructure initiatives",
            "Drive architectural decisions that affect multiple teams or the entire product",
            "Partner with engineering managers to define team-level technical strategy",
            "Build shared tooling and frameworks adopted across squads",
            "Represent engineering in cross-functional leadership discussions",
          ],
          behaviors: [
            "Communicates technical strategy to non-technical stakeholders clearly",
            "Builds consensus without sacrificing technical correctness",
            "Identifies systemic issues before they become incidents",
          ],
          leadershipExpectations:
            "Sponsors and coaches senior engineers. Leads engineering-wide guilds or working groups.",
          salaryBandMin: 2800000,
          salaryBandMax: 5000000,
          typicalDuration: "36+ months",
          promotionCriteria:
            "Has driven at least one company-wide technical initiative to completion. Recognized by peers across teams as a technical authority. Demonstrably improved system reliability or developer productivity at org level.",
          competencies: ["Strategic Thinking", "Cross-team Influence", "Platform Thinking", "Executive Communication"],
        },
        {
          level: 5,
          title: "Principal Engineer",
          description:
            "Defines the long-term technical vision of the company. Works at the intersection of engineering, product, and business strategy.",
          minExperience: 12,
          skills: [
            "Enterprise architecture", "Technology strategy", "Vendor evaluation",
            "Build vs buy analysis", "Engineering culture", "Technical due diligence",
          ],
          scope:
            "Company-wide. Shapes multi-year technical bets and is responsible for the overall health of the engineering organization.",
          responsibilities: [
            "Define and communicate the 3-year engineering vision aligned to business goals",
            "Own decisions on foundational technology choices (languages, frameworks, vendors)",
            "Lead technical due diligence for partnerships, acquisitions, or major integrations",
            "Establish engineering principles and cultivate an engineering culture of excellence",
            "Advise C-suite on technical risk and opportunity",
          ],
          behaviors: [
            "Thinks in systems across the entire company — not just engineering",
            "Creates clarity from ambiguity for the entire technical organization",
            "Builds the next generation of technical leaders",
          ],
          leadershipExpectations:
            "Directly sponsors 2–3 staff engineers. Owns the engineering culture roadmap.",
          salaryBandMin: 5000000,
          salaryBandMax: 9000000,
          typicalDuration: "Open-ended",
          promotionCriteria:
            "Exceptional track record of company-defining technical contributions. Widely recognized both internally and externally as a thought leader in relevant domains.",
          competencies: ["Vision Setting", "Executive Presence", "Systems Leadership", "Innovation"],
        },
      ],
    },

    {
      orgId,
      title: "Engineering - Management",
      department: "Engineering",
      description:
        "Defines the leadership path for engineering managers responsible for building high-performing teams, delivering product outcomes, and growing engineering talent.",
      status: "active" as const,
      trackType: "management" as const,
      visibility: "all" as const,
      levels: [
        {
          level: 1,
          title: "Engineering Manager",
          description:
            "Leads a squad of 4–6 engineers. Owns team delivery, hiring, and individual growth plans.",
          minExperience: 5,
          skills: [
            "1:1 coaching", "Sprint planning", "Technical hiring", "Performance management",
            "Stakeholder communication", "Agile / Scrum",
          ],
          scope: "Manages a single cross-functional squad. Partners with a senior engineer for technical decisions.",
          responsibilities: [
            "Conduct weekly 1:1s focused on growth and blockers",
            "Own the team's sprint planning and retrospectives",
            "Partner with HR for hiring, promotions, and PIPs",
            "Shield the team from unnecessary context-switching",
            "Report team health and delivery metrics to leadership",
          ],
          behaviors: [
            "Listens more than they talk in 1:1s",
            "Creates psychological safety for the team to raise problems",
            "Holds the team accountable with compassion",
          ],
          leadershipExpectations: "Directly manages 4–6 ICs. Partners with a senior engineer or tech lead.",
          salaryBandMin: 2000000,
          salaryBandMax: 3500000,
          typicalDuration: "24–36 months",
          promotionCriteria:
            "Has grown at least one engineer to the next level. Consistently ships team commitments. Has successfully hired 2+ engineers.",
          competencies: ["People Development", "Delivery Execution", "Team Health", "Hiring"],
        },
        {
          level: 2,
          title: "Senior Engineering Manager",
          description:
            "Manages multiple squads or a large team (8–15 engineers). Owns a product domain end-to-end.",
          minExperience: 8,
          skills: [
            "Multi-team coordination", "Roadmap planning", "Conflict resolution",
            "Data-driven decision making", "Cross-functional leadership",
          ],
          scope: "Owns a product domain spanning multiple squads. Coordinates with product, design, and business stakeholders.",
          responsibilities: [
            "Manage 2–3 engineering managers or a large direct team",
            "Define and communicate the team's quarterly roadmap",
            "Own cross-squad dependencies and escalation resolution",
            "Drive engineering culture initiatives (documentation, on-call health, etc.)",
            "Represent engineering in product and business reviews",
          ],
          behaviors: [
            "Builds trust across organizational boundaries",
            "Makes difficult trade-off decisions clearly and transparently",
            "Creates a culture of continuous improvement",
          ],
          leadershipExpectations: "Manages 1–2 EMs directly. Mentors EMs on people management skills.",
          salaryBandMin: 3500000,
          salaryBandMax: 5500000,
          typicalDuration: "24–36 months",
          promotionCriteria:
            "Demonstrated ability to manage managers. Has led a product domain to measurable business outcomes. Recognized as a culture carrier.",
          competencies: ["Organizational Leadership", "Strategic Delivery", "Culture Building", "Executive Communication"],
        },
        {
          level: 3,
          title: "Director of Engineering",
          description:
            "Owns the engineering strategy for a business unit. Accountable for headcount, budget, and technical direction across multiple teams.",
          minExperience: 12,
          skills: [
            "P&L awareness", "Org design", "Technical strategy", "Executive stakeholder management",
            "Budget planning", "Vendor negotiation",
          ],
          scope:
            "Business-unit scope (15–40+ engineers). Partners with VP Product and CEO to define business-unit strategy.",
          responsibilities: [
            "Own the engineering headcount plan and budget for the business unit",
            "Define the multi-year technical strategy aligned to business goals",
            "Develop a pipeline of senior engineering talent",
            "Drive engineering efficiency through process improvement and tooling",
            "Represent engineering to the board and investors as needed",
          ],
          behaviors: [
            "Operates comfortably with ambiguity at the business level",
            "Builds alignment across product, engineering, and business leadership",
            "Makes bold organizational bets while managing risk",
          ],
          leadershipExpectations: "Manages 2–4 Senior EMs. Owns the engineering hiring plan.",
          salaryBandMin: 5500000,
          salaryBandMax: 9000000,
          typicalDuration: "Open-ended",
          promotionCriteria:
            "Has built and scaled a high-performing engineering org. Has delivered business-defining products. Recognized externally as an engineering leader.",
          competencies: ["Business Acumen", "Org Building", "Technical Vision", "Board Communication"],
        },
      ],
    },

    {
      orgId,
      title: "Sales - Individual Contributor",
      department: "Sales",
      description:
        "Defines the growth path for sales professionals from handling inbound leads to owning enterprise accounts and mentoring a sales pod.",
      status: "active" as const,
      trackType: "individual_contributor" as const,
      visibility: "all" as const,
      levels: [
        {
          level: 1,
          title: "Sales Development Representative",
          description:
            "Focuses on outbound prospecting, qualifying inbound leads, and booking discovery calls for the AE team.",
          minExperience: 0,
          skills: [
            "Cold outreach (email/LinkedIn)", "CRM (Zoho/Salesforce basics)", "Objection handling",
            "Lead qualification (BANT/MEDDIC)", "Communication & active listening",
          ],
          scope: "Manages a target prospect list. Works closely with Account Executives to hand off qualified leads.",
          responsibilities: [
            "Generate 20+ qualified leads per month through outbound outreach",
            "Conduct discovery calls to qualify budget, authority, need, and timeline",
            "Maintain accurate CRM records for all interactions",
            "Follow up on marketing-generated inbound leads within 2 hours",
          ],
          behaviors: [
            "Persistent but respectful in follow-up cadences",
            "Treats rejection as data, not failure",
            "Documents learnings from lost leads to improve messaging",
          ],
          salaryBandMin: 400000,
          salaryBandMax: 700000,
          typicalDuration: "12–18 months",
          promotionCriteria:
            "Consistently hits 100%+ of qualified lead quota for 3 consecutive quarters. Has co-run at least 5 full sales cycles with an AE.",
          competencies: ["Prospecting", "Communication", "Resilience", "CRM Hygiene"],
        },
        {
          level: 2,
          title: "Account Executive",
          description:
            "Owns the full sales cycle from discovery to close for SMB and mid-market accounts.",
          minExperience: 2,
          skills: [
            "Full-cycle sales", "Negotiation", "Proposal writing", "Demo delivery",
            "Competitive positioning", "Pipeline management", "Contract review basics",
          ],
          scope: "Owns a named account list of 50–100 accounts. Responsible for monthly/quarterly revenue targets.",
          responsibilities: [
            "Run end-to-end sales cycles from discovery through contract signature",
            "Deliver tailored product demos aligned to prospect pain points",
            "Negotiate pricing and contract terms within approved bands",
            "Maintain a 3x pipeline coverage ratio at all times",
            "Forecast revenue accurately on a weekly basis",
          ],
          behaviors: [
            "Leads with customer pain before pitching product features",
            "Multi-threads into accounts to avoid single-contact dependency",
            "Brings the product team insights from the field regularly",
          ],
          salaryBandMin: 700000,
          salaryBandMax: 1400000,
          typicalDuration: "18–30 months",
          promotionCriteria:
            "Hits 100%+ of annual quota for 2 consecutive years. Has closed at least one deal above ₹10L ARR. Trains at least one SDR.",
          competencies: ["Deal Management", "Negotiation", "Customer Empathy", "Forecasting"],
        },
        {
          level: 3,
          title: "Senior Account Executive",
          description:
            "Owns a strategic account portfolio and large enterprise deals. Acts as a peer mentor for the sales team.",
          minExperience: 5,
          skills: [
            "Enterprise sales", "Multi-stakeholder management", "ROI storytelling",
            "Executive presence", "MEDDPICC", "Partnership & channel basics",
          ],
          scope: "Manages a portfolio of strategic accounts with ACV above ₹20L. Involved in pricing strategy discussions.",
          responsibilities: [
            "Own and grow a portfolio of 20–30 strategic accounts",
            "Sell to C-suite and VP-level stakeholders",
            "Lead commercial negotiations for deals above ₹20L ARR",
            "Contribute to sales playbook development and enablement sessions",
            "Represent the company at industry events and customer advisory boards",
          ],
          behaviors: [
            "Builds executive-level trust through business outcome conversations",
            "Acts as a customer advocate internally to product and engineering",
            "Shares deal wins and losses in team reviews transparently",
          ],
          leadershipExpectations: "Informally coaches 1–2 AEs and co-runs complex deals.",
          salaryBandMin: 1400000,
          salaryBandMax: 2500000,
          typicalDuration: "24+ months",
          promotionCriteria:
            "Consistently overperforms quota (>120%) for 2+ years. Has built and expanded at least 3 enterprise accounts. Recognized as a culture carrier in the sales org.",
          competencies: ["Enterprise Selling", "Executive Relationships", "Commercial Strategy", "Team Enablement"],
        },
      ],
    },

    {
      orgId,
      title: "Design - Individual Contributor",
      department: "Design",
      description:
        "Defines the growth path for product and UX designers from executing well-scoped screens to owning design systems and shaping product strategy.",
      status: "active" as const,
      trackType: "individual_contributor" as const,
      visibility: "all" as const,
      levels: [
        {
          level: 1,
          title: "Junior Product Designer",
          description:
            "Executes UI/UX tasks within a defined design system under close guidance. Focuses on craft, consistency, and shipping.",
          minExperience: 0,
          skills: [
            "Figma", "UI fundamentals (spacing, typography, color)", "Component usage",
            "User flows", "Prototyping basics", "Accessibility basics",
          ],
          scope: "Works on individual screens or components within a defined feature area.",
          responsibilities: [
            "Design UI screens aligned to the design system",
            "Create low and high-fidelity prototypes for developer handoff",
            "Incorporate feedback from design review sessions",
            "Conduct basic usability checks before handoff",
          ],
          behaviors: [
            "Asks why before jumping into pixels",
            "Shares work-in-progress early rather than perfecting before review",
            "Takes detailed notes in design critiques",
          ],
          salaryBandMin: 500000,
          salaryBandMax: 900000,
          typicalDuration: "12–18 months",
          promotionCriteria:
            "Has shipped 5+ production features with positive dev and PM feedback. Shows initiative in improving component consistency.",
          competencies: ["Visual Craft", "Design Systems Usage", "Feedback Receptiveness", "Attention to Detail"],
        },
        {
          level: 2,
          title: "Product Designer",
          description:
            "Owns design for complete product areas. Balances user needs, business goals, and technical constraints.",
          minExperience: 2,
          skills: [
            "UX research", "Information architecture", "Design system contribution",
            "User testing facilitation", "Cross-functional collaboration", "Interaction design",
          ],
          scope: "Owns design for a full product feature or module from discovery to launch.",
          responsibilities: [
            "Lead UX discovery: user interviews, journey mapping, problem framing",
            "Design end-to-end user flows, not just individual screens",
            "Contribute new components and patterns to the shared design system",
            "Partner with PMs to define success metrics for design decisions",
            "Facilitate usability testing with 5+ participants per cycle",
          ],
          behaviors: [
            "Defends design decisions with user research, not personal preference",
            "Proactively flags scope creep that could compromise user experience",
            "Creates design documentation that the team can reference months later",
          ],
          leadershipExpectations: "Reviews work of junior designers and gives structured feedback.",
          salaryBandMin: 900000,
          salaryBandMax: 1700000,
          typicalDuration: "24 months",
          promotionCriteria:
            "Owns a product area end-to-end with measurably positive user outcomes. Has contributed at least 3 reusable components to the design system.",
          competencies: ["UX Thinking", "Research", "Systems Contribution", "Product Partnership"],
        },
        {
          level: 3,
          title: "Senior Product Designer",
          description:
            "Sets design direction for a product pillar. Owns the design system and elevates design quality across the team.",
          minExperience: 5,
          skills: [
            "Design strategy", "Design system ownership", "Stakeholder facilitation",
            "Quantitative UX metrics", "Accessibility (WCAG 2.1)", "Design ops",
          ],
          scope: "Shapes design strategy for an entire product pillar. Influences product roadmap through design.",
          responsibilities: [
            "Own and evolve the company design system (tokens, patterns, documentation)",
            "Lead design sprints and cross-functional workshops",
            "Define UX quality standards and conduct design audits",
            "Partner with engineering to ensure pixel-perfect, accessible implementation",
            "Present design strategy and rationale to leadership",
          ],
          behaviors: [
            "Evangelizes design thinking beyond the design team",
            "Balances user delight with engineering feasibility and business viability",
            "Invests in upskilling junior and mid designers through structured critique",
          ],
          leadershipExpectations: "Mentors L1–L2 designers. Leads design critiques for the team.",
          salaryBandMin: 1700000,
          salaryBandMax: 3000000,
          typicalDuration: "Open-ended",
          promotionCriteria:
            "Has owned and shipped a company-defining product experience. Design system contributions are used across all products. Recognized externally as a design leader.",
          competencies: ["Design Leadership", "Systems Ownership", "Strategic Influence", "Cross-functional Facilitation"],
        },
      ],
    },

    {
      orgId,
      title: "HR & Operations - Specialist",
      department: "HR",
      description:
        "Defines the growth path for HR professionals responsible for people operations, policy, culture, and strategic HR business partnership.",
      status: "active" as const,
      trackType: "specialist" as const,
      visibility: "all" as const,
      levels: [
        {
          level: 1,
          title: "HR Executive",
          description:
            "Handles day-to-day HR operations including onboarding, documentation, and employee queries.",
          minExperience: 0,
          skills: [
            "HRMS tools", "Onboarding coordination", "Leave & attendance management",
            "Documentation & record keeping", "Employee communication",
          ],
          scope: "Executes defined HR processes for a team of up to 50 employees.",
          responsibilities: [
            "Coordinate end-to-end onboarding for new hires",
            "Maintain accurate employee records in the HRMS",
            "Process leave requests and attendance anomalies",
            "Assist in payroll inputs and expense reimbursements",
            "Handle first-line employee HR queries within 24 hours",
          ],
          behaviors: [
            "Treats all employee data with strict confidentiality",
            "Escalates sensitive issues rather than resolving them unilaterally",
            "Maintains a helpful, empathetic tone in all employee interactions",
          ],
          salaryBandMin: 400000,
          salaryBandMax: 700000,
          typicalDuration: "12–18 months",
          promotionCriteria:
            "Zero compliance gaps in documentation for 2 consecutive quarters. Positive employee satisfaction scores for HR responsiveness.",
          competencies: ["Process Execution", "Confidentiality", "Empathy", "Attention to Detail"],
        },
        {
          level: 2,
          title: "HR Generalist",
          description:
            "Owns a people function area (e.g., recruitment, L&D, or policy) and partners with managers on HR decisions.",
          minExperience: 2,
          skills: [
            "Recruitment cycle management", "Performance management", "Policy drafting",
            "Conflict mediation", "HR analytics (Excel/dashboards)", "Labour law basics",
          ],
          scope: "Owns an HR function area (recruitment, L&D, or compliance) for the entire organization.",
          responsibilities: [
            "Own end-to-end recruitment for assigned departments",
            "Partner with managers on performance reviews and improvement plans",
            "Draft and maintain HR policies aligned to labor regulations",
            "Conduct employee engagement surveys and report insights to leadership",
            "Manage the onboarding and offboarding lifecycle end-to-end",
          ],
          behaviors: [
            "Balances employee advocacy with organizational needs",
            "Uses data to make HR recommendations rather than relying solely on intuition",
            "Proactively identifies people risks before they escalate",
          ],
          leadershipExpectations: "Guides L1 HR executives on process and escalation handling.",
          salaryBandMin: 700000,
          salaryBandMax: 1300000,
          typicalDuration: "18–24 months",
          promotionCriteria:
            "Has hired 15+ employees with strong retention rate (>80% at 1 year). Implemented at least one policy that measurably improved employee satisfaction.",
          competencies: ["HR Partnership", "Recruitment", "Policy Thinking", "Data-Driven Decision Making"],
        },
        {
          level: 3,
          title: "HR Business Partner",
          description:
            "Acts as a strategic partner to business leaders. Aligns people strategy to business objectives and drives organizational health.",
          minExperience: 5,
          skills: [
            "Organizational design", "Succession planning", "Compensation benchmarking",
            "Culture change management", "Executive coaching", "HR metrics & OKRs",
          ],
          scope: "Strategic partner to 2–3 business unit heads. Influences org design, culture, and talent strategy.",
          responsibilities: [
            "Partner with business unit heads on headcount planning and org design",
            "Lead compensation benchmarking and pay equity reviews",
            "Design and execute culture and engagement initiatives",
            "Own succession planning for critical roles in the org",
            "Present people analytics and insights to the leadership team",
          ],
          behaviors: [
            "Challenges business leaders on people decisions with data and courage",
            "Connects individual employee concerns to systemic organizational patterns",
            "Operates as a trusted confidant to both employees and leadership",
          ],
          leadershipExpectations: "Mentors L1–L2 HR team members. Leads HR project teams.",
          salaryBandMin: 1300000,
          salaryBandMax: 2500000,
          typicalDuration: "Open-ended",
          promotionCriteria:
            "Measurably improved eNPS or attrition metrics in partnered business units. Has led a company-wide people initiative (e.g., culture redesign, compensation overhaul).",
          competencies: ["Strategic Influence", "Org Design", "Executive Partnership", "Change Management"],
        },
      ],
    },
  ];

  for (const ladder of ladders) {
    await db.insert(careerLadders).values(ladder);
    console.log(`✓ Created: ${ladder.title}`);
  }

  console.log(`\nDone — seeded ${ladders.length} career ladders.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
