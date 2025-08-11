// public/sw.js
const CACHE_NAME = 'artist-site-v1';
const MEDIA_CACHE = 'artist-media-v1';
console.log('🔧 SERVICE WORKER v8 LOADED');

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
    let originalUrl = event.request.url;
    
    // For video files, add compression parameters if they don't already exist
    if ((originalUrl.includes('.mov') || originalUrl.includes('.mp4') || originalUrl.includes('.m4v')) 
        && !originalUrl.includes('fm=mp4')) {
      
      // Detect if this is a mobile request (simplified check)
      const userAgent = event.request.headers.get('user-agent') || '';
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      
      // Add compression parameters
      const compression = isMobile 
        ? '?fm=mp4&q=30&w=640&h=480'    // Mobile: Very compressed
        : '?fm=mp4&q=60&w=1280&h=720';  // Desktop: Moderately compressed
      
      originalUrl = originalUrl + compression;
      console.log('🔧 Adding video compression:', event.request.url, '→', originalUrl);
    }
    
    const proxyUrl = `/api/asset-proxy?url=${encodeURIComponent(originalUrl)}`;
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
  
  // Handle video/audio files with proper range request support
  if (event.request.destination === 'video' || 
      event.request.destination === 'audio' ||
      event.request.url.includes('.mp4') ||
      event.request.url.includes('.mp3') ||
      event.request.url.includes('.wav') ||
      event.request.url.includes('.mov') ||
      event.request.url.includes('.m4v') ||
      event.request.url.includes('.webm')) {
    
    console.log('🔧 Handling video/audio request:', event.request.url);
    
    event.respondWith(
      caches.open(MEDIA_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        
        if (cachedResponse) {
          console.log('🔧 Serving video/audio from cache:', event.request.url);
          
          // Handle range requests for cached videos
          const rangeHeader = event.request.headers.get('range');
          if (rangeHeader) {
            console.log('🔧 Range request detected:', rangeHeader);
            return handleRangeRequest(cachedResponse, rangeHeader);
          }
          
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        console.log('🔧 Video/audio cache miss, fetching from network');
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      })
    );
    return;
  } else {
    // Handle other requests (pages, CSS, JS, API, etc.)
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          console.log('🔧 Serving from cache:', event.request.url);
          return response;
        }
        
        // Not in cache, fetch from network
        return fetch(event.request).then((networkResponse) => {
          // Cache CSS, JS, and other static assets for offline use
          if (event.request.url.includes('/_next/static/') || 
              event.request.url.includes('.css') || 
              event.request.url.includes('.js') ||
              event.request.destination === 'style' ||
              event.request.destination === 'script') {
            
            console.log('🔧 Caching static asset:', event.request.url);
            
            // Cache successful responses
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse.clone());
              });
            }
          }
          
          return networkResponse;
        }).catch(() => {
          // If offline and not in cache, return a basic response for CSS/JS
          if (event.request.url.includes('.css')) {
            return new Response('/* Offline - CSS not available */', {
              headers: { 'Content-Type': 'text/css' }
            });
          }
          if (event.request.url.includes('.js')) {
            return new Response('// Offline - JS not available', {
              headers: { 'Content-Type': 'application/javascript' }
            });
          }
          // For other requests, just fail
          throw error;
        });
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

// Handle HTTP range requests for video/audio files
function handleRangeRequest(cachedResponse, rangeHeader) {
  return cachedResponse.arrayBuffer().then(buffer => {
    const bytes = new Uint8Array(buffer);
    const totalLength = bytes.length;
    
    // Parse range header (e.g., "bytes=0-1023" or "bytes=1024-")
    const range = rangeHeader.replace('bytes=', '');
    const [startStr, endStr] = range.split('-');
    
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : totalLength - 1;
    
    console.log('🔧 Serving range:', start, '-', end, 'of', totalLength);
    
    // Extract the requested byte range
    const slice = bytes.slice(start, end + 1);
    
    // Create response with proper headers
    const headers = new Headers();
    headers.set('Content-Range', `bytes ${start}-${end}/${totalLength}`);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Length', slice.length.toString());
    headers.set('Content-Type', cachedResponse.headers.get('Content-Type') || 'video/mp4');
    
    return new Response(slice, {
      status: 206, // Partial Content
      statusText: 'Partial Content',
      headers: headers
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