import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../src/lib/store.mjs';

test('persists projects, thread, job, and incremental events across store instances',()=>{
 const root=mkdtempSync(join(tmpdir(),'codex-db-'));
 try {
  const filename=join(root,'state.db');
  const db=createStore(filename);
  const project=db.addProject('Sample','/path/sample');
  const thread=db.addThread(project.id);
  const job=db.addJob(thread.id,'請檢查專案','request-a');
  db.event(job.id,'thread.started',{type:'thread.started',thread_id:'session-01'});
  db.setCodexThread(thread.id,'session-01');
  assert.equal(db.getThread(thread.id).codexThreadId,'session-01');
  assert.equal(db.getEvents(job.id,0).length,1);
  assert.equal(db.addJob(thread.id,'請檢查專案','request-a').id,job.id);
  db.finishJob(job.id,'completed',0);
  db.close();
  const reopened=createStore(filename);
  assert.equal(reopened.getEvents(job.id,0).length,1);
  assert.equal(reopened.getThread(thread.id).jobs[0].status,'completed');
  reopened.close();
 } finally{rmSync(root,{recursive:true,force:true});}
});
test('stale running jobs become interrupted on startup',()=>{
 const root=mkdtempSync(join(tmpdir(),'codex-db-'));
 try {let db=createStore(join(root,'state.db'));let p=db.addProject('A','/sample');let t=db.addThread(p.id);let j=db.addJob(t.id,'prompt','key');db.setJobRunning(j.id,10);db.close();db=createStore(join(root,'state.db'));assert.equal(db.getJob(j.id).status,'interrupted');db.close();}
 finally{rmSync(root,{recursive:true,force:true});}
});

test('event reads can request one extra row to detect additional history',()=>{
 const root=mkdtempSync(join(tmpdir(),'codex-db-'));
 try {const db=createStore(join(root,'state.db'));const p=db.addProject('A','/sample');const t=db.addThread(p.id);const j=db.addJob(t.id,'prompt','key');db.event(j.id,'one',{});db.event(j.id,'two',{});db.event(j.id,'three',{});assert.deepEqual(db.getEvents(j.id,0,3).map(event=>event.type),['one','two','three']);assert.deepEqual(db.getEvents(j.id,0,2).map(event=>event.type),['one','two']);db.close();}
 finally{rmSync(root,{recursive:true,force:true});}
});
