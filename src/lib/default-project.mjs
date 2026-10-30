import { basename } from 'node:path';
import { resolveAllowedWorkspace } from './paths.mjs';

export function ensureDefaultProject(store, defaultPath=process.env.DEFAULT_PROJECT_PATH, roots){
 if(!defaultPath)return null;
 const path=roots?resolveAllowedWorkspace(defaultPath,roots):resolveAllowedWorkspace(defaultPath);
 return store.addProject(basename(path),path);
}
