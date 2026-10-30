import { guard } from '@/lib/http.mjs';
import { resolveAllowedWorkspace } from '@/lib/paths.mjs';
import { getNativeSessionSync } from '@/lib/native-session-sync.mjs';
export const runtime='nodejs';
export async function GET(req:Request){const denied=guard(req);if(denied)return denied;const workspace=resolveAllowedWorkspace(process.env.DEFAULT_PROJECT_PATH||'');return Response.json({threads:getNativeSessionSync(workspace).list()},{headers:{'Cache-Control':'no-store'}});}
