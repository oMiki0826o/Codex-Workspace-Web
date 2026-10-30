import { getStore } from '@/lib/store.mjs';
import { resolveAllowedWorkspace } from '@/lib/paths.mjs';
import { guard, error } from '@/lib/http.mjs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
export const runtime='nodejs';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){const denied=guard(req);if(denied)return denied;const {id}=await params;
 const p=getStore().getProject(id);if(!p)return error('找不到專案',404);
 try{const root=resolveAllowedWorkspace(p.path);let visited=0;
 const ignore=new Set(['node_modules','.git','.next','.env','.env.local','.codex','dist','build','.venv','coverage']);
 async function tree(dir:string,depth=0):Promise<{name:string,type:string,children?:unknown[]}[]>{if(depth>3||visited>300)return [];const out=[];
  for(const item of await readdir(dir,{withFileTypes:true})){if(ignore.has(item.name)||item.name.startsWith('.env'))continue;if(visited++>300)break;
   if(item.isSymbolicLink())continue;out.push({name:item.name,type:item.isDirectory()?'directory':'file',...(item.isDirectory()?{children:await tree(join(dir,item.name),depth+1)}:{})});}
  return out.sort((a,b)=>(a.type===b.type?a.name.localeCompare(b.name):a.type==='directory'?-1:1));}
 const files=await tree(root);
 let status='';let diff='';try{const run=promisify(execFile);status=(await run('git',['status','--short'],{cwd:root,timeout:2500,maxBuffer:120000})).stdout;
 diff=(await run('git',['diff','--stat'],{cwd:root,timeout:2500,maxBuffer:120000})).stdout;}catch{}
 return Response.json({files,status:status.slice(0,12000),diff:diff.slice(0,12000)});
 }catch(e){return error(e instanceof Error?e.message:'無法讀取專案');}}
