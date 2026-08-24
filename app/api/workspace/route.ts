import { listWorkspace,updateWorkspace,type WorkspaceStage } from "@/lib/store";
export const runtime="nodejs";
const stages=new Set<WorkspaceStage>(["saved","pipeline","applied","archived"]);
export function GET(){return Response.json({items:listWorkspace()},{headers:{"Cache-Control":"no-store"}})}
export async function PUT(request:Request){const body=await request.json().catch(()=>({})) as{opportunityId?:string;stage?:WorkspaceStage;note?:string;draft?:string};if(!body.opportunityId||!body.stage||!stages.has(body.stage))return Response.json({error:"opportunityId and a valid stage are required"},{status:400});if((body.note?.length||0)>5000||(body.draft?.length||0)>20000)return Response.json({error:"note or draft is too large"},{status:413});const result=updateWorkspace({opportunityId:body.opportunityId,stage:body.stage,note:body.note,draft:body.draft});return Response.json(result??{error:"opportunity not found; refresh live opportunities first"},{status:result?200:404})}
