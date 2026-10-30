import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { listWorkspaceSessions, readNativeSession } from '../src/lib/native-sessions.mjs';

const line=(type,payload)=>JSON.stringify({timestamp:'2026-10-30T00:00:00.000Z',type,payload});
test('lists only complete native sessions for the requested workspace',()=>{
 const dir=mkdtempSync(join(tmpdir(),'native-sessions-'));mkdirSync(join(dir,'2026','10'),{recursive:true});
 try{
  writeFileSync(join(dir,'2026','10','inside.jsonl'),[line('session_meta',{id:'inside',cwd:'/work/miki'}),line('response_item',{type:'message',role:'user',content:[{type:'input_text',text:'hello'}]})].join('\n')+'\n');
  writeFileSync(join(dir,'2026','10','outside.jsonl'),line('session_meta',{id:'outside',cwd:'/work/other'})+'\n');
  writeFileSync(join(dir,'2026','10','partial.jsonl'),line('session_meta',{id:'partial',cwd:'/work/miki'})+'\n{"type":"response');
  assert.deepEqual(listWorkspaceSessions({workspace:'/work/miki',sessionsDir:dir}).map(s=>s.id).sort(),['inside','partial']);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('reads normalized messages and ignores an incomplete trailing JSONL record',()=>{
 const dir=mkdtempSync(join(tmpdir(),'native-session-read-'));mkdirSync(join(dir,'2026'),{recursive:true});
 try{
  writeFileSync(join(dir,'2026','thread.jsonl'),[line('session_meta',{id:'thread',cwd:'/work/miki'}),line('response_item',{type:'message',id:'user-1',role:'user',content:[{type:'input_text',text:'hello'}]}),line('response_item',{type:'message',id:'assistant-1',role:'assistant',content:[{type:'output_text',text:'world'}]}),'{"type":"response'].join('\n'));
  const thread=readNativeSession({sessionId:'thread',workspace:'/work/miki',sessionsDir:dir});
  assert.deepEqual(thread.items.map(item=>[item.id,item.role,item.text]),[['user-1','user','hello'],['assistant-1','assistant','world']]);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
