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

test('mobile keyboard layout relies on dynamic viewport CSS without shrinking the app twice',()=>{
 const src=source('src/components/Workspace.tsx');
 const css=source('src/app/ux-fixes.css');
 assert.doesNotMatch(src,/visualViewport/);
 assert.match(src,/chatScrollRef/);
 assert.doesNotMatch(src,/scrollIntoView/);
 assert.match(css,/\.app\s*\{[\s\S]*?height:\s*100dvh/);
 assert.doesNotMatch(css,/--visual-viewport-height|--composer-safe-bottom/);
 assert.match(css,/\.sidebar-conversations\s*\{[\s\S]*?overflow-y:\s*auto/);
 assert.match(css,/\.composer-actions \.chip:nth-of-type\(3\)\s*\{\s*display:\s*flex/);
});

test('PWA content begins below the iPhone status area and keeps the topbar tappable',()=>{
 const layout=source('src/app/layout.tsx');
 const css=source('src/app/ux-fixes.css');
 assert.match(layout,/viewportFit:\s*'cover'/);
 assert.match(css,/\.app\s*\{[\s\S]*?padding-top:\s*env\(safe-area-inset-top,\s*0px\)/);
 assert.match(css,/\.topbar\s*\{[\s\S]*?z-index:\s*10[\s\S]*?pointer-events:\s*auto/);
});
