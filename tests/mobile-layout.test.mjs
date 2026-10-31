import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = file => readFileSync(new URL(`../${file}`, import.meta.url),'utf8');

test('one top-right Settings entry, with an independent Files action',()=>{
 const src=source('src/components/Workspace.tsx');
 assert.equal((src.match(/title="設定" onClick=\{\(\)=>setModal\('settings'\)\}/g)||[]).length,1);
 const header=src.match(/<div className="session-actions">([\s\S]*?)<\/div>/)?.[1]||'';
 assert.match(header,/setRightOpen/);
 assert.doesNotMatch(header,/setModal\('settings'\)/);
});

test('mobile inputs avoid iOS focusing zoom without disabling pinch zoom',()=>{
 const layout=source('src/app/layout.tsx');
 const css=source('src/app/ux-fixes.css');
 assert.match(layout,/initialScale:\s*1/);
 assert.doesNotMatch(layout,/userScalable:\s*false|maximumScale:\s*1/);
 assert.match(css,/input,\s*textarea,\s*select\s*\{\s*font-size:\s*16px/);
 assert.match(css,/\.composer textarea\s*\{[^}]*font-size:\s*16px/s);
});

test('visualViewport follows keyboard resize, with scroll locked to the chat pane',()=>{
 const src=source('src/components/Workspace.tsx');
 const css=source('src/app/ux-fixes.css');
 assert.match(src,/visualViewport/);
 assert.match(src,/addEventListener\('resize',sync\)/);
 assert.match(src,/chatScrollRef/);
 assert.doesNotMatch(src,/scrollIntoView/);
 assert.match(css,/height:\s*var\(--visual-viewport-height/);
 assert.match(css,/\.sidebar-conversations\s*\{[\s\S]*?overflow-y:\s*auto/);
 assert.match(css,/\.composer-actions \.chip:nth-of-type\(3\)\s*\{\s*display:\s*flex/);
});
