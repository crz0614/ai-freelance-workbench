import { ageInDays, budgetFor, budgetMinUsd, clean, isCashBudget, score, skillsFor, type Opportunity } from "@/lib/opportunities";

type Health = { name: string; ok: boolean; count: number; rejected: number; error?: string };
type CollectorResult = { items: Opportunity[]; rejected: number };
const MAX_LISTING_AGE_DAYS = 30;
const MIN_FIXED_PRICE_USD = 25;
const verifiedAt = () => new Date().toISOString();

function isTechnical(value: string) {
  return /\b(website|landing page|web app|mobile app|developer|engineer|software|backend|frontend|full.?stack|wordpress|shopify|api|integration|automation|script|devops|cloud|AI|machine learning|data(?:base| engineering| pipeline)?|plugin|bug fix)\b/i.test(value);
}
function isTechnicalTitle(value: string) {
  return /(website|landing page|web app|mobile app|developer|engineer|software|backend|frontend|full.?stack|wordpress|shopify|api|integration|automation|script|devops|cloud|machine learning|data engineer|plugin|bug fix)/i.test(value);
}
function isFinished(value: string) {
  return /(position (?:has been )?filled|hired someone|no longer (?:accepting|available)|applications? closed|project closed|bounty rewarded|already (?:fixed|completed|awarded)|winner selected|work has been completed)/i.test(value);
}
function isUnsafe(value: string) {
  return /(unpaid|free trial|deposit required|pay (?:a |the )?fee|buy (?:my|our) course|telegram only|whatsapp only|crypto|USDT|USDC|BTC|ETH|SOL|XMR|token reward|points? reward|like and share|upvote|reveal.*prompt|system prompt|credential|seed phrase)/i.test(value);
}
async function json(url: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "FreelanceOpportunityWorkbench/2.0", Accept: "application/json", ...(init.headers || {}) } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
async function text(url: string) {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "FreelanceOpportunityWorkbench/2.0", Accept: "application/rss+xml, application/xml, text/xml" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function remotive(): Promise<CollectorResult> {
  const data = (await json("https://remotive.com/api/remote-jobs?category=software-dev&limit=100")) as any;
  let rejected = 0; const items: Opportunity[] = [];
  for (const x of data.jobs || []) {
    const body = clean(x.description || ""); const all = `${x.title || ""} ${body}`;
    const publishedAt = x.publication_date; const budget = x.salary || budgetFor(body);
    if (ageInDays(publishedAt) > MAX_LISTING_AGE_DAYS || !/(contract|freelance|part.?time|temporary)/i.test(x.job_type || "") || !isTechnicalTitle(x.title || "") || !isCashBudget(budget) || isFinished(all) || isUnsafe(all)) { rejected++; continue; }
    items.push({ id: `remotive-${x.id}`, company: x.company_name, role: x.title, source: "Remotive contracts", sourceUrl: x.url,
      location: x.candidate_required_location || "Remote", type: x.job_type || "Contract", budget, budgetMinUsd: budgetMinUsd(budget),
      match: score(all, publishedAt, null, true), publishedAt, verifiedAt: verifiedAt(), skills: skillsFor(all), summary: body.slice(0, 260),
      deliverable: "Contract deliverables must be confirmed with the client", competition: null, status: "verified-open",
      trustSignals: ["Live source response", "Published cash compensation", "Remote contract"], risks: ["Applicant count is not public"] });
  }
  return { items: items.slice(0, 20), rejected };
}

async function github(): Promise<CollectorResult> {
  const since = new Date(Date.now() - MAX_LISTING_AGE_DAYS * 86_400_000).toISOString().slice(0, 10);
  const queries = [`is:issue is:open no:assignee label:bounty created:>=${since}`, `is:issue is:open no:assignee "paid bounty" created:>=${since}`, `is:issue is:open no:assignee "cash reward" created:>=${since}`];
  const auth: Record<string, string> = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
  const pages = await Promise.all(queries.map((query) => json(`https://api.github.com/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=30`, { headers: auth })));
  const unique = new Map<number, any>(); pages.flatMap((page: any) => page.items || []).forEach((item: any) => unique.set(item.id, item));
  let rejected = 0; const items: Opportunity[] = [];
  for (const x of [...unique.values()].slice(0, 25)) {
    const body = clean(x.body || ""); const all = `${x.title} ${body} ${(x.labels || []).map((label: any) => label.name).join(" ")}`;
    const repoPath = new URL(x.repository_url).pathname.split("/repos/")[1]; const budget = budgetFor(all); const minimum = budgetMinUsd(budget);
    if (x.pull_request || ageInDays(x.created_at) > MAX_LISTING_AGE_DAYS || ageInDays(x.updated_at) > 14 || !isTechnical(all) || !isCashBudget(budget) || minimum === null || minimum < MIN_FIXED_PRICE_USD || isFinished(all) || isUnsafe(all) || /reward\s*=\s*0|BountyScout|scan results|bounty alert|mirrored from|security exploit|frantic bounty|slots? available|worker price/i.test(all)) { rejected++; continue; }
    let repo: any;
    try { repo = await json(x.repository_url, { headers: auth }); } catch { rejected++; continue; }
    if (repo.archived || repo.disabled || repo.fork || repo.stargazers_count < 5 || ageInDays(repo.pushed_at) > 30 || ageInDays(repo.created_at) < 60) { rejected++; continue; }
    let competition = 0;
    try {
      const comments = (await json(`${x.comments_url}?per_page=100`, { headers: auth })) as any[];
      const joined = comments.map((comment) => clean(comment.body || "")).join(" ");
      if (isFinished(joined)) { rejected++; continue; }
      const competitors = new Set<string>(); comments.forEach((comment) => { if (/(\/attempt|\/claim|i(?:'| a)m working on|opened (?:a )?pr|pull request)/i.test(comment.body || "")) competitors.add(comment.user?.login || String(comment.id)); });
      competition = competitors.size;
    } catch { rejected++; continue; }
    if (competition >= 3) { rejected++; continue; }
    items.push({ id: `github-${x.id}`, company: repoPath, role: clean(x.title), source: "GitHub cash bounty", sourceUrl: x.html_url,
      location: "Remote / open source", type: "Outcome-based bounty", budget, budgetMinUsd: budgetMinUsd(budget), match: score(all, x.created_at, competition, true),
      publishedAt: x.created_at, verifiedAt: verifiedAt(), skills: skillsFor(all), summary: body.slice(0, 260),
      deliverable: "Mergeable implementation satisfying the issue acceptance criteria", competition, status: "verified-open",
      trustSignals: ["Issue open now", "No assignee", "Cash amount published", "Recent repository activity", `${repo.stargazers_count} repository stars`],
      risks: competition ? [`${competition} visible claim/attempt signal(s)`] : ["Hidden work outside GitHub is still possible"] });
  }
  return { items: items.slice(0, 15), rejected };
}

async function redditForHire(): Promise<CollectorResult> {
  const data = (await json("https://www.reddit.com/r/forhire/new.json?limit=100&raw_json=1")) as any;
  let rejected = 0; const items: Opportunity[] = [];
  for (const entry of data?.data?.children || []) {
    const x = entry.data; const title = clean(x.title || ""); const body = clean(x.selftext || ""); const all = `${title} ${body}`;
    const publishedAt = new Date((x.created_utc || 0) * 1000).toISOString(); const budget = budgetFor(all);
    const hiring = /^\s*\[(?:hiring|task)\]/i.test(title) || /\b(?:hiring|looking for|need)\b/i.test(title);
    if (!hiring || x.removed_by_category || ageInDays(publishedAt) > 14 || !isTechnical(all) || !isCashBudget(budget) || isFinished(all) || isUnsafe(all) || /(commission only|equity only|revenue share)/i.test(all)) { rejected++; continue; }
    const competition = Number.isFinite(x.num_comments) ? x.num_comments : null;
    if (competition !== null && competition > 12) { rejected++; continue; }
    items.push({ id: `reddit-${x.id}`, company: x.author ? `u/${x.author}` : "Reddit client", role: title.replace(/^\s*\[[^\]]+\]\s*/i, ""),
      source: "Reddit r/forhire", sourceUrl: `https://www.reddit.com${x.permalink}`, location: "Remote", type: "Direct fixed-price project",
      budget, budgetMinUsd: budgetMinUsd(budget), match: score(all, publishedAt, competition, true), publishedAt, verifiedAt: verifiedAt(), skills: skillsFor(all),
      summary: body.slice(0, 260), deliverable: title, competition, status: "needs-review",
      trustSignals: ["Live public post", "Cash amount published", "Recent listing"],
      risks: ["Client identity and escrow must be verified before work", "Comment count is only a competition proxy"] });
  }
  return { items: items.slice(0, 20), rejected };
}

async function remoteOk(): Promise<CollectorResult> {
  const data = (await json("https://remoteok.com/api")) as any[];
  let rejected = 0; const items: Opportunity[] = [];
  for (const x of data.slice(1)) {
    const body = clean(x.description || ""); const all = `${x.position || ""} ${body} ${(x.tags || []).join(" ")}`;
    const publishedAt = x.date || new Date((x.epoch || 0) * 1000).toISOString();
    const budget = x.salary_min ? `$${Number(x.salary_min).toLocaleString()}${x.salary_max ? `–$${Number(x.salary_max).toLocaleString()}` : ""}` : budgetFor(all);
    if (ageInDays(publishedAt) > MAX_LISTING_AGE_DAYS || !/(contract|freelance|temporary|part.?time)/i.test(`${x.tags?.join(" ")} ${body}`) || !isTechnicalTitle(x.position || "") || !isCashBudget(budget) || isFinished(all) || isUnsafe(all)) { rejected++; continue; }
    items.push({ id: `remoteok-${x.id}`, company: x.company || "Remote client", role: x.position, source: "Remote OK contracts",
      sourceUrl: x.url?.startsWith("http") ? x.url : `https://remoteok.com${x.url}`, location: x.location || "Remote", type: "Remote contract",
      budget, budgetMinUsd: budgetMinUsd(budget), match: score(all, publishedAt, null, true), publishedAt, verifiedAt: verifiedAt(), skills: skillsFor(all),
      summary: body.slice(0, 260), deliverable: "Contract scope must be confirmed with the client", competition: null, status: "verified-open",
      trustSignals: ["Live public feed", "Published compensation", "Recent listing"], risks: ["Applicant count is not public"] });
  }
  return { items: items.slice(0, 20), rejected };
}

function xmlValue(item: string, tag: string) {
  return clean(item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1") || "");
}
async function freelancerProjects(): Promise<CollectorResult> {
  const feed = await text("https://www.freelancer.com/rss.xml");
  const records = feed.match(/<item>[\s\S]*?<\/item>/gi) || [];
  let rejected = 0; const items: Opportunity[] = [];
  for (const record of records) {
    const title = xmlValue(record, "title"); const summary = xmlValue(record, "description"); const all = `${title} ${summary}`;
    const sourceUrl = xmlValue(record, "link"); const published = new Date(xmlValue(record, "pubDate"));
    if (Number.isNaN(published.getTime())) { rejected++; continue; }
    const publishedAt = published.toISOString();
    const budget = budgetFor(all); const minimum = budgetMinUsd(budget);
    if (!sourceUrl || ageInDays(publishedAt) > 7 || !isTechnicalTitle(title) || !isCashBudget(budget) || minimum === null || minimum < MIN_FIXED_PRICE_USD || isFinished(all) || isUnsafe(all)) { rejected++; continue; }
    items.push({ id: `freelancer-${sourceUrl.split("/").filter(Boolean).pop()}`, company: "Freelancer marketplace client", role: title,
      source: "Freelancer project feed", sourceUrl, location: "Remote", type: "Marketplace fixed-price project", budget,
      budgetMinUsd: minimum, match: score(all, publishedAt, null, true), publishedAt, verifiedAt: verifiedAt(), skills: skillsFor(all),
      summary: summary.slice(0, 260), deliverable: title, competition: null, status: "needs-review",
      trustSignals: ["Live marketplace RSS", "Published cash budget", "Posted within 7 days"],
      risks: ["Bid count and client payment verification must be checked on the project page"] });
  }
  return { items: items.slice(0, 20), rejected };
}

export async function GET() {
  const collectors = [{ name: "GitHub cash bounty", run: github }, { name: "Freelancer project feed", run: freelancerProjects }, { name: "Reddit r/forhire", run: redditForHire }, { name: "Remotive contracts", run: remotive }, { name: "Remote OK contracts", run: remoteOk }];
  const settled = await Promise.allSettled(collectors.map((collector) => collector.run()));
  const sources: Health[] = settled.map((result, index) => result.status === "fulfilled"
    ? { name: collectors[index].name, ok: true, count: result.value.items.length, rejected: result.value.rejected }
    : { name: collectors[index].name, ok: false, count: 0, rejected: 0, error: result.reason instanceof Error ? result.reason.message : "fetch failed" });
  const opportunities = settled.flatMap((result) => result.status === "fulfilled" ? result.value.items : []);
  const unique = [...new Map(opportunities.map((item) => [item.sourceUrl, item])).values()]
    .filter((item) => ageInDays(item.publishedAt) <= MAX_LISTING_AGE_DAYS)
    .sort((a, b) => b.match - a.match || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return Response.json({ opportunities: unique, sources, fetchedAt: new Date().toISOString(),
    rules: { maxListingAgeDays: MAX_LISTING_AGE_DAYS, minimumFixedPriceUsd: MIN_FIXED_PRICE_USD, cashOnly: true, removeFinished: true, maxVisibleBountyCompetition: 2 }, mode: "live-verified-multi-source" },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache", Expires: "0" } });
}
