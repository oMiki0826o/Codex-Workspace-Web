import { guard } from '@/lib/http.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
export const runtime='nodejs';
export async function GET(req:Request){const denied=guard(req);if(denied)return denied;
 try{const {stdout}=await promisify(execFile)(process.env.CODEX_CLOUD_BIN||'codex-cloud',['--version'],{timeout:4000,maxBuffer:50000});return Response.json({connected:true,version:stdout.trim(),appServer:true});}
 catch{return Response.json({connected:false,version:'Codex CLI 未安裝或無法執行'});}
}
