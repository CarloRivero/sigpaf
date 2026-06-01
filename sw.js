// SIGPAF Service Worker v1.0
// Cachea los recursos esenciales para funcionamiento offline básico

var CACHE = 'sigpaf-v1';
var ARCHIVOS = [
  '/sigpaf/sigpaf_registro.html',
  '/sigpaf/sigpaf_profesoranuevo.html',
  '/sigpaf/manifest.json',
  '/sigpaf/icon-192.png',
  '/sigpaf/icon-512.png'
];

// Instalar: cachear archivos esenciales
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(cache){
      return cache.addAll(ARCHIVOS).catch(function(err){
        console.log('Cache parcial:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activar: limpiar caches viejos
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: red primero, cache como respaldo
self.addEventListener('fetch', function(e){
  // Solo interceptar GET
  if(e.request.method !== 'GET') return;

  // Para Firebase y CDNs: solo red (necesitan estar online)
  var url = e.request.url;
  if(url.includes('firestore.googleapis.com') ||
     url.includes('identitytoolkit') ||
     url.includes('gstatic.com/firebasejs') ||
     url.includes('googleapis.com')){
    return; // dejar pasar sin cachear
  }

  e.respondWith(
    fetch(e.request)
      .then(function(response){
        // Guardar copia en cache
        if(response && response.status === 200){
          var clone = response.clone();
          caches.open(CACHE).then(function(cache){
            cache.put(e.request, clone);
          });
        }
        return response;
      })
      .catch(function(){
        // Sin red: usar cache
        return caches.match(e.request).then(function(cached){
          if(cached) return cached;
          // Fallback para páginas HTML
          if(e.request.headers.get('accept').includes('text/html')){
            return caches.match('/sigpaf/sigpaf_registro.html');
          }
        });
      })
  );
});
