import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const src=read('src/components/Workspace.tsx'),css=read('src/styles/openwebui.css'),layout=read('src/app/layout.tsx');
test('one Settings action and a separate Files inspector',()=>{
 assert.equal((src.match(/title="設定" onClick=\{\(\)=>setModal\('settings'\)\}/g)||[]).length,1);
 assert.match(src,/onClick=\{\(\)=>setRightOpen/);
});
test('iOS input is 16px; pinch zoom remains available',()=>{
 assert.match(layout,/initialScale:\s*1/);assert.doesNotMatch(layout,/userScalable:\s*false|maximumScale:\s*1/);
 assert.match(css,/input,textarea,select\{font-size:16px!important\}/);
});
test('single mobile flex shell holds normal-flow composer above keyboard',()=>{
 assert.match(css,/\.app\{[^}]*position:relative!important/);
 assert.match(css,/\.composer-wrap\{[^}]*position:relative!important/);
 assert.match(css,/\.main\{[^}]*flex:1 1 0%/);
 assert.match(src,/--v2-height/);
 assert.match(css,/\.chat-scroll\{[^}]*min-height:0/);
 assert.match(css,/\.composer-actions\s*\{[^}]*overflow-x:hidden!important/);
});
test('service worker bypasses stale navigation cache',()=>{
 const sw=read('public/sw.js');assert.match(sw,/skipWaiting\(\)/);assert.match(sw,/request\.mode === 'navigate'/);
});
