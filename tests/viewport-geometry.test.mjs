import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {computeKeyboardViewport} from '../src/lib/viewport-geometry.mjs';
const css=readFileSync(new URL('../src/app/ux-fixes.css',import.meta.url),'utf8');
test('keyboard shrink changes height only',()=>{
 const x=computeKeyboardViewport({visualHeight:416,layoutHeight:844,baselineHeight:844,focused:true,scale:1});
 assert.deepEqual(x,{keyboardOpen:true,height:'416px',top:'0px'});
});
test('pinch zoom must not look like keyboard',()=>{
 assert.equal(computeKeyboardViewport({visualHeight:420,layoutHeight:844,baselineHeight:844,focused:true,scale:2}).keyboardOpen,false);
});
test('blur returns to dvh',()=>{
 assert.equal(computeKeyboardViewport({visualHeight:416,layoutHeight:844,baselineHeight:844,focused:false,scale:1}).height,'100dvh');
});
test('safe-area is permanent inside fixed shell',()=>{
 assert.match(css,/\.app\s*\{[\s\S]*?padding-top:max\(66px,env\(safe-area-inset-top/);
});

test('fixed shell compensates keyboard visual viewport pan using offsetTop',()=>{
 const x=computeKeyboardViewport({visualHeight:416,layoutHeight:844,baselineHeight:844,focused:true,scale:1,offsetTop:187});
 assert.deepEqual(x,{keyboardOpen:true,height:'416px',top:'187px'});
});
test('blur clears a stale iOS viewport offset',()=>{
 const x=computeKeyboardViewport({visualHeight:416,layoutHeight:844,baselineHeight:844,focused:false,scale:1,offsetTop:187});
 assert.deepEqual(x,{keyboardOpen:false,height:'100dvh',top:'0px'});
});
