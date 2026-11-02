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

test('iOS keyboard uses one visual viewport coordinator and leaves document flow unfixed',()=>{
 const src=source('src/components/Workspace.tsx');
 const css=source('src/app/ux-fixes.css');
 assert.match(src,/visualViewport/);
 assert.match(src,/addEventListener\('resize',resync\)/);
 assert.match(src,/dataset\.keyboardOpen/);
 assert.match(src,/chatScrollRef/);
 assert.doesNotMatch(src,/scrollIntoView/);
 assert.match(css,/position:\s*static !important/);
 assert.match(css,/height:\s*var\(--app-viewport-height/);
 assert.match(css,/top:\s*var\(--app-viewport-top/);
 assert.match(css,/\.sidebar-conversations\s*\{[\s\S]*?overflow-y:\s*auto/);
 assert.match(css,/\.composer-actions \.chip:nth-of-type\(3\)\s*\{\s*display:\s*flex/);
});

test('PWA reserves the iPhone safe area and bypasses stale Next HTML caches',()=>{
 const layout=source('src/app/layout.tsx');
 const css=source('src/app/ux-fixes.css');
 const worker=source('public/sw.js');
 assert.match(layout,/viewportFit:\s*'cover'/);
 assert.match(layout,/statusBarStyle:\s*'black-translucent'/);
 assert.match(css,/\.app\s*\{[\s\S]*?padding-top:\s*env\(safe-area-inset-top,\s*0px\)/);
 assert.match(css,/\.topbar\s*\{[\s\S]*?z-index:\s*10[\s\S]*?pointer-events:\s*auto/);
 assert.match(worker,/codex-local-shell-v3/);
 assert.match(worker,/skipWaiting\(\)/);
 assert.match(worker,/request\.mode === 'navigate'/);
 assert.doesNotMatch(worker,/STATIC_ASSETS\s*=\s*\[[^\]]*'\/'/);
});
