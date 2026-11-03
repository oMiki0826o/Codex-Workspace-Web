import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collectPendingApprovals} from '../src/lib/approvals/pending.mjs';

const job=(id,status='running')=>({id,status});
const e=(id,type,requestId,payload={})=>({id,type,payload:{requestId,...payload}});
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('pending approvals are shown independently of where they appeared in the tool history',()=>{
 const events={a:[e(1,'item.started',''),e(2,'approval.request','r1',{reason:'Confirm command'}),e(3,'item.completed','')]};
 assert.deepEqual(collectPendingApprovals([job('a')],events).map(x=>x.requestId),['r1']);
});
test('resolved approvals disappear, including after history reload and duplicate SSE events',()=>{
 const started=e(1,'approval.request','r1');
 const resolved=e(2,'approval.resolved','r1');
 const map={a:[started,started,resolved]};
 assert.deepEqual(collectPendingApprovals([job('a')],map),[]);
 assert.deepEqual(collectPendingApprovals([job('a')],{a:[started]}).map(x=>x.requestId),['r1']);
 assert.deepEqual(collectPendingApprovals([job('a')],{a:[started,e(2,'appserver.serverRequest.resolved','r1')]}),[]);
});
test('multiple requests remain separate and are shown one at a time in event order',()=>{
 const result=collectPendingApprovals([job('a'),job('b')],{
  a:[e(3,'approval.request','r3'),e(4,'approval.resolved','r3'),e(7,'approval.request','r7')],
  b:[e(5,'approval.request','r5')]
 });
 assert.deepEqual(result.map(x=>[x.jobId,x.requestId]),[['b','r5'],['a','r7']]);
});
test('only active jobs may surface approval prompts',()=>{
 assert.deepEqual(collectPendingApprovals([job('a','completed'),job('b','cancelled')],{
  a:[e(1,'approval.request','x')],b:[e(2,'approval.request','y')]
 }),[]);
});
test('approval dock is outside scrollable chat and immediately above composer',()=>{
 const workspace=read('src/components/Workspace.tsx');
 const stream=read('src/components/MessageStream.tsx');
 const dock=read('src/components/ApprovalDock.tsx');
 const css=read('src/styles/openwebui.css');
 assert.match(workspace,/<ApprovalDock jobs=\{thread\?\.jobs\|\|\[\]\} events=\{events\} onApproval=\{approve\}\/>\s*<div className="composer-wrap">/);
 assert.doesNotMatch(stream,/state\.pending\.map\(/);
 assert.match(dock,/collectPendingApprovals\(jobs,events\)/);
 assert.match(dock,/aria-busy=\{busy\}/);
 assert.match(css,/\.v2-approval-dock\{[^}]*flex:0 0 auto/);
 assert.match(css,/\.v2-approval-dock[^\n]*overflow-y:auto/);
});
