import { realpathSync, statSync, existsSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
export function approvedRoots(){return (process.env.ALLOWED_PROJECT_ROOTS||'').split(',').map(x=>x.trim()).filter(Boolean).map(x=>realpathSync(x));}
export function resolveAllowedWorkspace(candidate, roots=approvedRoots()) {
  if(typeof candidate!=='string'||!isAbsolute(candidate))throw new Error('請使用絕對路徑');
  const path=realpathSync(candidate);
  if(!statSync(path).isDirectory())throw new Error('專案不是目錄');
  const allowed=roots.some(root=>{
    const target=realpathSync(root); const rel=relative(target,path);return rel===''||(!rel.startsWith('..')&&!isAbsolute(rel));
  });
  if(!allowed)throw new Error('專案不在允許的目錄內');
  return path;
}
export function resolveAllowedProject(candidate, roots=approvedRoots()) {
  const path=resolveAllowedWorkspace(candidate,roots);
  if(!existsSync(resolve(path,'.git')))throw new Error('只允許已初始化 Git 的專案');
  return path;
}
