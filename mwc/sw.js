/* Minor Works Certificate — offline service worker.
   Bump CACHE (v1 -> v2 ...) whenever you deploy a new index.html so phones refresh. */
const CACHE = "mwc-1.3.0";
const CORE = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"
];
self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(CORE);}).then(function(){return self.skipWaiting();}));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  e.respondWith(
    caches.match(req).then(function(hit){
      return hit || fetch(req).then(function(res){
        try{
          var url = new URL(req.url);
          var cacheable = res && res.ok && (
            url.origin === location.origin ||
            url.host.indexOf("cdnjs") >= 0 ||
            url.host.indexOf("gstatic") >= 0 ||
            url.host.indexOf("googleapis") >= 0
          );
          if(cacheable){ var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); }
        }catch(err){}
        return res;
      }).catch(function(){ return caches.match("./index.html"); });
    })
  );
});
