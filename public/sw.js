// public/sw.js
const CACHE_NAME = 'artist-site-v1';
const MEDIA_CACHE = 'artist-media-v1';
console.log('🔧 SERVICE WORKER v7 LOADED');

// Install event - cache essential files immediately
self.addEventListener('install', (event) => {
  console.log('🔧 SW Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        // Try to cache essential pages one by one to see which fails
        const urlsToCache = ['/', '/download-offline'];
        
        for (const url of urlsToCache) {
          try {
            console.log('🔧 Trying to cache:', url);
            await cache.add(url);
            console.log('🔧 Successfully cached:', url);
          } catch (error) {
            console.error('🔧 Failed to cache:', url, error);
          }
        }
      } catch (error) {
        console.error('🔧 Install error:', error);
      }
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🔧 SW Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== MEDIA_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle direct Sanity CDN requests by redirecting to our proxy cache
  if (url.hostname === 'cdn.sanity.io') {
    const proxyUrl = `/api/asset-proxy?url=${encodeURIComponent(event.request.url)}`;
    console.log('🔧 Redirecting Sanity URL to proxy:', event.request.url, '→', proxyUrl);
    
    event.respondWith(
      caches.open(MEDIA_CACHE).then(cache => {
        return cache.match(proxyUrl).then(response => {
          if (response) {
            console.log('🔧 Serving from proxy cache:', proxyUrl);
            return response;
          }
          console.log('🔧 Proxy cache miss, fetching from network:', proxyUrl);
          return fetch(proxyUrl);
        });
      })
    );
    return;
  }
  
  // Handle media files with range requests support
  if (event.request.destination === 'video' || 
      event.request.destination === 'audio' ||
      event.request.url.includes('.mp4') ||
      event.request.url.includes('.mp3') ||
      event.request.url.includes('.wav')) {
    
    event.respondWith(
      caches.open(MEDIA_CACHE).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request).then((response) => {
            if (response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        });
      })
    );
  } else {
    // Handle other requests (pages, API, etc.)
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  console.log('🔧 SW received message:', event.data);
  
  if (event.data && event.data.type === 'CACHE_MEDIA') {
    console.log('🔧 About to call cacheMediaFiles with:', {
      urlCount: event.data.urls?.length,
      portfolioSlug: event.data.portfolioSlug,
      hasPortfolioData: !!event.data.portfolioData
    });
    cacheMediaFiles(event.data.urls, event.data.portfolioSlug, event.data.portfolioData);
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    console.log('🔧 SW getting cache status...');
    getCacheStatus().then(status => {
      event.ports[0].postMessage(status);
    });
  }
});

// Function to cache media files
async function cacheMediaFiles(urls, portfolioSlug, portfolioData) {
  console.log('🔧 cacheMediaFiles called with:', { 
    urlCount: urls.length, 
    portfolioSlug,
    hasPortfolioData: !!portfolioData
  });
  
  const mediaCache = await caches.open(MEDIA_CACHE);
  const pageCache = await caches.open(CACHE_NAME);
  const totalUrls = urls.length;
  let cached = 0;
  
  // Count total items to cache (portfolio page + artwork pages + media files)
  const artworkPages = portfolioData?.artworks?.filter(a => a.slug) || [];
  const totalItems = 1 + artworkPages.length + totalUrls; // 1 portfolio page + artwork pages + media files
  let totalCached = 0;
  
  console.log('🔧 Will cache:', {
    portfolioPages: 1,
    artworkPages: artworkPages.length,
    mediaFiles: totalUrls,
    totalItems: totalItems
  });
  
  // First, cache the portfolio page itself
  if (portfolioSlug) {
    try {
      const portfolioUrl = `/portfolio/${portfolioSlug}`;
      console.log('🔧 Attempting to cache portfolio page:', portfolioUrl);
      
      const pageResponse = await fetch(portfolioUrl);
      console.log('🔧 Portfolio page fetch response:', pageResponse.status, pageResponse.statusText);
      
      if (pageResponse.ok) {
        console.log('🔧 Portfolio page fetch successful, caching...');
        await pageCache.put(portfolioUrl, pageResponse);
        console.log('🔧 Portfolio page cached successfully');
        totalCached++;
        
        // Send progress update for portfolio page
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'CACHE_PROGRESS',
              progress: (totalCached / totalItems) * 100,
              current: totalCached,
              total: totalItems,
              stage: 'portfolio_page'
            });
          });
        });
      } else {
        console.error('🔧 Portfolio page fetch failed:', pageResponse.status);
      }
    } catch (error) {
      console.error('🔧 Failed to cache portfolio page:', error);
    }
  } else {
    console.warn('🔧 No portfolioSlug provided, skipping page caching');
  }
  
  // Second, cache all individual artwork pages
  console.log('🔧 Caching individual artwork pages...');
  for (const artwork of artworkPages) {
    try {
      const artworkUrl = `/portfolio/${portfolioSlug}/${artwork.slug}`;
      console.log('🔧 Attempting to cache artwork page:', artworkUrl);
      
      const artworkResponse = await fetch(artworkUrl);
      if (artworkResponse.ok) {
        await pageCache.put(artworkUrl, artworkResponse);
        console.log('🔧 Artwork page cached:', artworkUrl);
        totalCached++;
        
        // Send progress update for artwork page
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'CACHE_PROGRESS',
              progress: (totalCached / totalItems) * 100,
              current: totalCached,
              total: totalItems,
              stage: 'artwork_pages'
            });
          });
        });
      } else {
        console.error('🔧 Failed to cache artwork page:', artworkUrl, artworkResponse.status);
      }
    } catch (error) {
      console.error('🔧 Error caching artwork page:', artwork.slug, error);
    }
  }
  
  // Third, cache all the media files
  console.log('🔧 Caching media files...');
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await mediaCache.put(url, response);
        cached++;
        totalCached++;
        
        // Send progress update for media files
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'CACHE_PROGRESS',
              progress: (totalCached / totalItems) * 100,
              current: totalCached,
              total: totalItems,
              stage: 'media_files'
            });
          });
        });
      }
    } catch (error) {
      console.error('🔧 Failed to cache:', url, error);
    }
  }
  
  // Send completion message with portfolio data
  console.log('🔧 Caching complete! Total cached:', totalCached, 'of', totalItems);
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'CACHE_COMPLETE',
        cached: cached, // Media files cached
        total: totalUrls, // Total media files
        portfolioData: portfolioData,
        mediaCount: cached,
        totalItemsCached: totalCached,
        totalItems: totalItems,
        artworkPagesCached: artworkPages.length
      });
    });
  });
}

// Get cache status and size
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  let fileCount = 0;
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    fileCount += requests.length;
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response && response.headers.get('content-length')) {
        totalSize += parseInt(response.headers.get('content-length'));
      }
    }
  }
  
  return {
    totalSize: totalSize,
    fileCount: fileCount,
    formattedSize: formatBytes(totalSize)
  };
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}