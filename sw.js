const CACHE='jb-school-demo-v4';
const ASSETS=['./','./index.html','./src/styles.css','./src/core.js','./src/app.js','./src/modules.css','./src/modules-core.js','./src/modules-ui.js','./src/local-tools-core.js','./src/extra-core.js','./src/extra-ui.js','./src/extra.css','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('jb-school-demo-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request)));});
