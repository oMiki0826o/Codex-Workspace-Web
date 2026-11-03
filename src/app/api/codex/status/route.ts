import { guard } from '@/lib/http.mjs';
import { getCodexStatus } from '@/lib/codex-status.mjs';
import { listModels } from '@/lib/model-registry.mjs';
export const runtime='nodejs';
export async function GET(req:Request){const denied=guard(req);if(denied)return denied;const [status,registry]=await Promise.all([getCodexStatus().catch(()=>({models:[],defaultModel:'',defaultEffort:'',usageWindows:[]})),listModels().catch(()=>({models:[],availability:{cloud:false,qwen:false}}))]);return Response.json({...status,models:registry.models,modelAvailability:registry.availability},{headers:{'Cache-Control':'no-store'}});}
