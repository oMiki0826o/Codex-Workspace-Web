import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorized, hashPassword, verifyPassword, validOrigin } from '../src/lib/auth.mjs';
import { guard } from '../src/lib/http.mjs';
test('scrypt password verification accepts correct password only',()=>{
 const hash=hashPassword('a long pass phrase');
 assert.equal(verifyPassword('a long pass phrase',hash),true);
 assert.equal(verifyPassword('wrong',hash),false);
 assert.equal(verifyPassword('a long pass phrase','not-hash'),false);
});
test('origin check rejects cross-site writes or missing origin',()=>{
 assert.equal(validOrigin(new Request('http://localhost:3000/api', {method:'POST',headers:{origin:'http://localhost:3000'}})),true);
 assert.equal(validOrigin(new Request('http://localhost:3000/api', {method:'POST',headers:{origin:'https://evil.invalid'}})),false);
 assert.equal(validOrigin(new Request('http://localhost:3000/api', {method:'POST'})),false);
});
test('local WebUI accepts requests without a session but retains same-origin protection for writes',async()=>{
 const read=new Request('http://127.0.0.1:3000/api/projects');
 assert.equal(authorized(read),true);
 assert.equal(guard(read),null);
 const denied=guard(new Request('http://127.0.0.1:3000/api/projects',{method:'POST',headers:{origin:'https://evil.invalid'}}),true);
 assert.equal(denied?.status,403);
});
