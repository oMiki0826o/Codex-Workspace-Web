import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {computeKeyboardViewport} from '../src/lib/viewport-geometry.mjs';
const css=readFileSync(new URL('../src/styles/openwebui.css',import.meta.url),'utf8');
test('keyboard shrink sets pixel height but no zoom scaling',()=>{
 const x=computeKeyboardViewport({visualHeight:416,layoutHeight:844,baselineHeight:844,focused:true,scale:1});
 assert.deepEqual(x,{keyboardOpen:true,height:'416px',top:'0px'});
});
test('pinch zoom never opens keyboard',()=>{
 assert.equal(computeKeyboardViewport({visualHeight:420,layoutHeight:844,baselineHeight:844,focused:true,scale:2}).keyboardOpen,false);
});
test('blur resets dynamic height',()=>{
 assert.equal(computeKeyboardViewport({visualHeight:416,layoutHeight:844,baselineHeight:844,focused:false,scale:1}).height,'100dvh');
});
test('active CSS uses >=66px safe-area for mobile',()=>{
 assert.match(css,/padding-top:max\(66px,env\(safe-area-inset-top/);
});
test('keyboard visual viewport offset is sampled for diagnostics',()=>{
 const x=computeKeyboardViewport({visualHeight:416,layoutHeight:844,baselineHeight:844,focused:true,scale:1,offsetTop:187});
 assert.equal(x.top,'187px');
});
