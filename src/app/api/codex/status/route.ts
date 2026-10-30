import { guard } from '@/lib/http.mjs';
import { getCodexStatus } from '@/lib/codex-status.mjs';
export const runtime='nodejs';
export async function GET(req:Request){const denied=guard(req);if(denied)return denied;return Response.json(await getCodexStatus(),{headers:{'Cache-Control':'no-store'}});}
