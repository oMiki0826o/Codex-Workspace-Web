import { getStore } from '@/lib/store.mjs';
import { ensureDefaultProject } from '@/lib/default-project.mjs';
import { guard, error } from '@/lib/http.mjs';
export const runtime='nodejs';
export async function GET(req:Request){const denied=guard(req);if(denied)return denied;const store=getStore();try{const project=ensureDefaultProject(store);return Response.json({projects:project?[project]:[]});}catch(e){return error(e instanceof Error?e.message:'無法載入預設工作區',500);}}
export async function POST(req:Request){const denied=guard(req,true);if(denied)return denied;return error('此網站使用固定工作區，不能新增其他專案',403);}
