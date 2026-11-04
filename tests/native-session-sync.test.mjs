import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { NativeSessionSync } from '../src/lib/native-session-sync.mjs';

const line=(type,payload)=>JSON.stringify({timestamp:'2026-10-30T00:00:00.000Z',type,payload});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const writeSession=(path,id,text)=>writeFileSync(path,[line('session_meta',{id,cwd:'/work/miki'}),line('response_item',{type:'message',role:'user',content:[{type:'input_text',text}]})].join('\n')+'\n');

test('native sync ignores unchanged watcher and poll deliveries, then emits once for the changed session',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'native-sync-'));mkdirSync(join(dir,'2026'),{recursive:true});const path=join(dir,'2026','one.jsonl');writeSession(path,'one','first');
 let notify;const watcher={close(){}};const sync=new NativeSessionSync({workspace:'/work/miki',sessionsDir:dir,watcher:(_dir,_options,listener)=>{notify=listener;return watcher;},pollMs:20});const events=[];sync.on('changed',event=>events.push(event));
 try{sync.list();sync.start();notify();notify();await pause(380);assert.deepEqual(events,[]);writeSession(path,'one','second');notify();notify();await pause(380);assert.deepEqual(events,[{changedSessionIds:['one']}]);await pause(50);assert.equal(events.length,1);}
 finally{sync.stop();rmSync(dir,{recursive:true,force:true});}
});

test('native sync falls back to polling and stop releases its timers',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'native-sync-poll-'));const path=join(dir,'one.jsonl');writeSession(path,'one','first');const sync=new NativeSessionSync({workspace:'/work/miki',sessionsDir:dir,watcher:()=>{throw new Error('watch unavailable');},pollMs:20});const events=[];sync.on('changed',event=>events.push(event));
 try{sync.list();sync.start();writeSession(path,'one','second');await pause(80);assert.deepEqual(events,[{changedSessionIds:['one']}]);sync.stop();writeSession(path,'one','third');await pause(80);assert.equal(events.length,1);}
 finally{sync.stop();rmSync(dir,{recursive:true,force:true});}
});
