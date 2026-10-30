import { guard,error } from '@/lib/http.mjs';
import { resolveAllowedWorkspace } from '@/lib/paths.mjs';
import { getNativeSessionSync } from '@/lib/native-session-sync.mjs';
export const runtime='nodejs';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){const denied=guard(req);if(denied)return denied;const {id}=await params;const workspace=resolveAllowedWorkspace(process.env.DEFAULT_PROJECT_PATH||'');const thread=getNativeSessionSync(workspace).read(id);return thread?Response.json({thread},{headers:{'Cache-Control':'no-store'}}):error('找不到工作區原生對話',404);}
