"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { filterOpportunities, type Opportunity } from "@/lib/opportunities";

type View = "Discover" | "Pipeline" | "AI Studio" | "Automations" | "Docs";
type Stage = "saved" | "pipeline" | "applied" | "archived";
type Source = { name: string; ok: boolean; count: number; rejected: number; error?: string };
type Api = {
  opportunities: Opportunity[];
  sources: Source[];
  fetchedAt: string;
  rules: {
    maxListingAgeDays: number;
    maxDirectProjectAgeDays: number;
    minimumFixedPriceUsd: number;
    maximumMarketplaceProposals: number;
    cashOnly: boolean;
    removeFinished: boolean;
    maxVisibleBountyCompetition: number;
  };
};
type WorkspaceItem = {
  opportunityId: string;
  stage: Stage;
  note: string;
  draft: string;
  updatedAt: string;
  opportunity: Opportunity;
  sourceStillActive: boolean;
};

const nav: View[] = ["Discover", "Pipeline", "AI Studio", "Automations", "Docs"];

export default function Home() {
  const [data, setData] = useState<Api | null>(null);
  const [workspace, setWorkspace] = useState<Record<string, WorkspaceItem>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [view, setView] = useState<View>("Discover");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("All sources");
  const [minMatch, setMinMatch] = useState(0);
  const [filters, setFilters] = useState(false);
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [draftEditor, setDraftEditor] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const opportunitiesResponse = await fetch(`/api/opportunities?t=${Date.now()}`, { cache: "no-store" });
      if (!opportunitiesResponse.ok) throw new Error(`Opportunity API returned HTTP ${opportunitiesResponse.status}`);
      const next = (await opportunitiesResponse.json()) as Api;
      setData(next);
      setSelected((current) => next.opportunities.find((item) => item.id === current?.id) || next.opportunities[0] || current);

      const workspaceResponse = await fetch("/api/workspace", { cache: "no-store" });
      if (!workspaceResponse.ok) throw new Error(`Workspace API returned HTTP ${workspaceResponse.status}`);
      const workspaceData = (await workspaceResponse.json()) as { items: WorkspaceItem[] };
      setWorkspace(Object.fromEntries(workspaceData.items.map((item) => [item.opportunityId, item])));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Live refresh failed");
    }
  }, []);

  useEffect(() => {
    const initial = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), 300000);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [load]);

  const rows = useMemo(
    () => filterOpportunities(data?.opportunities || [], query, source, minMatch),
    [data, query, source, minMatch],
  );
  const pipelineRows = useMemo(
    () => Object.values(workspace).filter((item) => item.stage === "pipeline" || item.stage === "applied")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [workspace],
  );
  const savedCount = Object.values(workspace).filter((item) => item.stage === "saved").length;

  async function writeWorkspace(opportunity: Opportunity, stage: Stage, draft?: string, note?: string) {
    setBusy(opportunity.id);
    setNotice("");
    try {
      const existing = workspace[opportunity.id];
      const response = await fetch("/api/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: opportunity.id,
          stage,
          draft: draft ?? existing?.draft ?? "",
          note: note ?? existing?.note ?? "",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Workspace API returned HTTP ${response.status}`);
      const item: WorkspaceItem = {
        ...existing,
        ...result,
        opportunityId: opportunity.id,
        stage,
        opportunity: existing?.opportunity || opportunity,
        sourceStillActive: existing?.sourceStillActive ?? true,
      };
      setWorkspace((current) => ({ ...current, [opportunity.id]: item }));
      return item;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Workspace update failed");
      return null;
    } finally {
      setBusy("");
    }
  }

  async function makeDraft(opportunity: Opportunity) {
    const draft = `Hello,\n\nI’m interested in ${opportunity.role}. The brief overlaps with ${opportunity.skills.join(", ") || "my backend and automation experience"}. Before starting, I would confirm the scope, acceptance criteria, milestone payment protection and published compensation.\n\nBest regards`;
    const item = await writeWorkspace(opportunity, "pipeline", draft);
    if (!item) return;
    setSelected(opportunity);
    setDraftEditor(draft);
    setView("AI Studio");
    setNotice("Draft created and saved on the server");
  }

  function openDraft(item: WorkspaceItem) {
    setSelected(item.opportunity);
    setDraftEditor(item.draft);
    setNotice("");
    setView("AI Studio");
  }

  const selectedWorkspace = selected ? workspace[selected.id] : undefined;
  const currentDraft = selectedWorkspace?.draft || "";

  return <main>
    <aside className="rail">
      <div className="mark">F<span>O</span></div>
      <nav>{nav.map((item, index) => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>
        <span className="icon">{["⌁", "◫", "✦", "⌘", "?"][index]}</span>{item}
        {item === "Pipeline" && pipelineRows.length > 0 && <b>{pipelineRows.length}</b>}
      </button>)}</nav>
      <div className="rail-bottom"><div className="avatar">LIVE</div><div><strong>Live verification</strong><small>Refreshes every 5 min</small></div></div>
    </aside>

    <section className="workspace">
      <header><div><p className="eyebrow">{view.toUpperCase()}</p><h1>{view === "Discover" ? "Open cash projects. Verified now." : view}</h1>
        <p>{view === "Discover" ? "Finished, filled, unpriced, unsafe and stale listings are removed before display." : "Workspace actions persist through the server API."}</p></div>
        <button className="filter" onClick={() => void load()} disabled={Boolean(busy)}>↻ Refresh live data</button>
      </header>
      {error && <div className="positioning status-message">{error}</div>}

      {view === "Discover" && <>
        <div className="metrics">
          <article><small>QUALIFIED NOW</small><b>{data?.opportunities.length ?? "—"}</b><em>cash and current</em></article>
          <article><small>HEALTHY SOURCES</small><b>{data?.sources.filter((item) => item.ok).length ?? "—"}</b><em>of {data?.sources.length ?? 0}</em></article>
          <article><small>REMOVED</small><b>{data?.sources.reduce((sum, item) => sum + item.rejected, 0) ?? "—"}</b><em>stale / filled / unsafe</em></article>
          <article><small>LAST VERIFIED</small><b>{data ? new Date(data.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</b><em>auto-refresh 5 min</em></article>
          <article><small>SAVED</small><b>{savedCount}</b><em>server workspace</em></article>
        </div>
        <div className="toolbar"><label>⌕<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search current projects, repositories or skills…" /></label>
          <select value={source} onChange={(event) => setSource(event.target.value)}><option>All sources</option>{data?.sources.map((item) => <option key={item.name}>{item.name}</option>)}</select>
          <button className="filter" onClick={() => setFilters((value) => !value)}>⚙ Filters</button></div>
        {filters && <div className="positioning"><b>Minimum match: {minMatch}%</b><input type="range" min="0" max="95" step="5" value={minMatch} onChange={(event) => setMinMatch(Number(event.target.value))} /></div>}
        <div className="content"><section className="list"><div className="list-title"><b>{rows.length} qualified opportunities</b><span>{data?.sources.map((item) => `${item.name}: ${item.ok ? `${item.count} kept / ${item.rejected} removed` : "source failed"}`).join(" · ")}</span></div>
          {!data && !error && <div className="positioning">Rechecking public sources…</div>}
          {data && rows.length === 0 && <div className="positioning">No qualified open cash opportunities right now. Finished and stale records are not retained.</div>}
          {rows.map((item) => <article key={item.id} className={`job ${selected?.id === item.id ? "selected" : ""}`} onClick={() => setSelected(item)}>
            <i className="company">{item.company[0]?.toUpperCase()}</i><div className="job-main"><div><small>{item.company}</small><h2>{item.role}</h2></div><p>{item.summary}</p>
              <div className="chips"><span>{item.status === "verified-open" ? "OPEN VERIFIED" : "CLIENT CHECK"}</span>{item.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
              <footer><span>{item.source}</span><span>{new Date(item.publishedAt).toLocaleDateString()}</span><span>{item.competition === null ? "Competition unknown" : `${item.competition} visible signals`}</span></footer></div>
            <div className="job-side"><button aria-label={workspace[item.id]?.stage === "saved" ? "Archive saved opportunity" : "Save opportunity"} disabled={busy === item.id} onClick={(event) => { event.stopPropagation(); void writeWorkspace(item, workspace[item.id]?.stage === "saved" ? "archived" : "saved"); }}>{workspace[item.id]?.stage === "saved" ? "★" : "☆"}</button><strong>{item.match}%</strong><small>priority</small><b>{item.budget}</b></div>
          </article>)}</section>
          <Inspector item={selected} inPipeline={selectedWorkspace?.stage === "pipeline" || selectedWorkspace?.stage === "applied"} busy={busy === selected?.id} onPipeline={() => selected && void writeWorkspace(selected, selectedWorkspace?.stage === "pipeline" ? "archived" : "pipeline")} onDraft={() => selected && void makeDraft(selected)} />
        </div>
      </>}

      {view === "Pipeline" && <section className="list page-list"><div className="list-title"><b>{pipelineRows.length} tracked opportunities</b><span>Persisted by /api/workspace</span></div>
        {pipelineRows.length ? pipelineRows.map((item) => <article className="job" key={item.opportunityId}><i className="company">{item.opportunity.company[0]}</i><div className="job-main"><h2>{item.opportunity.role}</h2><p>{item.opportunity.company} · {item.opportunity.source}</p>
          <div className="chips"><span>{item.stage.toUpperCase()}</span>{!item.sourceStillActive && <span>INACTIVE SOURCE</span>}</div><a href={item.opportunity.sourceUrl} target="_blank" rel="noreferrer">Open original source ↗</a></div>
          <div className="job-side actions"><button disabled={busy === item.opportunityId} onClick={() => void writeWorkspace(item.opportunity, item.stage === "applied" ? "pipeline" : "applied")}>{item.stage === "applied" ? "Undo applied" : "Mark applied"}</button><button disabled={busy === item.opportunityId} onClick={() => void writeWorkspace(item.opportunity, "archived")}>Archive</button><button onClick={() => item.draft ? openDraft(item) : void makeDraft(item.opportunity)}>{item.draft ? "Edit draft" : "Draft"}</button></div>
        </article>) : <div className="positioning">Pipeline is empty. Add a live opportunity from Discover.</div>}
      </section>}

      {view === "AI Studio" && <section className="inspector studio"><h2>Proposal workspace</h2>
        {selected && currentDraft ? <><p>Draft for <b>{selected.role}</b>. It is based only on the public brief and contains no invented résumé claims.</p>
          <textarea value={draftEditor || currentDraft} onChange={(event) => setDraftEditor(event.target.value)} />
          <button className="primary" disabled={busy === selected.id} onClick={async () => { const saved = await writeWorkspace(selected, selectedWorkspace?.stage === "applied" ? "applied" : "pipeline", draftEditor || currentDraft); if (saved) setNotice("Draft saved on the server"); }}>Save draft</button>
          <button className="secondary" onClick={async () => { await navigator.clipboard.writeText(draftEditor || currentDraft); setNotice("Copied to clipboard"); }}>Copy draft</button>
          {notice && <p className="safety">{notice}</p>}<a className="secondary button-link" href={selected.sourceUrl} target="_blank" rel="noreferrer">Verify against original source ↗</a></> : <p>Create a draft from a live opportunity in Discover or Pipeline.</p>}
      </section>}

      {view === "Automations" && <section className="inspector studio"><h2>Implemented automation</h2><p>The browser refreshes qualified sources every five minutes. Each refresh rechecks source status, removes unsafe or stale results and updates active snapshot flags.</p>
        <ul className="reasons"><li><i>✓</i><span><b>Live collectors</b><span>Current sources, budgets and competition signals are re-evaluated.</span></span></li><li><i>✓</i><span><b>Durable review state</b><span>Pipeline stages and drafts are written through the workspace API.</span></span></li><li><i>✓</i><span><b>Human approval boundary</b><span>No external application, email or payment action is automated.</span></span></li></ul>
      </section>}

      {view === "Docs" && <section className="inspector studio"><h2>Live qualification rules</h2><h3>Data truth</h3><p>The API re-fetches public sources and stores only snapshots that passed current qualification. Empty or failed sources are never replaced with invented records.</p><h3>Workspace truth</h3><p>Saved, pipeline, applied and archived stages plus proposal drafts persist through SQLite in self-hosted deployments. A disappeared source is marked inactive.</p><h3>Payment safety</h3><p>Always confirm scope, acceptance criteria and milestone escrow before work. External submission remains a deliberate human action.</p><a className="secondary button-link" href="https://github.com/crz0614/ai-freelance-workbench" target="_blank" rel="noreferrer">Read source and architecture ↗</a></section>}
    </section>
  </main>;
}

function Inspector({ item, inPipeline, busy, onPipeline, onDraft }: { item: Opportunity | null; inPipeline: boolean; busy: boolean; onPipeline: () => void; onDraft: () => void }) {
  return <aside className="inspector">{item ? <><div className="score"><div><span>{item.match}</span><small>/100</small></div><p><b>Action priority</b><span>Cash, freshness, skill overlap and visible competition.</span></p></div><h3>Live qualification</h3>
    <ul className="reasons"><li><i>✓</i><span><b>Status</b><span>{item.status === "verified-open" ? "Open and source-verified" : "Open; client/escrow review required"}</span></span></li><li><i>✓</i><span><b>Compensation</b><span>{item.budget}</span></span></li><li><i>✓</i><span><b>Deliverable</b><span>{item.deliverable}</span></span></li><li><i>✓</i><span><b>Competition</b><span>{item.competition === null ? "Not publicly available" : `${item.competition} visible signal(s)`}</span></span></li><li><i>✓</i><span><b>Verified</b><span>{new Date(item.verifiedAt).toLocaleString()}</span></span></li></ul>
    {item.risks.length > 0 && <><h3>Check before applying</h3><ul className="reasons">{item.risks.map((risk) => <li key={risk}><i>!</i><span>{risk}</span></li>)}</ul></>}
    <button className="primary" disabled={busy} onClick={onPipeline}>{inPipeline ? "Archive from pipeline" : "Add to pipeline"}</button><button className="secondary" disabled={busy} onClick={onDraft}>Create factual draft</button><a className="secondary button-link" href={item.sourceUrl} target="_blank" rel="noreferrer">Open original listing ↗</a></> : <p>Select a live opportunity.</p>}</aside>;
}
