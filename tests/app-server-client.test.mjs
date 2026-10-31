import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AppServerClient } from '../src/lib/app-server-client.mjs';

test('a missing Codex binary rejects immediately rather than waiting for the RPC timeout',async()=>{
  const bin=join(tmpdir(),'codex-nonexistent-app-server-test-abcdef');
  const client=new AppServerClient(bin);
  const started=Date.now();
  await assert.rejects(client.connect(),/Codex App Server|ENOENT|spawn/i);
  assert.ok(Date.now()-started<4000,'spawn error must not wait for a 30-second request timeout');
  client.close();
});
