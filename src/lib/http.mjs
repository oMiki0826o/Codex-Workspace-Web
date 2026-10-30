import { authorized, validOrigin } from './auth.mjs';
export function error(message,status=400){return Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}});}
export function guard(request,write=false){if(!authorized(request))return error('請先登入',401);if(write&&!validOrigin(request))return error('來源驗證失敗',403);return null;}
export async function bodyJson(request){try{return await request.json();}catch{return null;}}
