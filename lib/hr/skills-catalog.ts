export interface CanonicalSkill {
  name: string;
  aliases: string[];
  category: string;
  related: string[];
}

export const SKILLS_CATALOG: CanonicalSkill[] = [
  { name: "JavaScript", aliases: ["js", "java script", "ecmascript"], category: "Languages", related: ["TypeScript", "React", "Node.js"] },
  { name: "TypeScript", aliases: ["ts", "type script"], category: "Languages", related: ["JavaScript", "React", "Node.js"] },
  { name: "Python", aliases: ["py", "python3"], category: "Languages", related: ["Django", "Flask", "Pandas"] },
  { name: "Java", aliases: ["core java", "java se"], category: "Languages", related: ["Spring", "Kotlin"] },
  { name: "Go", aliases: ["golang"], category: "Languages", related: ["Docker", "Kubernetes"] },
  { name: "C++", aliases: ["cpp", "cplusplus"], category: "Languages", related: ["C"] },
  { name: "C#", aliases: ["csharp", "c sharp"], category: "Languages", related: [".NET"] },
  { name: "PHP", aliases: [], category: "Languages", related: ["Laravel", "MySQL"] },
  { name: "Ruby", aliases: [], category: "Languages", related: ["Ruby on Rails"] },
  { name: "Rust", aliases: [], category: "Languages", related: [] },
  { name: "Kotlin", aliases: [], category: "Languages", related: ["Java", "Android"] },
  { name: "Swift", aliases: [], category: "Languages", related: ["iOS"] },
  { name: "SQL", aliases: ["structured query language"], category: "Data", related: ["PostgreSQL", "MySQL"] },

  { name: "React", aliases: ["react js", "reactjs", "react.js"], category: "Frontend", related: ["JavaScript", "TypeScript", "Next.js", "Redux"] },
  { name: "Next.js", aliases: ["next", "nextjs"], category: "Frontend", related: ["React", "TypeScript", "Vercel"] },
  { name: "Vue.js", aliases: ["vue", "vuejs"], category: "Frontend", related: ["JavaScript", "Nuxt.js"] },
  { name: "Angular", aliases: ["angularjs", "angular js"], category: "Frontend", related: ["TypeScript", "RxJS"] },
  { name: "Redux", aliases: [], category: "Frontend", related: ["React"] },
  { name: "HTML", aliases: ["html5"], category: "Frontend", related: ["CSS", "JavaScript"] },
  { name: "CSS", aliases: ["css3"], category: "Frontend", related: ["HTML", "Tailwind CSS", "SASS"] },
  { name: "Tailwind CSS", aliases: ["tailwind", "tailwindcss"], category: "Frontend", related: ["CSS", "React"] },
  { name: "SASS", aliases: ["scss"], category: "Frontend", related: ["CSS"] },

  { name: "Node.js", aliases: ["node", "nodejs", "node js"], category: "Backend", related: ["JavaScript", "Express", "TypeScript"] },
  { name: "Express", aliases: ["expressjs", "express js"], category: "Backend", related: ["Node.js"] },
  { name: "Django", aliases: [], category: "Backend", related: ["Python"] },
  { name: "Flask", aliases: [], category: "Backend", related: ["Python"] },
  { name: "Spring", aliases: ["spring boot", "springboot"], category: "Backend", related: ["Java"] },
  { name: "Ruby on Rails", aliases: ["rails", "ror"], category: "Backend", related: ["Ruby"] },
  { name: "Laravel", aliases: [], category: "Backend", related: ["PHP"] },
  { name: "GraphQL", aliases: ["graph ql"], category: "Backend", related: ["Node.js", "React"] },
  { name: "REST API", aliases: ["rest", "restful", "rest apis", "api"], category: "Backend", related: ["Node.js", "GraphQL"] },

  { name: "PostgreSQL", aliases: ["postgres", "postgre sql", "psql"], category: "Data", related: ["SQL"] },
  { name: "MySQL", aliases: ["my sql"], category: "Data", related: ["SQL"] },
  { name: "MongoDB", aliases: ["mongo"], category: "Data", related: ["Node.js"] },
  { name: "Redis", aliases: [], category: "Data", related: [] },
  { name: "Pandas", aliases: [], category: "Data", related: ["Python"] },
  { name: "Power BI", aliases: ["powerbi"], category: "Data", related: ["Tableau", "Excel"] },
  { name: "Tableau", aliases: [], category: "Data", related: ["Power BI", "Excel"] },

  { name: "AWS", aliases: ["amazon web services"], category: "Cloud / DevOps", related: ["Docker", "Kubernetes"] },
  { name: "Azure", aliases: ["microsoft azure"], category: "Cloud / DevOps", related: ["Docker"] },
  { name: "Google Cloud", aliases: ["gcp", "google cloud platform"], category: "Cloud / DevOps", related: ["Kubernetes"] },
  { name: "Docker", aliases: [], category: "Cloud / DevOps", related: ["Kubernetes", "AWS"] },
  { name: "Kubernetes", aliases: ["k8s"], category: "Cloud / DevOps", related: ["Docker", "AWS"] },
  { name: "CI/CD", aliases: ["cicd", "ci cd"], category: "Cloud / DevOps", related: ["Docker"] },

  { name: "Android", aliases: ["android development"], category: "Mobile", related: ["Kotlin", "Java"] },
  { name: "iOS", aliases: ["ios development"], category: "Mobile", related: ["Swift"] },
  { name: "React Native", aliases: ["reactnative", "react native"], category: "Mobile", related: ["React", "JavaScript"] },
  { name: "Flutter", aliases: [], category: "Mobile", related: ["Dart"] },

  { name: "Figma", aliases: [], category: "Design", related: ["UI/UX Design"] },
  { name: "UI/UX Design", aliases: ["ui ux", "uiux", "ui/ux", "ux", "ui design", "ux design"], category: "Design", related: ["Figma"] },
  { name: "Adobe Photoshop", aliases: ["photoshop", "ps"], category: "Design", related: ["Adobe Illustrator"] },
  { name: "Adobe Illustrator", aliases: ["illustrator"], category: "Design", related: ["Adobe Photoshop"] },
  { name: "Video Editing", aliases: ["video editor", "premiere pro"], category: "Design", related: ["After Effects"] },

  { name: "Excel", aliases: ["ms excel", "microsoft excel", "advanced excel"], category: "Finance", related: ["Financial Modelling", "Power BI"] },
  { name: "Financial Modelling", aliases: ["financial modeling", "fin modelling"], category: "Finance", related: ["Excel", "Valuation"] },
  { name: "Valuation", aliases: [], category: "Finance", related: ["Financial Modelling"] },
  { name: "Accounting", aliases: ["accountancy"], category: "Finance", related: ["Tally", "Taxation"] },
  { name: "Tally", aliases: ["tally erp", "tally prime"], category: "Finance", related: ["Accounting"] },
  { name: "Taxation", aliases: ["tax", "gst", "income tax"], category: "Finance", related: ["Accounting"] },
  { name: "Investment Analysis", aliases: ["investment", "equity research"], category: "Finance", related: ["Valuation", "Financial Modelling"] },

  { name: "Sales", aliases: ["b2b sales", "field sales", "inside sales"], category: "Business", related: ["CRM", "Negotiation"] },
  { name: "CRM", aliases: ["customer relationship management", "salesforce"], category: "Business", related: ["Sales"] },
  { name: "Digital Marketing", aliases: ["digital marketer"], category: "Marketing", related: ["SEO", "Content Writing"] },
  { name: "SEO", aliases: ["search engine optimization", "search engine optimisation"], category: "Marketing", related: ["Digital Marketing", "Content Writing"] },
  { name: "Content Writing", aliases: ["content writer", "copywriting", "copy writing"], category: "Marketing", related: ["SEO"] },
  { name: "Social Media Marketing", aliases: ["smm", "social media"], category: "Marketing", related: ["Digital Marketing"] },
  { name: "Project Management", aliases: ["pmp", "project manager"], category: "Business", related: ["Agile", "Scrum"] },
  { name: "Agile", aliases: ["agile methodology"], category: "Business", related: ["Scrum", "Project Management"] },
  { name: "Scrum", aliases: ["scrum master"], category: "Business", related: ["Agile"] },
];

export function normalizeSkill(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Max length for a single skill label stored or displayed. */
const SKILL_LABEL_MAX = 96;

/**
 * Filters obvious junk (empty, absurd length, no letters, odd characters) while
 * allowing common technical tokens (C++, C#, .NET, Node.js, etc.).
 */
export function isPlausibleSkillLabel(raw: string): boolean {
  const t = raw.trim();
  if (!t || t.length > SKILL_LABEL_MAX) return false;
  if (!/\p{L}/u.test(t)) return false;
  if (/^(.)\1{12,}$/u.test(t)) return false;
  return /^[\p{L}\p{N}\s+.#/\-–—&:,'′″°™®©()]+$/u.test(t);
}

const CANONICAL_BY_NORM = new Map<string, CanonicalSkill>();
for (const skill of SKILLS_CATALOG) {
  CANONICAL_BY_NORM.set(normalizeSkill(skill.name), skill);
  for (const alias of skill.aliases) {
    CANONICAL_BY_NORM.set(normalizeSkill(alias), skill);
  }
}

const RELATED_BY_NORM = new Map<string, string[]>();
for (const skill of SKILLS_CATALOG) {
  RELATED_BY_NORM.set(normalizeSkill(skill.name), skill.related);
}

function titleCaseSkill(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

export interface CanonicalResult {
  canonical: string;
  recognized: boolean;
  category: string | null;
}

export function canonicalizeSkill(raw: string): CanonicalResult | null {
  const norm = normalizeSkill(raw);
  if (!norm) return null;
  const hit = CANONICAL_BY_NORM.get(norm);
  if (hit) return { canonical: hit.name, recognized: true, category: hit.category };
  return { canonical: titleCaseSkill(raw), recognized: false, category: null };
}

export function isRecognizedSkill(raw: string): boolean {
  return CANONICAL_BY_NORM.has(normalizeSkill(raw));
}

export function getAcceptableNorms(rawQuery: string): string[] {
  const norm = normalizeSkill(rawQuery);
  if (!norm) return [];
  const set = new Set<string>([norm]);
  const hit = CANONICAL_BY_NORM.get(norm);
  if (hit) {
    set.add(normalizeSkill(hit.name));
    for (const alias of hit.aliases) set.add(normalizeSkill(alias));
  }
  return [...set];
}

export function skillMatchesQuery(rawSkill: string, rawQuery: string): boolean {
  const queryNorm = normalizeSkill(rawQuery);
  if (!queryNorm) return false;
  const queryCanon = canonicalizeSkill(rawQuery);
  const skillCanon = canonicalizeSkill(rawSkill);
  if (!skillCanon) return false;

  if (queryCanon?.recognized) {
    return skillCanon.recognized && normalizeSkill(skillCanon.canonical) === normalizeSkill(queryCanon.canonical);
  }
  return normalizeSkill(rawSkill).includes(queryNorm);
}

export function getRelatedSkills(canonicalName: string): string[] {
  return RELATED_BY_NORM.get(normalizeSkill(canonicalName)) ?? [];
}

export interface SkillSuggestion {
  skill: string;
  count: number;
  recognized: boolean;
  category: string | null;
}

export function buildSuggestions(
  orgSkills: { skill: string; count: number }[],
  rawQuery: string,
  limit = 10
): SkillSuggestion[] {
  const merged = new Map<string, SkillSuggestion>();
  for (const { skill, count } of orgSkills) {
    if (!isPlausibleSkillLabel(skill)) continue;
    const canon = canonicalizeSkill(skill);
    if (!canon) continue;
    const key = normalizeSkill(canon.canonical);
    const existing = merged.get(key);
    if (existing) {
      existing.count += count;
    } else {
      merged.set(key, {
        skill: canon.canonical,
        count,
        recognized: canon.recognized,
        category: canon.category,
      });
    }
  }

  const queryNorm = normalizeSkill(rawQuery);
  let list = [...merged.values()];
  if (queryNorm) {
    const acceptable = new Set(getAcceptableNorms(rawQuery));
    list = list.filter((s) => {
      const sNorm = normalizeSkill(s.skill);
      return (
        sNorm.startsWith(queryNorm) ||
        acceptable.has(sNorm) ||
        (queryNorm.length >= 3 && sNorm.includes(queryNorm))
      );
    });
  }
  return list.sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill)).slice(0, limit);
}
