import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCodexArgs, JsonlDecoder } from '../src/lib/codex.mjs';

test('new turn sends prompt over stdin and safe arguments only', () => {
  assert.deepEqual(buildCodexArgs({dir:'/srv/work',sandbox:'workspace-write',model:''}), ['exec','--json','--sandbox','workspace-write','-C','/srv/work','-']);
});
test('resume targets explicit session, retains sandbox and cwd', () => {
  const args=buildCodexArgs({dir:'/srv/work',sandbox:'read-only',model:'',sessionId:'abc'});
  assert.deepEqual(args,['exec','--json','--sandbox','read-only','-C','/srv/work','resume','abc','-']);
});
test('rejects unapproved sandbox or model injection', () => {
  assert.throws(()=>buildCodexArgs({dir:'/srv/x',sandbox:'danger-full-access'}));
  assert.throws(()=>buildCodexArgs({dir:'/srv/x',sandbox:'read-only',model:'x --y'}));
});
test('JSONL decoder combines split UTF8 chunks, skips invalid messages', () => {
  const messages=[];const decoder=new JsonlDecoder(m=>messages.push(m));
  const bytes=Buffer.from('{"type":"item.completed","item":{"text":"測試"}}\n{bad}\n{"type":"turn.completed"}\n');
  for(let i=0;i<bytes.length;i+=2)decoder.push(bytes.subarray(i,i+2));
  decoder.flush();
  assert.equal(messages.length,2);
  assert.equal(messages[0].item.text,'測試');
  assert.equal(messages[1].type,'turn.completed');
});
