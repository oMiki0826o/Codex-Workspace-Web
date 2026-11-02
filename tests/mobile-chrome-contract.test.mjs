import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const src=read('src/components/Workspace.tsx'),css=read('src/styles/openwebui.css'),layout=read('src/app/layout.tsx');
test('dark UI is permanent, with no light toggle',()=>{
 assert.match(src,/dataset\.theme='dark'/);assert.doesNotMatch(src,/setTheme\(|切換主題|<option value="light">/);
 assert.match(css,/color-scheme:dark/);
});
test('active stylesheet maintains >=66px headroom in all mobile height cases',()=>{
 assert.match(layout,/styles\/openwebui.css/);assert.doesNotMatch(layout,/ux-fixes.css/);
 assert.match(css,/padding-top:max\(66px,env\(safe-area-inset-top,0px\)/);
 assert.doesNotMatch(css,/padding-top:max\(45px/);
});
test('mobile dialogs and history own their scroll containers',()=>{
 assert.match(css,/\.sidebar-conversations\{[^}]*overflow-y:auto/);
 assert.match(css,/\.modal-backdrop\{[^}]*position:absolute/);
});
