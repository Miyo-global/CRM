/**
 * Seeds the interview question bank with questions spread across
 * the past 30 days so the descending-createdAt order is visible in the UI.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/seed-question-bank-with-dates.ts
 *
 * Options:
 *   --clear   Delete all existing questions for the org before seeding
 */

import "dotenv/config";
import { db } from "../lib/db";
import { interviewQuestions, organizations, users } from "../lib/db/schema";
import { eq, and, ilike } from "drizzle-orm";
import { sql } from "drizzle-orm";

const CLEAR = process.argv.includes("--clear");

// ─── Question data ────────────────────────────────────────────────────────────

type Q = {
  question: string;
  category: "GENERAL" | "TECHNICAL" | "BEHAVIOURAL" | "SITUATIONAL" | "ROLE_SPECIFIC" | "CULTURE_FIT";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  role?: string;
  tags: string[];
  sampleAnswer?: string;
  keywords?: string[];
};

const QUESTIONS: Q[] = [
  // ── GENERAL ──────────────────────────────────────────────────────────────
  {
    question: "Tell us about yourself and what drew you to this opportunity.",
    category: "GENERAL",
    difficulty: "EASY",
    tags: ["introduction", "motivation"],
    sampleAnswer: "Look for a concise 2–3 min narrative that covers current role, relevant experience, and a clear reason for interest in Miyo Global specifically.",
    keywords: ["experience", "motivation", "miyoglobal"],
  },
  {
    question: "Why are you exploring a change from your current role at this point in your career?",
    category: "GENERAL",
    difficulty: "EASY",
    tags: ["motivation", "career"],
    sampleAnswer: "Strong answers cite growth, not grievances. Candidate should connect the move to a positive career goal.",
    keywords: ["growth", "opportunity", "goals"],
  },
  {
    question: "What do you know about Miyo Global and how our business operates?",
    category: "GENERAL",
    difficulty: "MEDIUM",
    tags: ["company-research", "preparation"],
    sampleAnswer: "Should reference wealth management, client advisory model, and ideally recent news or company milestones.",
    keywords: ["wealth management", "advisory", "clients"],
  },
  {
    question: "Where do you see yourself professionally in three to five years?",
    category: "GENERAL",
    difficulty: "MEDIUM",
    tags: ["career-goals", "growth"],
    keywords: ["leadership", "growth", "goals"],
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
    keywords: ["impact", "outcome", "ownership"],
  },
  {
    question: "How do you prioritize work when multiple deadlines compete for your attention?",
    category: "GENERAL",
    difficulty: "MEDIUM",
    tags: ["time-management", "prioritization"],
    sampleAnswer: "Strong answers mention a clear system (e.g. Eisenhower matrix, MoSCoW) and give a concrete example of reprioritization under pressure.",
    keywords: ["prioritization", "system", "deadline"],
  },

  // ── TECHNICAL ────────────────────────────────────────────────────────────
  {
    question: "Walk us through how you would model a client's investment portfolio to balance risk and return.",
    category: "TECHNICAL",
    difficulty: "HARD",
    role: "Wealth Relationship Manager",
    tags: ["finance", "portfolio", "risk"],
    sampleAnswer: "Expect mention of asset allocation, risk profiling (questionnaire-based), MPT, Sharpe ratio, and rebalancing triggers.",
    keywords: ["asset allocation", "risk", "diversification", "rebalancing"],
  },
  {
    question: "What is the difference between systematic and unsystematic risk, and how do you mitigate each?",
    category: "TECHNICAL",
    difficulty: "MEDIUM",
    role: "Wealth Relationship Manager",
    tags: ["finance", "risk", "investment"],
    sampleAnswer: "Systematic = market-wide (diversification doesn't help, use hedging). Unsystematic = company/sector specific (mitigated through diversification).",
    keywords: ["systematic", "unsystematic", "hedging", "diversification"],
  },
  {
    question: "Explain how you would debug a production issue reported by a client at 2 AM with minimal context.",
    category: "TECHNICAL",
    difficulty: "HARD",
    role: "Software Developer",
    tags: ["debugging", "production", "problem-solving"],
    sampleAnswer: "Look for: check logs first, isolate scope, reproduce in staging, communicate ETA to stakeholders, post-mortem after resolution.",
    keywords: ["logs", "reproduce", "isolate", "communicate", "post-mortem"],
  },
  {
    question: "How would you design a system to send 10,000 personalised emails without hitting rate limits?",
    category: "TECHNICAL",
    difficulty: "HARD",
    role: "Software Developer",
    tags: ["system-design", "email", "rate-limiting"],
    sampleAnswer: "Queue-based approach (BullMQ/SQS), batching, exponential backoff, bounce/complaint handling, dedicated IP warm-up.",
    keywords: ["queue", "batch", "backoff", "rate limit"],
  },
  {
    question: "What tools or metrics do you use to measure the success of a digital marketing campaign?",
    category: "TECHNICAL",
    difficulty: "MEDIUM",
    role: "Digital Marketing Manager",
    tags: ["marketing", "analytics", "metrics"],
    sampleAnswer: "CTR, CPL, ROAS, CAC, LTV, conversion funnel. Candidate should differentiate between vanity metrics and business-impact metrics.",
    keywords: ["ctr", "roas", "cac", "conversion", "funnel"],
  },
  {
    question: "How do you approach keyword research when entering a new content vertical?",
    category: "TECHNICAL",
    difficulty: "MEDIUM",
    role: "Digital Marketing Manager",
    tags: ["seo", "content", "keywords"],
    keywords: ["search volume", "intent", "competition", "cluster"],
  },
  {
    question: "Describe the video editing workflow you follow from raw footage to final delivery.",
    category: "TECHNICAL",
    difficulty: "MEDIUM",
    role: "Senior Video Editor",
    tags: ["video-editing", "workflow", "production"],
    sampleAnswer: "Ingest → rough cut → sync audio → colour grade → sound mix → export → review loop → final delivery. Mention codec/resolution choices.",
    keywords: ["rough cut", "colour grade", "export", "review"],
  },
  {
    question: "How do you handle an applicant who appears well-qualified on paper but performs poorly in a structured interview?",
    category: "TECHNICAL",
    difficulty: "MEDIUM",
    role: "HR Manager",
    tags: ["recruitment", "assessment", "hr"],
    sampleAnswer: "Use multiple assessment methods (task-based, reference checks). Consider interview anxiety vs. genuine gap. Don't rely on a single data point.",
    keywords: ["assessment", "reference check", "multiple methods"],
  },

  // ── BEHAVIOURAL ──────────────────────────────────────────────────────────
  {
    question: "Tell me about a time you disagreed with a manager's decision. How did you handle it?",
    category: "BEHAVIOURAL",
    difficulty: "MEDIUM",
    tags: ["conflict", "communication", "leadership"],
    sampleAnswer: "STAR format. Look for respectful pushback (not passive or aggressive), evidence provided, and willingness to commit once decision is made.",
    keywords: ["disagreement", "evidence", "respect", "commit"],
  },
  {
    question: "Describe a situation where you had to learn something completely new under time pressure.",
    category: "BEHAVIOURAL",
    difficulty: "MEDIUM",
    tags: ["learning", "adaptability", "pressure"],
    keywords: ["quick learning", "resourcefulness", "outcome"],
  },
  {
    question: "Give an example of a project that failed. What happened and what did you take away from it?",
    category: "BEHAVIOURAL",
    difficulty: "MEDIUM",
    tags: ["failure", "learning", "ownership"],
    sampleAnswer: "Red flag: blaming others or no self-reflection. Green flag: clear ownership, specific lessons applied in future work.",
    keywords: ["ownership", "learning", "self-awareness"],
  },
  {
    question: "Tell me about a time you had to influence someone who did not report to you.",
    category: "BEHAVIOURAL",
    difficulty: "HARD",
    tags: ["influence", "collaboration", "stakeholders"],
    keywords: ["influence", "data", "trust", "alignment"],
  },
  {
    question: "Describe a time you received critical feedback that was difficult to hear. How did you respond?",
    category: "BEHAVIOURAL",
    difficulty: "MEDIUM",
    tags: ["feedback", "growth", "self-awareness"],
    keywords: ["feedback", "action", "growth", "openness"],
  },
  {
    question: "Tell me about a time you had to manage a difficult client or stakeholder relationship.",
    category: "BEHAVIOURAL",
    difficulty: "HARD",
    tags: ["client-management", "communication", "conflict"],
    sampleAnswer: "Look for proactive communication, empathy, setting expectations, and concrete resolution steps. Not just 'I listened and they were happy'.",
    keywords: ["expectation", "empathy", "resolution", "proactive"],
  },
  {
    question: "Describe a time you took initiative on something that wasn't explicitly part of your job.",
    category: "BEHAVIOURAL",
    difficulty: "MEDIUM",
    tags: ["initiative", "ownership", "proactivity"],
    keywords: ["initiative", "impact", "ownership"],
  },

  // ── SITUATIONAL ──────────────────────────────────────────────────────────
  {
    question: "A high-value client calls upset that their portfolio is down 12% this month. How do you handle the call?",
    category: "SITUATIONAL",
    difficulty: "HARD",
    role: "Wealth Relationship Manager",
    tags: ["client-management", "finance", "communication"],
    sampleAnswer: "Acknowledge emotion first, don't lead with data. Explain context (market conditions), revisit risk profile, offer a review meeting. Don't make promises on performance.",
    keywords: ["acknowledge", "context", "risk profile", "review", "no promises"],
  },
  {
    question: "You are mid-sprint and a critical production bug is reported. Your PM also just escalated a new feature request. What do you do?",
    category: "SITUATIONAL",
    difficulty: "HARD",
    role: "Software Developer",
    tags: ["prioritization", "communication", "agile"],
    sampleAnswer: "Triage bug severity first. If critical (data loss, outage) → context switch immediately. Communicate impact and ETA to PM. Feature waits.",
    keywords: ["triage", "severity", "communicate", "prioritize"],
  },
  {
    question: "You discover that a colleague has been recording incorrect attendance for a team member. What steps would you take?",
    category: "SITUATIONAL",
    difficulty: "HARD",
    role: "HR Manager",
    tags: ["ethics", "hr", "policy"],
    sampleAnswer: "Document the observation, speak to the colleague first to understand context, then escalate per policy. Preserve confidentiality throughout.",
    keywords: ["document", "policy", "confidentiality", "escalate"],
  },
  {
    question: "A candidate you interviewed very well just rejected your offer citing salary. What would you do to try to retain them?",
    category: "SITUATIONAL",
    difficulty: "MEDIUM",
    role: "HR Manager",
    tags: ["recruitment", "negotiation", "hr"],
    keywords: ["negotiate", "benefits", "counter-offer", "escalate"],
  },
  {
    question: "You are running a social media campaign and notice engagement has dropped 40% overnight. What are your next steps?",
    category: "SITUATIONAL",
    difficulty: "MEDIUM",
    role: "Digital Marketing Manager",
    tags: ["social-media", "analytics", "crisis"],
    sampleAnswer: "Check platform status (algorithm update?), review content that went live, check competitor activity, pull data before drawing conclusions.",
    keywords: ["diagnose", "data", "algorithm", "competitor", "content audit"],
  },
  {
    question: "The client hands you a 2-hour raw video and needs a 90-second highlight reel by end of day. How do you approach this?",
    category: "SITUATIONAL",
    difficulty: "MEDIUM",
    role: "Senior Video Editor",
    tags: ["time-management", "video-editing", "client"],
    keywords: ["brief", "key moments", "proxy", "export", "review"],
  },
  {
    question: "Your manager asks you to prepare a presentation for investors in 4 hours and you have no data yet. What do you do?",
    category: "SITUATIONAL",
    difficulty: "HARD",
    tags: ["time-management", "communication", "problem-solving"],
    keywords: ["scope", "delegate", "communicate", "prioritize"],
  },

  // ── ROLE_SPECIFIC ────────────────────────────────────────────────────────
  {
    question: "How do you build a pipeline of prospective HNI clients from scratch?",
    category: "ROLE_SPECIFIC",
    difficulty: "HARD",
    role: "Wealth Relationship Manager",
    tags: ["sales", "networking", "hni"],
    sampleAnswer: "Referrals from existing clients, LinkedIn outreach, community events, family office networks, centre-of-influence partnerships (CAs, lawyers).",
    keywords: ["referral", "network", "outreach", "hni", "pipeline"],
  },
  {
    question: "What does your end-to-end process look like for sourcing, screening, and closing a candidate within 10 days?",
    category: "ROLE_SPECIFIC",
    difficulty: "HARD",
    role: "HR Manager",
    tags: ["recruitment", "process", "speed"],
    sampleAnswer: "JD sign-off → sourcing (portals + LinkedIn) → CV screening → HR round → panel → offer → negotiation → onboarding kickoff. Each stage has a 24hr SLA.",
    keywords: ["process", "sla", "sourcing", "screening", "offer"],
  },
  {
    question: "How have you previously set up or scaled a customer support function from scratch?",
    category: "ROLE_SPECIFIC",
    difficulty: "HARD",
    role: "Customer Support Executive",
    tags: ["support", "operations", "scaling"],
    keywords: ["process", "ticketing", "sla", "knowledge base", "training"],
  },
  {
    question: "Walk us through how you execute an SEO audit for a website with 200+ pages.",
    category: "ROLE_SPECIFIC",
    difficulty: "HARD",
    role: "Digital Marketing Manager",
    tags: ["seo", "audit", "technical"],
    sampleAnswer: "Crawl (Screaming Frog/Ahrefs) → check indexability → Core Web Vitals → on-page (title, meta, H1) → backlink profile → content gaps → prioritised fix list.",
    keywords: ["crawl", "indexability", "core web vitals", "backlink", "content gap"],
  },
  {
    question: "Describe how you would storyboard a 60-second brand video for a financial services company.",
    category: "ROLE_SPECIFIC",
    difficulty: "MEDIUM",
    role: "Senior Video Editor",
    tags: ["storyboarding", "brand", "video"],
    keywords: ["storyboard", "brief", "tone", "compliance", "script"],
  },
  {
    question: "How do you qualify a lead and decide when to escalate to a senior relationship manager?",
    category: "ROLE_SPECIFIC",
    difficulty: "MEDIUM",
    role: "Sales Executive",
    tags: ["sales", "lead-qualification", "process"],
    sampleAnswer: "BANT or MEDDIC framework. Escalate when AUM potential exceeds threshold or prospect explicitly asks for senior engagement.",
    keywords: ["qualify", "bant", "aum", "escalate", "threshold"],
  },

  // ── CULTURE_FIT ──────────────────────────────────────────────────────────
  {
    question: "Describe the work environment in which you do your best work.",
    category: "CULTURE_FIT",
    difficulty: "EASY",
    tags: ["culture", "environment", "preferences"],
    keywords: ["collaboration", "autonomy", "feedback", "growth"],
  },
  {
    question: "How do you handle working in a fast-moving organisation where priorities change frequently?",
    category: "CULTURE_FIT",
    difficulty: "MEDIUM",
    tags: ["adaptability", "culture", "agile"],
    sampleAnswer: "Look for candidates who embrace ambiguity and see change as a signal of growth, not instability. Red flag: needs rigid structure to function.",
    keywords: ["adaptability", "ambiguity", "flexibility", "opportunity"],
  },
  {
    question: "What does integrity at work look like to you, and can you give an example?",
    category: "CULTURE_FIT",
    difficulty: "MEDIUM",
    tags: ["values", "integrity", "ethics"],
    keywords: ["honesty", "accountability", "transparency", "example"],
  },
  {
    question: "How do you typically handle it when a colleague's work quality is affecting the team's output?",
    category: "CULTURE_FIT",
    difficulty: "MEDIUM",
    tags: ["teamwork", "communication", "accountability"],
    keywords: ["direct conversation", "empathy", "accountability", "support"],
  },
  {
    question: "What does 'ownership' mean to you in a professional context?",
    category: "CULTURE_FIT",
    difficulty: "EASY",
    tags: ["ownership", "accountability", "values"],
    keywords: ["end-to-end", "accountability", "proactive", "no excuses"],
  },
  {
    question: "Is there anything about your current or past workplace culture that you would not want to replicate here?",
    category: "CULTURE_FIT",
    difficulty: "MEDIUM",
    tags: ["culture", "self-awareness", "values"],
    sampleAnswer: "Red flag: generic complaints or negativity. Green flag: thoughtful observation tied to what they are seeking instead.",
    keywords: ["self-awareness", "constructive", "growth"],
  },
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(Math.floor(Math.random() * 9) + 9, Math.floor(Math.random() * 60), 0, 0);
  return d;
}

async function main() {
  const [org] = await db
    .select({ id: organizations.id, slug: organizations.slug })
    .from(organizations)
    .limit(1);

  if (!org) throw new Error("No organisation found.");

  const creatorEmail = process.env.SEED_CREATED_BY_EMAIL ?? process.env.TEST_EMAIL_TO;
  const creator =
    (creatorEmail
      ? await db.query.users.findFirst({ where: (u, { eq: e }) => e(u.email, creatorEmail) })
      : null) ?? (await db.query.users.findFirst());

  if (CLEAR) {
    await db.delete(interviewQuestions).where(eq(interviewQuestions.orgId, org.id));
    console.log(`Cleared all existing questions for org ${org.slug ?? org.id}`);
  }

  let inserted = 0;
  let skipped = 0;

  const totalDays = 30;

  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i];

    const existing = await db.query.interviewQuestions.findFirst({
      where: and(
        eq(interviewQuestions.orgId, org.id),
        ilike(interviewQuestions.question, q.question),
      ),
    });

    if (existing) {
      console.log(`  skip  "${q.question.slice(0, 60)}…"`);
      skipped++;
      continue;
    }

    const daysBack = Math.round((i / QUESTIONS.length) * totalDays);
    const createdAt = daysAgo(daysBack);

    await db
      .insert(interviewQuestions)
      .values({
        orgId: org.id,
        question: q.question,
        category: q.category,
        difficulty: q.difficulty,
        role: q.role ?? null,
        tags: q.tags,
        sampleAnswer: q.sampleAnswer ?? null,
        keywords: q.keywords ?? [],
        createdBy: creator?.id ?? null,
      });

    await db.execute(
      sql`UPDATE interview_questions
          SET created_at = ${createdAt.toISOString()}
          WHERE org_id = ${org.id}
            AND question = ${q.question}`,
    );

    console.log(`  +${String(daysBack).padStart(2, " ")} days ago  [${q.category}/${q.difficulty}]  "${q.question.slice(0, 55)}…"`);
    inserted++;
  }

  console.log(`\nDone. inserted=${inserted}  skipped=${skipped}  org=${org.slug ?? org.id}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
