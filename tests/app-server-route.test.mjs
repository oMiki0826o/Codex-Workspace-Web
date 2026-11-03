import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStore} from '../src/lib/store.mjs';
import {AppServerJobManager} from '../src/lib/jobs.mjs';

class FakeClient {
 constructor(){this.handlers=new Map();}
 on(name,handler){this.handlers.set(name,handler);}
 off(name){this.handlers.delete(name);}
 async connect(){}
 close(){}
 async startThread(){return {thread:{id:'native-thread'}};}
 async startTurn(){return {turn:{id:'turn'}};}
 async interruptTurn(_threadId,turnId){queueMicrotask(()=>this.handlers.get('notification')?.({method:'turn/failed',params:{turnId,error:{message:'cancelled'}}}));}
 async unsubscribeThread(){}
}

test('default App Server factory receives the selected route binary',async()=>{
 const root=mkdtempSync(join(tmpdir(),'codex-route-'));
 try {
  const store=createStore(join(root,'state.db'));
  const project=store.addProject('test',root);
  const thread=store.addThread(project.id);
  const job=store.addJob(thread.id,'test','route-test');
  let usedBin='';
  const checked=new AppServerJobManager(store,bin=>{usedBin=bin;return new FakeClient();});
  const run=checked.start(job.id,{dir:root,model:'qwen3.5:4b-q4_K_M',route:'qwen',bin:'/tmp/qwen-codex'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(usedBin,'/tmp/qwen-codex');
  checked.cancel(job.id);
  await run.catch(()=>{});
  store.close();
 } finally {rmSync(root,{recursive:true,force:true});}
});
