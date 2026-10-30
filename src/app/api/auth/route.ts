import { validOrigin } from '@/lib/auth.mjs';
import { error } from '@/lib/http.mjs';
export const runtime='nodejs';
export async function GET(){return Response.json({authenticated:true,configured:true});}
export async function POST(request:Request){
 if(!validOrigin(request))return error('來源驗證失敗',403);
 return Response.json({ok:true});
}
export async function DELETE(request:Request){if(!validOrigin(request))return error('來源驗證失敗',403);return Response.json({ok:true});}
