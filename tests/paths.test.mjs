import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveAllowedProject, resolveAllowedWorkspace } from '../src/lib/paths.mjs';

test('projects must be existing git directories below allowed roots', () => {
 const base=mkdtempSync(join(tmpdir(),'codex-roots-'));
 try {
   const root=join(base,'projects'); const work=join(root,'okay'); mkdirSync(join(work,'.git'),{recursive:true});
   assert.equal(resolveAllowedProject(work,[root]),work);
   assert.throws(()=>resolveAllowedProject(base,[root]));
   assert.throws(()=>resolveAllowedProject(join(root,'missing'),[root]));
   symlinkSync(base,join(root,'link'));
   assert.throws(()=>resolveAllowedProject(join(root,'link'),[root]));
 } finally { rmSync(base,{recursive:true,force:true}); }
});
test('fixed workspace may be a non-Git container directory below an allowed root',()=>{
 const base=mkdtempSync(join(tmpdir(),'codex-workspace-'));
 try {
  const root=join(base,'projects');const workspace=join(root,'workspace');mkdirSync(workspace,{recursive:true});
  assert.equal(resolveAllowedWorkspace(workspace,[root]),workspace);
  assert.throws(()=>resolveAllowedProject(workspace,[root]));
 } finally {rmSync(base,{recursive:true,force:true});}
});
