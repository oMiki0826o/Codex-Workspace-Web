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

test('cursor history reads accept an extra row to detect more results',()=>{
 const root=mkdtempSync(join(tmpdir(),'codex-db-page-'));
 try{
  const store=createStore(join(root,'state.db'));
  const p=store.addProject('Sample','/example');
  const t=store.addThread(p.id);
  const job=store.addJob(t.id,'page','page-key');
  for(let i=0;i<5;i++)store.event(job.id,'part',{i});
  assert.equal(store.getEvents(job.id,0,3).length,3);
  assert.deepEqual(store.getEvents(job.id,3,3).map(e=>e.payload.i),[3,4]);
  store.close();
 }finally{rmSync(root,{recursive:true,force:true});}
});
