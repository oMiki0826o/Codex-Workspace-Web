import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureDefaultProject } from '../src/lib/default-project.mjs';

test('registers the configured default workspace once even when it is a container directory', () => {
 const root=mkdtempSync(join(tmpdir(),'codex-default-'));
 try {
  const workspace=join(root,'projects');mkdirSync(workspace,{recursive:true});
  const projects=[];const store={addProject(name,path){const existing=projects.find(p=>p.path===path);if(existing)return existing;const project={id:String(projects.length+1),name,path};projects.push(project);return project;}};
  const first=ensureDefaultProject(store,workspace,[root]);
  const second=ensureDefaultProject(store,workspace,[root]);
  assert.equal(first.name,'projects');assert.equal(second.id,first.id);assert.equal(projects.length,1);
 } finally {rmSync(root,{recursive:true,force:true});}
});
