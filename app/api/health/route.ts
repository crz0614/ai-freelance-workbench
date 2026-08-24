import { storageInfo } from "@/lib/store";
export const runtime="nodejs";
export function GET(){try{return Response.json({ok:true,storage:storageInfo()})}catch(error){return Response.json({ok:false,error:error instanceof Error?error.message:"storage unavailable"},{status:503})}}
