import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { EventEmitter } from 'node:events';
import { createStore } from '../src/lib/store.mjs';
import { AppServerJobManager, JobManager } from '../src/lib/jobs.mjs';

test('runner executes fake CLI with stdin, stores thread id and final message',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'codex-job-'));
 try{
 const bin=join(dir,'codex');writeFileSync(bin,'#!/usr/bin/env node\nprocess.stdin.setEncoding("utf8");let s="";process.stdin.on("data",x=>s+=x);process.stdin.on("end",()=>{console.log(JSON.stringify({type:"thread.started",thread_id:"aaa-111"}));console.log(JSON.stringify({type:"item.completed",item:{id:"m1",type:"agent_message",text:s}}));console.log(JSON.stringify({type:"turn.completed"}));});',{mode:0o755});
 const store=createStore(join(dir,'s.db')); const p=store.addProject('sample',dir);const thread=store.addThread(p.id);const job=store.addJob(thread.id,'hello', 'k');const manager=new JobManager(store,bin);
 await manager.start(job.id,{dir,sandbox:'read-only'});
 assert.equal(store.getJob(job.id).status,'completed');assert.equal(store.getThread(thread.id).codexThreadId,'aaa-111');assert.equal(store.getEvents(job.id).find(e=>e.type==='item.completed').payload.item.text,'hello');store.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('runner marks failure when CLI exits without turn.completed',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'codex-fail-'));
 try{
  const bin=join(dir,'codex');writeFileSync(bin,'#!/usr/bin/env node\nconsole.log(JSON.stringify({type:"thread.started",thread_id:"abc"}));process.exit(2);',{mode:0o755});
  const store=createStore(join(dir,'s.db'));const p=store.addProject('sample',dir);const t=store.addThread(p.id);const job=store.addJob(t.id,'testing','key');
  await new JobManager(store,bin).start(job.id,{dir});
  assert.equal(store.getJob(job.id).status,'failed');
  assert.equal(store.getJob(job.id).exitCode,2);
  store.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('missing Codex binary produces failed job rather than hanging',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'codex-missing-'));
 try{
  const store=createStore(join(dir,'s.db'));const p=store.addProject('sample',dir);const t=store.addThread(p.id);const job=store.addJob(t.id,'testing','key');
  await new JobManager(store,join(dir,'not-installed')).start(job.id,{dir});
  assert.equal(store.getJob(job.id).status,'failed');
  assert.ok(store.getEvents(job.id).some(e=>e.type==='webui.error'));
  store.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('app server runner persists streamed answer and completion',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'codex-app-server-'));
 try{
  class FakeClient extends EventEmitter {
   async connect(){}
   async startThread(){return {thread:{id:'native-thread'}};}
   async startTurn(){
    setTimeout(()=>{
      this.emit('notification',{method:'item/agentMessage/delta',params:{threadId:'native-thread',itemId:'answer',delta:'done'}});
      this.emit('notification',{method:'turn/completed',params:{threadId:'native-thread',turn:{id:'native-turn',status:'completed',items:[{id:'answer',type:'agentMessage',text:'done'}]}}});
    },0);
    return {turn:{id:'native-turn'}};
   }
   async interruptTurn(){}
  }
  const store=createStore(join(dir,'s.db'));const p=store.addProject('sample',dir);const t=store.addThread(p.id);const job=store.addJob(t.id,'say done','key');
  const manager=new AppServerJobManager(store,new FakeClient());
  await manager.start(job.id,{dir,sandbox:'read-only'});
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(store.getJob(job.id).status,'completed');
  assert.equal(store.getThread(t.id).codexThreadId,'native-thread');
  assert.equal(store.getEvents(job.id).find(e=>e.type==='item.completed').payload.item.text,'done');
  store.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('app server exit interrupts an in-flight job',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'codex-app-exit-'));
 try{
  class FakeClient extends EventEmitter {async connect(){}async startThread(){return {thread:{id:'thread'}};}async startTurn(){return {turn:{id:'turn'}};}async interruptTurn(){}}
  const store=createStore(join(dir,'s.db'));const p=store.addProject('sample',dir);const t=store.addThread(p.id);const job=store.addJob(t.id,'wait','key');const client=new FakeClient();
  await new AppServerJobManager(store,client).start(job.id,{dir});client.emit('exit');
  assert.equal(store.getJob(job.id).status,'interrupted');store.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('app server job can be cancelled while startup is pending',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'codex-app-cancel-'));
 try{
  let release;const gate=new Promise(resolve=>{release=resolve;});
  class FakeClient extends EventEmitter {async connect(){await gate;}async startThread(){return {thread:{id:'thread'}};}async startTurn(){return {turn:{id:'turn'}};}async interruptTurn(){}}
  const store=createStore(join(dir,'s.db'));const p=store.addProject('sample',dir);const t=store.addThread(p.id);const job=store.addJob(t.id,'wait','key');const manager=new AppServerJobManager(store,new FakeClient());
  const start=manager.start(job.id,{dir});assert.equal(manager.cancel(job.id),true);release();await start;
  assert.equal(store.getJob(job.id).status,'cancelled');store.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('app server auto-approves workspace reads and asks before external reads',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'codex-app-approval-'));
 try{
  class FakeClient extends EventEmitter {constructor(){super();this.responses=[];}async connect(){}async startThread(){return {thread:{id:'thread'}};}async startTurn(){return {turn:{id:'turn'}};}async interruptTurn(){}async respond(id,result){this.responses.push({id,result});}}
  const store=createStore(join(dir,'s.db'));const p=store.addProject('sample',dir);const t=store.addThread(p.id);const job=store.addJob(t.id,'check','key');const client=new FakeClient();const manager=new AppServerJobManager(store,client);
  await manager.start(job.id,{dir});
  client.emit('request',{id:'inside',method:'item/commandExecution/requestApproval',params:{threadId:'thread',itemId:'one',commandActions:[{type:'read',path:join(dir,'README.md')}]}});
  await new Promise(resolve=>setTimeout(resolve,0));assert.deepEqual(client.responses,[{id:'inside',result:{decision:'accept'}}]);
  client.emit('request',{id:'outside',method:'item/commandExecution/requestApproval',params:{threadId:'thread',itemId:'two',command:'cat /etc/passwd',commandActions:[{type:'read',path:'/etc/passwd'}]}});
  assert.equal(store.getEvents(job.id).some(e=>e.type==='approval.request'),true);
  await manager.approve(job.id,'outside','decline');assert.deepEqual(client.responses.at(-1),{id:'outside',result:{decision:'decline'}});store.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('app server runner unsubscribes a completed native thread',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'codex-app-unsubscribe-'));
 try{
  class FakeClient extends EventEmitter {constructor(){super();this.unsubscribed=[];}async connect(){}async startThread(){return {thread:{id:'thread'}};}async startTurn(){setTimeout(()=>this.emit('notification',{method:'turn/completed',params:{threadId:'thread',turn:{id:'turn',status:'completed',items:[]}}}),0);return {turn:{id:'turn'}};}async interruptTurn(){}async unsubscribeThread(id){this.unsubscribed.push(id);}}
  const store=createStore(join(dir,'s.db'));const p=store.addProject('sample',dir);const t=store.addThread(p.id);const job=store.addJob(t.id,'done','key');const client=new FakeClient();
  await new AppServerJobManager(store,client).start(job.id,{dir});await new Promise(resolve=>setTimeout(resolve,20));
  assert.deepEqual(client.unsubscribed,['thread']);store.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('app server runner releases each completed web turn client',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'codex-app-release-client-'));
 try{
  const clients=[];
  class FakeClient extends EventEmitter {
   constructor(){super();this.closed=false;clients.push(this);}
   async connect(){}
   async startThread(){return {thread:{id:`thread-${clients.indexOf(this)}`}};}
   async startTurn(){const threadId=`thread-${clients.indexOf(this)}`;setTimeout(()=>this.emit('notification',{method:'turn/completed',params:{threadId,turn:{id:'turn',status:'completed',items:[]}}}),0);return {turn:{id:'turn'}};}
   async interruptTurn(){}
   async unsubscribeThread(){}
   close(){this.closed=true;}
  }
  const store=createStore(join(dir,'s.db'));const p=store.addProject('sample',dir);const firstThread=store.addThread(p.id);const secondThread=store.addThread(p.id);
  const first=store.addJob(firstThread.id,'first','key');const second=store.addJob(secondThread.id,'second','key');
  const manager=new AppServerJobManager(store,()=>new FakeClient());
  await manager.start(first.id,{dir});await new Promise(resolve=>setTimeout(resolve,20));
  await manager.start(second.id,{dir});await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(clients.length,2);
  assert.equal(clients.every(client=>client.closed),true);
  store.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});
