import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

async function seed() {
  const orgs = await db.query.organizations.findMany({ limit: 1 });
  if (orgs.length === 0) {
    console.error("No organizations found. Run the app and create one first.");
    process.exit(1);
  }
  const orgId = orgs[0].id;
  const existingPeople = await db.query.crmPeople.findMany({
    where: eq(schema.crmPeople.orgId, orgId),
    limit: 1,
  });
  if (existingPeople.length > 0) {
    await client.end();
    return;
  }
  const peopleData = [
    { slug: "sarah-mitchell", name: "Sarah Mitchell", initials: "SM", role: "sales_rep" as const, title: "Senior Account Executive", department: "Sales", email: "sarah.mitchell@miyoglobal.com", phone: "+1 (415) 555-0142", location: "San Francisco, CA", joinDate: "Mar 2022", bio: "Top-performing AE with expertise in enterprise SaaS sales.", skills: ["Enterprise Sales", "Consultative Selling", "SaaS", "Contract Negotiation", "C-Suite Engagement"] },
    { slug: "jason-lee", name: "Jason Lee", initials: "JL", role: "sales_rep" as const, title: "Account Executive", department: "Sales", email: "jason.lee@miyoglobal.com", phone: "+1 (415) 555-0198", location: "San Francisco, CA", joinDate: "Jun 2022", bio: "Strategic seller with deep expertise in the financial services vertical.", skills: ["Technical Sales", "Financial Services", "Solution Architecture", "Multi-threading", "POC Management"] },
    { slug: "maria-kim", name: "Maria Kim", initials: "MK", role: "sales_rep" as const, title: "Account Executive", department: "Sales", email: "maria.kim@miyoglobal.com", phone: "+1 (212) 555-0167", location: "New York, NY", joinDate: "Sep 2022", bio: "Relationship-driven seller with expertise in healthcare and life sciences.", skills: ["Healthcare Sales", "Account Expansion", "Relationship Building", "Renewal Management", "Cross-sell"] },
    { slug: "alex-park", name: "Alex Park", initials: "AP", role: "sales_rep" as const, title: "Business Development Rep", department: "Sales", email: "alex.park@miyoglobal.com", phone: "+1 (512) 555-0134", location: "Austin, TX", joinDate: "Jan 2023", bio: "High-energy BDR transitioning into a closing role.", skills: ["Outbound Prospecting", "Pipeline Generation", "Mid-Market", "Cold Calling", "Demo Skills"] },
    { slug: "daniel-chen", name: "Daniel Chen", initials: "DC", role: "sales_rep" as const, title: "Account Executive", department: "Sales", email: "daniel.chen@miyoglobal.com", phone: "+1 (310) 555-0189", location: "Los Angeles, CA", joinDate: "Apr 2023", bio: "Data-driven seller specializing in manufacturing and logistics.", skills: ["Manufacturing", "Logistics", "ROI Analysis", "Data-Driven Selling", "Business Case Development"] },
    { slug: "emma-watson", name: "Emma Watson", initials: "EW", role: "csm" as const, title: "Senior Customer Success Manager", department: "Customer Success", email: "emma.watson@miyoglobal.com", phone: "+1 (415) 555-0211", location: "San Francisco, CA", joinDate: "Jan 2022", bio: "Seasoned CSM with a proactive approach to customer health management.", skills: ["Account Management", "Executive Relationships", "Adoption", "Renewal Strategy", "Stakeholder Mapping"] },
    { slug: "ryan-torres", name: "Ryan Torres", initials: "RT", role: "csm" as const, title: "Customer Success Manager", department: "Customer Success", email: "ryan.torres@miyoglobal.com", phone: "+1 (212) 555-0244", location: "New York, NY", joinDate: "May 2022", bio: "Technical CSM specializing in complex integrations and deep product adoption.", skills: ["Technical CSM", "Integrations", "Product Adoption", "Risk Management", "Technical Documentation"] },
    { slug: "lisa-huang", name: "Lisa Huang", initials: "LH", role: "csm" as const, title: "Customer Success Manager", department: "Customer Success", email: "lisa.huang@miyoglobal.com", phone: "+1 (512) 555-0178", location: "Austin, TX", joinDate: "Aug 2023", bio: "Customer-centric CSM with exceptional onboarding skills.", skills: ["Onboarding", "Training", "Time-to-Value", "Change Management", "Customer Education"] },
  ];

  const insertedPeople = await db.insert(schema.crmPeople).values(
    peopleData.map((p) => ({ ...p, orgId }))
  ).returning();

  const personBySlug = new Map(insertedPeople.map((p) => [p.slug, p]));
  const emma = personBySlug.get("emma-watson")!;
  const ryan = personBySlug.get("ryan-torres")!;
  const lisa = personBySlug.get("lisa-huang")!;

  const companiesData = [
    { name: "Acme Corp", health: "healthy" as const, revenue: "1200000", renewalDate: "2026-03-15", renewalValue: "240000", customerSince: "2022", csmId: emma.id },
    { name: "TechFlow Inc", health: "at_risk" as const, revenue: "750000", renewalDate: "2026-03-22", renewalValue: "180000", customerSince: "2023", csmId: emma.id },
    { name: "Global Dynamics", health: "healthy" as const, revenue: "980000", renewalDate: "2026-04-01", renewalValue: "320000", customerSince: "2021", csmId: ryan.id },
    { name: "Nexus Systems", health: "critical" as const, revenue: "350000", renewalDate: "2026-04-10", renewalValue: "95000", customerSince: "2023", csmId: null },
    { name: "Blue Horizon", health: "healthy" as const, revenue: "150000", renewalDate: "2026-04-18", renewalValue: "150000", customerSince: "2024", csmId: emma.id },
    { name: "Vertex Labs", health: "at_risk" as const, revenue: "210000", renewalDate: "2026-05-01", renewalValue: "210000", customerSince: "2023", csmId: ryan.id },
    { name: "DataPrime", health: "healthy" as const, revenue: "620000", renewalDate: "2026-05-20", renewalValue: "200000", customerSince: "2022", csmId: lisa.id },
    { name: "CloudNine", health: "critical" as const, revenue: "540000", renewalDate: "2026-06-10", renewalValue: "180000", customerSince: "2024", csmId: ryan.id },
    { name: "Summit Corp", health: "healthy" as const, revenue: "420000", renewalDate: "2026-06-01", renewalValue: "140000", customerSince: "2023", csmId: emma.id },
    { name: "Prism Digital", health: "healthy" as const, revenue: "280000", renewalDate: "2026-07-15", renewalValue: "90000", customerSince: "2024", csmId: emma.id },
    { name: "Skyline Corp", health: "healthy" as const, revenue: "380000", renewalDate: "2026-07-01", renewalValue: "120000", customerSince: "2024", csmId: lisa.id },
    { name: "BrightPath", health: "healthy" as const, revenue: "290000", renewalDate: "2026-08-15", renewalValue: "95000", customerSince: "2024", csmId: lisa.id },
    { name: "DataStream", health: "healthy" as const, revenue: "340000", renewalDate: "2026-08-01", renewalValue: "110000", customerSince: "2022", csmId: ryan.id },
    { name: "NovaTech", health: "healthy" as const, revenue: "530000", renewalDate: "2026-09-15", renewalValue: "175000", customerSince: "2023", csmId: ryan.id },
    { name: "Forge Systems", health: "at_risk" as const, revenue: "220000", renewalDate: "2026-10-01", renewalValue: "75000", customerSince: "2025", csmId: lisa.id },
  ];

  await db.insert(schema.crmCompanies).values(
    companiesData.map((c) => ({ ...c, orgId }))
  );
  const sarah = personBySlug.get("sarah-mitchell")!;
  const jason = personBySlug.get("jason-lee")!;
  const maria = personBySlug.get("maria-kim")!;
  const alex = personBySlug.get("alex-park")!;
  const daniel = personBySlug.get("daniel-chen")!;

  const dealsData = [
    { companyName: "Acme Corp", value: "420000", stage: "Negotiation" as const, probability: 85, closeDate: "2026-03-10", salesRepId: sarah.id },
    { companyName: "TechFlow Inc", value: "310000", stage: "Proposal" as const, probability: 70, closeDate: "2026-03-25", salesRepId: jason.id },
    { companyName: "Global Dynamics", value: "285000", stage: "Closed Won" as const, probability: 100, closeDate: "2026-02-21", salesRepId: maria.id },
    { companyName: "Nexus Systems", value: "195000", stage: "Qualified" as const, probability: 45, closeDate: "2026-04-15", salesRepId: alex.id },
    { companyName: "Blue Horizon", value: "178000", stage: "Negotiation" as const, probability: 80, closeDate: "2026-03-18", salesRepId: sarah.id },
    { companyName: "Pinnacle Tech", value: "95000", stage: "Proposal" as const, probability: 60, closeDate: "2026-04-05", salesRepId: sarah.id },
    { companyName: "Redwood Analytics", value: "67000", stage: "Discovery" as const, probability: 30, closeDate: "2026-04-22", salesRepId: sarah.id },
    { companyName: "FinServe Global", value: "125000", stage: "Qualified" as const, probability: 50, closeDate: "2026-04-12", salesRepId: jason.id },
    { companyName: "Atlas Digital", value: "88000", stage: "Discovery" as const, probability: 25, closeDate: "2026-05-01", salesRepId: jason.id },
    { companyName: "MedCore Systems", value: "107000", stage: "Negotiation" as const, probability: 75, closeDate: "2026-03-08", salesRepId: maria.id },
    { companyName: "Spark Digital", value: "72000", stage: "Discovery" as const, probability: 20, closeDate: "2026-05-10", salesRepId: alex.id },
    { companyName: "Vortex Labs", value: "48000", stage: "Proposal" as const, probability: 55, closeDate: "2026-03-28", salesRepId: alex.id },
    { companyName: "LogiPrime", value: "145000", stage: "Proposal" as const, probability: 65, closeDate: "2026-03-20", salesRepId: daniel.id },
    { companyName: "FleetOps Inc", value: "88000", stage: "Negotiation" as const, probability: 70, closeDate: "2026-03-12", salesRepId: daniel.id },
    { companyName: "Vertex Labs Deal", value: "42000", stage: "Discovery" as const, probability: 20, closeDate: "2026-05-05", salesRepId: daniel.id },
    { companyName: "Metro Systems", value: "92000", stage: "Closed Won" as const, probability: 100, closeDate: "2026-02-10", salesRepId: jason.id },
    { companyName: "Vertex Labs Renew", value: "145000", stage: "Closed Won" as const, probability: 100, closeDate: "2026-02-15", salesRepId: daniel.id },
    { companyName: "BioGen", value: "120000", stage: "Closed Won" as const, probability: 100, closeDate: "2026-01-20", salesRepId: maria.id },
    { companyName: "StartupXYZ", value: "78000", stage: "Closed Won" as const, probability: 100, closeDate: "2026-01-15", salesRepId: alex.id },
    { companyName: "CoreData", value: "135000", stage: "Closed Won" as const, probability: 100, closeDate: "2026-02-01", salesRepId: sarah.id },
  ];

  await db.insert(schema.crmDeals).values(
    dealsData.map((d) => ({ ...d, orgId }))
  );
  const campaignsData = [
    { name: "Spring Product Launch", status: "active" as const, leads: 620, spend: "45000", roi: "4.2" },
    { name: "LinkedIn ABM Campaign", status: "active" as const, leads: 340, spend: "28000", roi: "3.8" },
    { name: "Webinar Series Q1", status: "active" as const, leads: 290, spend: "12000", roi: "5.1" },
    { name: "Google Ads — Brand", status: "active" as const, leads: 480, spend: "35000", roi: "3.2" },
    { name: "Content Syndication", status: "paused" as const, leads: 210, spend: "18000", roi: "2.8" },
    { name: "Email Nurture Flow", status: "active" as const, leads: 520, spend: "8000", roi: "7.4" },
    { name: "Trade Show — CRMExpo", status: "completed" as const, leads: 180, spend: "55000", roi: "1.9" },
    { name: "Referral Program", status: "active" as const, leads: 207, spend: "5000", roi: "9.2" },
  ];

  await db.insert(schema.crmCampaigns).values(
    campaignsData.map((c) => ({ ...c, orgId }))
  );
  const leadChannels = [
    { channel: "Organic Search", count: 17000 },
    { channel: "Paid Ads", count: 13500 },
    { channel: "Social Media", count: 8700 },
    { channel: "Email", count: 5800 },
    { channel: "Referral", count: 3500 },
  ];

  const leadStatuses = [
    { status: "visitor" as const, fraction: 0.80 },
    { status: "lead" as const, fraction: 0.10 },
    { status: "mql" as const, fraction: 0.05 },
    { status: "sql" as const, fraction: 0.03 },
    { status: "opportunity" as const, fraction: 0.02 },
  ];
  for (const ch of leadChannels) {
    const leadsToInsert = [];
    for (const ls of leadStatuses) {
      const count = Math.round(ch.count * ls.fraction);
      for (let i = 0; i < count; i++) {
        leadsToInsert.push({
          orgId,
          email: `lead-${ch.channel.toLowerCase().replace(/\s/g, "-")}-${ls.status}-${i}@example.com`,
          name: `Lead ${i}`,
          status: ls.status,
          channel: ch.channel,
        });
      }
    }
    const batchSize = 500;
    for (let i = 0; i < leadsToInsert.length; i += batchSize) {
      const batch = leadsToInsert.slice(i, i + batchSize);
      await db.insert(schema.crmLeads).values(batch);
    }
  }
  const contentData = [
    { title: "2026 CRM Trends Report", type: "Whitepaper", views: 4200, leads: 180, convRate: "4.3" },
    { title: "ROI Calculator Tool", type: "Interactive", views: 3800, leads: 320, convRate: "8.4" },
    { title: "Customer Success Playbook", type: "eBook", views: 2900, leads: 145, convRate: "5.0" },
    { title: "Product Demo Video", type: "Video", views: 6100, leads: 210, convRate: "3.4" },
    { title: "Integration Guide Series", type: "Blog", views: 8400, leads: 95, convRate: "1.1" },
  ];

  await db.insert(schema.crmContent).values(
    contentData.map((c) => ({ ...c, orgId }))
  );
  const eventsData = [
    { name: "CRM Summit 2026", date: "Mar 12-14", type: "Conference", status: "confirmed" as const },
    { name: "Product Webinar: AI Features", date: "Mar 20", type: "Webinar", status: "confirmed" as const },
    { name: "Partner Meetup — NYC", date: "Apr 3", type: "Meetup", status: "planning" as const },
    { name: "Customer Advisory Board", date: "Apr 15", type: "Meeting", status: "confirmed" as const },
    { name: "Digital Marketing Workshop", date: "May 1", type: "Workshop", status: "planning" as const },
  ];

  await db.insert(schema.crmEvents).values(
    eventsData.map((e) => ({ ...e, orgId }))
  );
  const activitiesData = [
    { type: "deal_won" as const, message: "Closed $285K deal with Global Dynamics", time: "2h ago", person: "Maria K.", personId: maria.id, category: "sales" },
    { type: "meeting" as const, message: "Demo scheduled with Nexus Systems", time: "3h ago", person: "Alex P.", personId: alex.id, category: "sales" },
    { type: "proposal" as const, message: "Sent proposal to TechFlow Inc", time: "5h ago", person: "Jason L.", personId: jason.id, category: "sales" },
    { type: "call" as const, message: "Discovery call with Blue Horizon", time: "6h ago", person: "Sarah M.", personId: sarah.id, category: "sales" },
    { type: "email" as const, message: "Follow-up sent to Acme Corp", time: "8h ago", person: "Sarah M.", personId: sarah.id, category: "sales" },
    { type: "deal_won" as const, message: "Closed $145K deal with Vertex Labs", time: "1d ago", person: "Daniel C.", personId: daniel.id, category: "sales" },
    { type: "meeting" as const, message: "QBR meeting with top accounts", time: "1d ago", person: "Jason L.", personId: jason.id, category: "sales" },
    { type: "call" as const, message: "QBR call with Acme Corp — discussed expansion", time: "1h ago", person: "Emma W.", personId: emma.id, category: "customer_success" },
    { type: "ticket" as const, message: "Resolved P1 ticket for TechFlow Inc", time: "3h ago", person: "Support", personId: null, category: "customer_success" },
    { type: "meeting" as const, message: "Onboarding session with new client DataPrime", time: "5h ago", person: "Lisa H.", personId: lisa.id, category: "customer_success" },
    { type: "email" as const, message: "Renewal proposal sent to Global Dynamics", time: "6h ago", person: "Ryan T.", personId: ryan.id, category: "customer_success" },
    { type: "escalation" as const, message: "Escalation from CloudNine — API latency issues", time: "8h ago", person: "Ryan T.", personId: ryan.id, category: "customer_success" },
    { type: "call" as const, message: "Check-in call with Blue Horizon", time: "1d ago", person: "Emma W.", personId: emma.id, category: "customer_success" },
    { type: "ticket" as const, message: "Ticket #2094 created — High Priority", time: "24m ago", person: "System", personId: null, category: "support" },
    { type: "email" as const, message: "Agent replied to Ticket #2091", time: "1h ago", person: "Jane D.", personId: null, category: "support" },
    { type: "deal_won" as const, message: "Ticket #2088 resolved via automation", time: "2h ago", person: "System", personId: null, category: "support" },
    { type: "call" as const, message: "Customer callback for Ticket #2085", time: "3h ago", person: "John S.", personId: null, category: "support" },
    { type: "escalation" as const, message: "Ticket #2080 escalated to Level 2", time: "5h ago", person: "Robert F.", personId: null, category: "support" },
    { type: "email" as const, message: "SLA breach warning for Ticket #2076", time: "6h ago", person: "System", personId: null, category: "support" },
    { type: "ticket" as const, message: "Ticket #2074 reopened by customer", time: "8h ago", person: "Emily C.", personId: null, category: "support" },
    { type: "call" as const, message: "Discovery call with Blue Horizon — identified $178K opportunity", time: "6h ago", person: "Sarah M.", personId: sarah.id, category: "person" },
    { type: "email" as const, message: "Follow-up sent to Acme Corp with updated pricing", time: "8h ago", person: "Sarah M.", personId: sarah.id, category: "person" },
    { type: "meeting" as const, message: "Demo presentation to Pinnacle Tech (5 stakeholders)", time: "1d ago", person: "Sarah M.", personId: sarah.id, category: "person" },
    { type: "proposal" as const, message: "Sent revised proposal to Redwood Analytics", time: "2d ago", person: "Sarah M.", personId: sarah.id, category: "person" },
    { type: "deal_won" as const, message: "Closed $145K deal with Vertex Labs", time: "3d ago", person: "Sarah M.", personId: sarah.id, category: "person" },
    { type: "proposal" as const, message: "Sent proposal to TechFlow Inc — $310K opportunity", time: "5h ago", person: "Jason L.", personId: jason.id, category: "person" },
    { type: "meeting" as const, message: "QBR meeting with top accounts", time: "1d ago", person: "Jason L.", personId: jason.id, category: "person" },
    { type: "call" as const, message: "Technical deep-dive with FinServe Global IT team", time: "2d ago", person: "Jason L.", personId: jason.id, category: "person" },
    { type: "email" as const, message: "Sent case study to Atlas Digital", time: "3d ago", person: "Jason L.", personId: jason.id, category: "person" },
    { type: "deal_won" as const, message: "Closed $92K deal with Metro Systems", time: "5d ago", person: "Jason L.", personId: jason.id, category: "person" },
    { type: "deal_won" as const, message: "Closed $285K deal with Global Dynamics", time: "2h ago", person: "Maria K.", personId: maria.id, category: "person" },
    { type: "meeting" as const, message: "Negotiation meeting with MedCore Systems", time: "1d ago", person: "Maria K.", personId: maria.id, category: "person" },
    { type: "call" as const, message: "Expansion discussion with existing client BioGen", time: "2d ago", person: "Maria K.", personId: maria.id, category: "person" },
    { type: "call" as const, message: "QBR call with Acme Corp — discussed expansion plans", time: "1h ago", person: "Emma W.", personId: emma.id, category: "person" },
    { type: "call" as const, message: "Check-in call with Blue Horizon", time: "1d ago", person: "Emma W.", personId: emma.id, category: "person" },
    { type: "meeting" as const, message: "Executive business review with TechFlow Inc", time: "2d ago", person: "Emma W.", personId: emma.id, category: "person" },
    { type: "email" as const, message: "Sent adoption playbook to Summit Corp", time: "3d ago", person: "Emma W.", personId: emma.id, category: "person" },
    { type: "escalation" as const, message: "Managed escalation for TechFlow Inc — API migration", time: "4d ago", person: "Emma W.", personId: emma.id, category: "person" },
    { type: "email" as const, message: "Renewal proposal sent to Global Dynamics", time: "6h ago", person: "Ryan T.", personId: ryan.id, category: "person" },
    { type: "escalation" as const, message: "Escalation from CloudNine — API latency issues", time: "8h ago", person: "Ryan T.", personId: ryan.id, category: "person" },
    { type: "call" as const, message: "Technical review with Vertex Labs engineering team", time: "1d ago", person: "Ryan T.", personId: ryan.id, category: "person" },
    { type: "meeting" as const, message: "Product roadmap review with DataStream", time: "2d ago", person: "Ryan T.", personId: ryan.id, category: "person" },
    { type: "meeting" as const, message: "Onboarding session with new client DataPrime", time: "5h ago", person: "Lisa H.", personId: lisa.id, category: "person" },
    { type: "call" as const, message: "30-day check-in with Skyline Corp", time: "1d ago", person: "Lisa H.", personId: lisa.id, category: "person" },
    { type: "email" as const, message: "Sent training resources to BrightPath team", time: "2d ago", person: "Lisa H.", personId: lisa.id, category: "person" },
    { type: "meeting" as const, message: "Adoption review with Forge Systems", time: "3d ago", person: "Lisa H.", personId: lisa.id, category: "person" },
  ];

  await db.insert(schema.crmActivities).values(
    activitiesData.map((a) => ({ ...a, orgId }))
  );
  const supportTicketsData: { title: string; priority: "critical" | "high" | "medium" | "low"; status: "new" | "in_progress" | "resolved" | "closed" }[] = [];
  const ticketDistribution = [
    { status: "new" as const, count: 438 },
    { status: "in_progress" as const, count: 312 },
    { status: "resolved" as const, count: 250 },
    { status: "closed" as const, count: 250 },
  ];
  const priorityDistribution = [
    { priority: "critical" as const, fraction: 0.07 },
    { priority: "high" as const, fraction: 0.17 },
    { priority: "medium" as const, fraction: 0.45 },
    { priority: "low" as const, fraction: 0.31 },
  ];

  for (const td of ticketDistribution) {
    for (let i = 0; i < td.count; i++) {
      const rand = Math.random();
      let cumulative = 0;
      let priority: "critical" | "high" | "medium" | "low" = "medium";
      for (const pd of priorityDistribution) {
        cumulative += pd.fraction;
        if (rand <= cumulative) {
          priority = pd.priority;
          break;
        }
      }
      supportTicketsData.push({
        title: `Support Ticket ${td.status}-${i}`,
        priority,
        status: td.status,
      });
    }
  }
  const ticketBatchSize = 500;
  for (let i = 0; i < supportTicketsData.length; i += ticketBatchSize) {
    const batch = supportTicketsData.slice(i, i + ticketBatchSize);
    await db.insert(schema.crmSupportTickets).values(
      batch.map((t) => ({ ...t, orgId }))
    );
  }
  const monthlyMetricsData = [
    { month: "Aug", revenue: "320000", mqls: 520, retention: "91.2", csat: "4.2", ticketVolume: 68 },
    { month: "Sep", revenue: "410000", mqls: 610, retention: "92.0", csat: "4.3", ticketVolume: 75 },
    { month: "Oct", revenue: "380000", mqls: 580, retention: "91.8", csat: "4.3", ticketVolume: 84 },
    { month: "Nov", revenue: "520000", mqls: 720, retention: "93.1", csat: "4.5", ticketVolume: 72 },
    { month: "Dec", revenue: "470000", mqls: 690, retention: "92.5", csat: "4.4", ticketVolume: 65 },
    { month: "Jan", revenue: "560000", mqls: 780, retention: "93.4", csat: "4.5", ticketVolume: 78 },
    { month: "Feb", revenue: "610000", mqls: 892, retention: "93.6", csat: "4.6", ticketVolume: 82 },
  ];

  await db.insert(schema.crmMonthlyMetrics).values(
    monthlyMetricsData.map((m) => ({ ...m, orgId }))
  );
  const teamPerformanceData = [
    { personId: sarah.id, month: "Aug", value: "120000" },
    { personId: sarah.id, month: "Sep", value: "185000" },
    { personId: sarah.id, month: "Oct", value: "145000" },
    { personId: sarah.id, month: "Nov", value: "210000" },
    { personId: sarah.id, month: "Dec", value: "195000" },
    { personId: sarah.id, month: "Jan", value: "220000" },
    { personId: sarah.id, month: "Feb", value: "205000" },
    { personId: jason.id, month: "Aug", value: "95000" },
    { personId: jason.id, month: "Sep", value: "140000" },
    { personId: jason.id, month: "Oct", value: "130000" },
    { personId: jason.id, month: "Nov", value: "165000" },
    { personId: jason.id, month: "Dec", value: "150000" },
    { personId: jason.id, month: "Jan", value: "170000" },
    { personId: jason.id, month: "Feb", value: "130000" },
    { personId: maria.id, month: "Aug", value: "75000" },
    { personId: maria.id, month: "Sep", value: "110000" },
    { personId: maria.id, month: "Oct", value: "125000" },
    { personId: maria.id, month: "Nov", value: "140000" },
    { personId: maria.id, month: "Dec", value: "120000" },
    { personId: maria.id, month: "Jan", value: "155000" },
    { personId: maria.id, month: "Feb", value: "145000" },
    { personId: alex.id, month: "Aug", value: "55000" },
    { personId: alex.id, month: "Sep", value: "78000" },
    { personId: alex.id, month: "Oct", value: "82000" },
    { personId: alex.id, month: "Nov", value: "105000" },
    { personId: alex.id, month: "Dec", value: "90000" },
    { personId: alex.id, month: "Jan", value: "110000" },
    { personId: alex.id, month: "Feb", value: "100000" },
    { personId: daniel.id, month: "Aug", value: "45000" },
    { personId: daniel.id, month: "Sep", value: "62000" },
    { personId: daniel.id, month: "Oct", value: "70000" },
    { personId: daniel.id, month: "Nov", value: "85000" },
    { personId: daniel.id, month: "Dec", value: "78000" },
    { personId: daniel.id, month: "Jan", value: "95000" },
    { personId: daniel.id, month: "Feb", value: "105000" },
    { personId: emma.id, month: "Aug", value: "3200000" },
    { personId: emma.id, month: "Sep", value: "3350000" },
    { personId: emma.id, month: "Oct", value: "3400000" },
    { personId: emma.id, month: "Nov", value: "3520000" },
    { personId: emma.id, month: "Dec", value: "3600000" },
    { personId: emma.id, month: "Jan", value: "3700000" },
    { personId: emma.id, month: "Feb", value: "3800000" },
    { personId: ryan.id, month: "Aug", value: "2100000" },
    { personId: ryan.id, month: "Sep", value: "2200000" },
    { personId: ryan.id, month: "Oct", value: "2280000" },
    { personId: ryan.id, month: "Nov", value: "2350000" },
    { personId: ryan.id, month: "Dec", value: "2420000" },
    { personId: ryan.id, month: "Jan", value: "2510000" },
    { personId: ryan.id, month: "Feb", value: "2600000" },
    { personId: lisa.id, month: "Aug", value: "1400000" },
    { personId: lisa.id, month: "Sep", value: "1480000" },
    { personId: lisa.id, month: "Oct", value: "1550000" },
    { personId: lisa.id, month: "Nov", value: "1620000" },
    { personId: lisa.id, month: "Dec", value: "1700000" },
    { personId: lisa.id, month: "Jan", value: "1800000" },
    { personId: lisa.id, month: "Feb", value: "1900000" },
  ];

  await db.insert(schema.crmTeamPerformance).values(
    teamPerformanceData.map((t) => ({ ...t, orgId }))
  );
  const teamMembersData = [
    { name: "Jane Doe", role: "Admin", access: "Full", avatar: "JD", status: "online" },
    { name: "John Smith", role: "Manager", access: "Edit", avatar: "JS", status: "online" },
    { name: "Robert Fox", role: "Agent", access: "View", avatar: "RF", status: "away" },
    { name: "Emily Chen", role: "Agent", access: "View", avatar: "EC", status: "online" },
    { name: "Michael Brown", role: "Lead", access: "Edit", avatar: "MB", status: "offline" },
  ];

  await db.insert(schema.crmSupportTeamMembers).values(
    teamMembersData.map((m) => ({ ...m, orgId }))
  );

  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
