export type AutofillItem = {
  Skill_Id: number;
  Skill_name: string;
  Type: boolean;
  majorMatch?: boolean;
};

export type AutofillDataset = {
  scope: "major" | "all";
  major: { id: number; name: string } | null;
  skills: AutofillItem[];
  competencies: AutofillItem[];
};

type LoadOpts = {
  scope: "major" | "all";
  majorName?: string; // required if scope=major
  forceRefresh?: boolean;
};

const cache = new Map<string, AutofillDataset>();

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

function cacheKey(opts: LoadOpts): string {
  const scope = opts.scope;
  const major = opts.majorName ? normalize(opts.majorName) : "";
  return `${scope}::${major}`;
}

function scoreName(name: string, query: string): number {
  const n = normalize(name);
  const q = normalize(query);
  if (!q) return 0;

  if (n === q) return 1000;

  let score = 0;
  if (n.startsWith(q)) score += 300;
  if (n.includes(q)) score += 200;

  const tokens = q.split(" ").filter(Boolean);
  let covered = 0;
  for (const t of tokens) if (n.includes(t)) covered++;
  score += covered * 60;

  const idx = n.indexOf(q);
  if (idx >= 0) score += Math.max(0, 80 - idx);

  score -= Math.max(0, n.length - 30) * 0.5;
  return score;
}

export async function loadAutofillDataset(
  opts: LoadOpts,
): Promise<AutofillDataset> {
  if (opts.scope === "major" && !opts.majorName?.trim()) {
    throw new Error("majorName is required when scope='major'");
  }

  const key = cacheKey(opts);
  if (!opts.forceRefresh && cache.has(key)) return cache.get(key)!;

  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  if (!API_BASE) throw new Error("Missing VITE_API_BASE_URL in frontend env");

  const params = new URLSearchParams();
  params.set("scope", opts.scope);
  if (opts.majorName?.trim()) params.set("major", opts.majorName.trim());

  const resp = await fetch(
    `${API_BASE}/api/autofill/skills-dataset?${params.toString()}`,
    {
      credentials: "include",
    },
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || `Failed to load autofill dataset (${resp.status})`);
  }

  const data: AutofillDataset = await resp.json();

  const normMajor = (arr: AutofillItem[]) =>
    arr.map((x) => ({ ...x, majorMatch: !!x.majorMatch }));

  const fixed: AutofillDataset = {
    ...data,
    skills: normMajor(data.skills),
    competencies: normMajor(data.competencies),
  };

  cache.set(key, fixed);
  return fixed;
}

export function searchAutofill(
  dataset: AutofillDataset,
  query: string,
  opts?: {
    limit?: number;
    type?: "skill" | "competency" | "both";
    majorOnly?: boolean;
  },
): AutofillItem[] {
  const limit = opts?.limit ?? 10;
  const type = opts?.type ?? "both";
  const majorOnly = opts?.majorOnly ?? false;

  const pool =
    type === "skill"
      ? dataset.skills
      : type === "competency"
        ? dataset.competencies
        : [...dataset.skills, ...dataset.competencies];

  const q = query.trim();
  if (!q) return pool.slice(0, limit);

  return pool
    .filter((it) => (majorOnly ? it.majorMatch === true : true))
    .map((item) => ({
      item,
      score: scoreName(item.Skill_name, q) + (item.majorMatch ? 25 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.item.Skill_name.localeCompare(b.item.Skill_name),
    )
    .slice(0, limit)
    .map((x) => x.item);
}

export function clearAutofillCache() {
  cache.clear();
}
