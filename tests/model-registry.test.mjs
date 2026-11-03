import {test} from 'node:test';
import assert from 'node:assert/strict';
import {listModels,resolveModel,modelBinForRoute} from '../src/lib/model-registry.mjs';

const clientFactory=()=>({connect:async()=>{},close:()=>{},listModels:async()=>({data:[{id:'gpt-test',displayName:'Cloud test',supportedReasoningEfforts:['low','high']}]})});
const fetcher=async()=>new Response(JSON.stringify({data:[{id:'qwen3.5:4b-q4_K_M'}]}),{status:200});

test('combines dynamic cloud and Ollama models while preserving the server route',async()=>{
 const registry=await listModels({clientFactory,fetcher});
 assert.deepEqual(registry.models,[
  {id:'gpt-test',name:'Cloud test',reasoningEfforts:['low','high'],route:'cloud'},
  {id:'qwen3.5:4b-q4_K_M',name:'qwen3.5:4b-q4_K_M',reasoningEfforts:[],route:'qwen'}
 ]);
});

test('rejects a browser-supplied model that is absent from the dynamic registry',async()=>{
 await assert.rejects(()=>resolveModel('not-a-model',{clientFactory,fetcher}),/目前不可用/);
});

test('selects separate binaries for cloud and Qwen routes',()=>{
 assert.equal(modelBinForRoute('cloud'),'codex-cloud');
 assert.equal(modelBinForRoute('qwen'),'codex');
});
