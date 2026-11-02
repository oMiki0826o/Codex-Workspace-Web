import {test} from 'node:test';
import assert from 'node:assert/strict';
import {viewportSample} from '../src/lib/viewport-diagnostics.mjs';
test('geometry only, no private prompt contents',()=>{
 const obj=viewportSample({innerHeight:844,scrollY:10,visualHeight:416,scale:1,focused:true,note:'a private prompt'});
 assert.equal(JSON.stringify(obj).includes('a private prompt'),false);
 assert.equal(obj.visualHeight,416);
});
