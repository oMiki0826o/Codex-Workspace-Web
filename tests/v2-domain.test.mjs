import {test} from 'node:test';import assert from 'node:assert/strict';
import {discoverCodexCapabilities,effortsForModel} from '../src/lib/codex-gateway/capabilities.mjs';
import {emptyTimeline,mergeTimeline} from '../src/lib/events/reducer.mjs';
import {describeApproval,validDecision} from '../src/lib/approvals/registry.mjs';
test('model-specific reasoning options and unsupported RPCs',async()=>{
 const c={request:async method=>{if(method==='model/list')return {data:[{id:'gpt-6',supportedReasoningEfforts:[{reasoningEffort:'high'}]}]};throw Error('unsupported');}};
 const v=await discoverCodexCapabilities(c);assert.deepEqual(effortsForModel(v,'gpt-6'),['high']);assert.equal(v.methods['skills/list'],false);
});
test('delta replay deduplicated and completion authoritative',()=>{
 const es=[{id:1,jobId:'j',type:'item.delta',payload:{itemId:'m',delta:'hel'}},{id:2,jobId:'j',type:'item.completed',payload:{item:{id:'m',type:'agentMessage',text:'hello'}}}];
 const v=mergeTimeline(mergeTimeline(emptyTimeline(),es),es);assert.equal(v.items.length,1);assert.equal(v.items[0].text,'hello');
});
test('plan, diff and external approvals are distinct state',()=>{
 const es=[{id:1,type:'turn.plan',payload:{turnId:'t',plan:[{step:'test',status:'inProgress'}]}},{id:2,type:'turn.diff',payload:{turnId:'t',diff:'--- file'}},{id:3,type:'approval.request',payload:{requestId:'a'}},{id:4,type:'approval.resolved',payload:{requestId:'a'}}];
 const s=mergeTimeline(emptyTimeline(),es);assert.equal(s.plans.t.length,1);assert.equal(s.diffs.t,'--- file');assert.equal(s.approvals.length,0);
});
test('unknown permissions fail closed',()=>{assert.deepEqual(describeApproval('unknown').decisions,[]);assert.equal(validDecision(describeApproval('unknown'),'accept'),false);});
