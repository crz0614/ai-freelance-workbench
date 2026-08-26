import { listWorkspaceActivity } from "@/lib/store";
export const runtime="nodejs";
export function GET(request:Request){try{const limit=Number(new URL(request.url).searchParams.get("limit")||50);return Response.json({events:listWorkspaceActivity(limit)},{headers:{"Cache-Control":"no-store"}})}catch(error){return Response.json({error:error instanceof Error?error.message:"activity unavailable"},{status:503,headers:{"Cache-Control":"no-store"}})}}
