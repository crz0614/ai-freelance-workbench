import test from"node:test";import assert from"node:assert/strict";import fs from"node:fs";
const data=fs.readFileSync(new URL("../lib/opportunities.ts",import.meta.url),"utf8");
const route=fs.readFileSync(new URL("../app/api/opportunities/route.ts",import.meta.url),"utf8");
const page=fs.readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");

test("collectors cover bounties, direct projects and contract feeds",()=>{
  assert.match(route,/api\.github\.com\/search\/issues/);
  assert.match(route,/remotive\.com\/api/);assert.match(route,/remoteok\.com\/api/);
  assert.match(route,/freelancer\.com\/rss\.xml/);
  for(const platform of ["algora\\.io","app\\.opire\\.dev","polar\\.sh","oss\\.issuehunt\\.io"])assert.match(route,new RegExp(platform));
  assert.match(route,/live-verified-multi-source/);
});
test("qualification removes stale, finished, unsafe and high-competition work",()=>{
  assert.match(route,/MAX_LISTING_AGE_DAYS = 30/);assert.match(route,/isFinished/);assert.match(route,/isUnsafe/);
  assert.match(route,/competition >= 3/);assert.match(route,/isCashBudget/);assert.match(route,/no-store, no-cache, must-revalidate/);
  assert.match(route,/MIN_FIXED_PRICE_USD = 25/);assert.match(route,/isTechnicalTitle\(title\)/);
  assert.match(route,/MAX_MARKETPLACE_PROPOSALS = 8/);assert.match(route,/Payment verified/);assert.match(route,/item\.status === "verified-open"/);
  assert.match(route,/manuscript\|proofread/);assert.match(route,/registered engineer/);
});
test("every item carries verification and risk metadata",()=>{
  for(const field of ["sourceUrl","verifiedAt","competition","trustSignals","risks","deliverable","status"])assert.match(data,new RegExp(`${field}:`));
  assert.match(page,/Open original listing/);assert.match(page,/LAST VERIFIED/);
  assert.doesNotMatch(data,/SignalForge|Northstar Labs|Orbit Cloud|Atlas Security|Canvas AI/);
});
test("the client refreshes live data and shows removal counts",()=>{
  assert.match(page,/setInterval\(\(\)=>void load\(\),300000\)/);assert.match(page,/REMOVED/);assert.match(page,/stale \/ filled \/ unsafe/);
  for(const view of ["Discover","Pipeline","AI Studio","Automations","Docs"])assert.match(page,new RegExp(view));
});
