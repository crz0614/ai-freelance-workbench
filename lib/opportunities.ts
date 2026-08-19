export type OpportunityStatus = "verified-open" | "needs-review";

export type Opportunity = {
  id: string; company: string; role: string; source: string; sourceUrl: string;
  location: string; type: string; budget: string; budgetMinUsd: number | null;
  match: number; publishedAt: string; verifiedAt: string; expiresAt?: string;
  skills: string[]; summary: string; deliverable: string; competition: number | null;
  status: OpportunityStatus; trustSignals: string[]; risks: string[];
};

const aliases: Record<string, string[]> = {
  Python: ["python", "django", "fastapi"], Rust: ["rust", "cargo"], Go: ["golang", " go "],
  "C++": ["c++", "cpp"], TypeScript: ["typescript", "next.js", "nextjs"],
  JavaScript: ["javascript", "node.js", "nodejs"], React: ["react"],
  LLM: ["llm", "rag", "openai", "anthropic"], Backend: ["backend", "server-side"],
  Frontend: ["frontend", "front-end", "landing page"], WordPress: ["wordpress", "woocommerce"],
  Kubernetes: ["kubernetes", "k8s"], Docker: ["docker"],
  API: [" api", "integration", "webhook"], Automation: ["automation", "scraper", "workflow"],
  Security: ["security", "vulnerability"],
};

export function clean(value = "") {
  return value.replace(/<br\s*\/?\s*>|<\/(?:p|div|li)>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"').replace(/\s+/g, " ").trim();
}

export function skillsFor(value: string) {
  const input = ` ${value.toLowerCase()} `;
  return Object.entries(aliases).filter(([, words]) => words.some((word) => input.includes(word)))
    .map(([name]) => name).slice(0, 5);
}

export function budgetFor(value: string) {
  return value.match(/(?:US\$|\$|USD\s?)\s?\d[\d,]*(?:\.\d+)?(?:k)?(?:\s?[-–—]\s?(?:US\$|\$|USD\s?)?\s?\d[\d,]*(?:\.\d+)?(?:k)?)?(?:\s?(?:\/|per)\s?(?:h|hr|hour|project|milestone))?/i)?.[0] || "";
}

export function budgetMinUsd(value: string) {
  const match = budgetFor(value).match(/\d[\d,]*(?:\.\d+)?(?:k)?/i)?.[0];
  if (!match) return null;
  return Number(match.replace(/[,k]/gi, "")) * (/k$/i.test(match) ? 1000 : 1);
}

export function isCashBudget(value: string) {
  return /(?:US\$|\$|USD\s?)\s?\d/i.test(value) && !/(?:USDT|USDC|BTC|ETH|SOL|XMR|token|crypto|points?|credits?)/i.test(value);
}

export function ageInDays(date: string) { return (Date.now() - new Date(date).getTime()) / 86_400_000; }

export function score(value: string, publishedAt: string, competition: number | null, priced: boolean) {
  const age = ageInDays(publishedAt);
  const freshness = age < 2 ? 18 : age < 7 ? 13 : age < 21 ? 8 : 2;
  const competitionScore = competition === null ? 0 : competition === 0 ? 12 : competition <= 2 ? 7 : -12;
  return Math.max(0, Math.min(96, 42 + skillsFor(value).length * 5 + freshness + competitionScore + (priced ? 10 : 0)));
}

export function filterOpportunities(items: Opportunity[], query: string, source: string, minMatch = 0) {
  const q = query.trim().toLowerCase();
  return items.filter((item) => (source === "All sources" || item.source === source) && item.match >= minMatch &&
    (!q || `${item.role} ${item.company} ${item.skills.join(" ")} ${item.deliverable}`.toLowerCase().includes(q)));
}
