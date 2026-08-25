import { metricsSnapshot } from "@/lib/store";
export const runtime="nodejs";
export function GET(){try{const snapshot=metricsSnapshot(),lines=[
"# HELP freelance_workbench_storage_durable Whether workspace storage survives application restarts.",
"# TYPE freelance_workbench_storage_durable gauge",
`freelance_workbench_storage_durable ${snapshot.durable?1:0}`,
"# HELP freelance_workbench_opportunities Number of persisted opportunity snapshots by state.",
"# TYPE freelance_workbench_opportunities gauge",
`freelance_workbench_opportunities{state="active"} ${snapshot.opportunities.active}`,
`freelance_workbench_opportunities{state="inactive"} ${snapshot.opportunities.inactive}`,
`freelance_workbench_opportunities{state="total"} ${snapshot.opportunities.total}`,
"# HELP freelance_workbench_workspace_items Number of workspace items by review stage.",
"# TYPE freelance_workbench_workspace_items gauge",
...Object.entries(snapshot.workspace.stages).map(([stage,count])=>`freelance_workbench_workspace_items{stage="${stage}"} ${count}`),
`freelance_workbench_workspace_items{stage="total"} ${snapshot.workspace.total}`
];return new Response(lines.join("\n")+"\n",{headers:{"Content-Type":"text/plain; version=0.0.4; charset=utf-8","Cache-Control":"no-store"}})}catch{return new Response("# HELP freelance_workbench_metrics_error Whether metrics collection failed.\n# TYPE freelance_workbench_metrics_error gauge\nfreelance_workbench_metrics_error 1\n",{status:503,headers:{"Content-Type":"text/plain; version=0.0.4; charset=utf-8","Cache-Control":"no-store"}})}}
