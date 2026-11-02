import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeViewportGeometry } from '../src/lib/viewport-geometry.mjs';

const css = readFileSync(new URL('../src/app/ux-fixes.css',import.meta.url),'utf8');
test('pageTop includes Safari document scroll when the keyboard pans the visual viewport',()=>{
 const result=computeViewportGeometry({visualHeight:416,layoutHeight:844,visualPageTop:182,visualScale:1,focused:true,baselineHeight:844});
 assert.deepEqual(result,{keyboardOpen:true,height:'416px',pageTop:'182px'});
});
test('pinch zoom alone does not trigger keyboard layout',()=>{
 const result=computeViewportGeometry({visualHeight:420,layoutHeight:844,visualPageTop:12,visualScale:2,focused:true,baselineHeight:844});
 assert.equal(result.keyboardOpen,false);assert.equal(result.pageTop,'0px');
});
test('blur restores normal CSS height and top',()=>{
 const result=computeViewportGeometry({visualHeight:416,layoutHeight:844,visualPageTop:182,visualScale:1,focused:false,baselineHeight:844});
 assert.equal(result.keyboardOpen,false);assert.equal(result.height,'100dvh');assert.equal(result.pageTop,'0px');
});
test('mobile CSS anchors exactly one absolute application frame',()=>{
 assert.match(css,/\.app\s*\{[^}]*position:\s*absolute/);
 assert.doesNotMatch(css,/\.app\s*\{[^}]*position:\s*fixed/);
 assert.match(css,/top:\s*var\(--app-viewport-top/);
 assert.match(css,/height:\s*var\(--app-viewport-height/);
});
test('standalone header has a safe-area top fallback',()=>{
 assert.match(css,/@media\s*\(display-mode:\s*standalone\)[^{]*\{[\s\S]*?\.app\s*\{\s*padding-top:\s*max\(env\(safe-area-inset-top[^;]*44px\)/);
});
