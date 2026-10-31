const CACHE='codex-local-shell-v2';
const SHELL=['/','/icons/codex-local.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin||new URL(request.url).pathname.startsWith('/api/'))return;
 event.respondWith(fetch(request).catch(()=>caches.match(request)));
});
