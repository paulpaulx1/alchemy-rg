// app/download-offline/page.js
'use client';
import { useState, useEffect } from 'react';
import styles from './offline.module.css';

export default function DownloadOffline() {
  console.log('DownloadOffline component starting...');
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cacheStatus, setCacheStatus] = useState(null);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [mediaUrls, setMediaUrls] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState('');
  const [cachedPortfolios, setCachedPortfolios] = useState([]);
  const [debugInfo, setDebugInfo] = useState('Loading...');

  useEffect(() => {
    console.log('useEffect running...');
    
    try {
      // Register service worker
      if ('serviceWorker' in navigator) {
        console.log('Registering service worker...');
        navigator.serviceWorker.register('/sw.js')
          .then(() => console.log('Service worker registered'))
          .catch(err => console.error('Service worker registration failed:', err));
      }
      
      // Get current cache status
      getCacheStatus();
      
      // Get cached portfolios list
      getCachedPortfolios();
      
      // Fetch portfolios list
      fetchPortfolios();
      
      // Listen for service worker messages
      if ('serviceWorker' in navigator) {
        const handleMessage = (event) => {
          console.log('SW Message received:', event.data);
          handleServiceWorkerMessage(event);
        };
        
        navigator.serviceWorker.addEventListener('message', handleMessage);
        
        // Also listen on the registration
        navigator.serviceWorker.ready.then(registration => {
          if (registration.active) {
            registration.active.addEventListener('message', handleMessage);
          }
        });
      }
    } catch (error) {
      console.error('Error in useEffect:', error);
      setDebugInfo(`Error in setup: ${error.message}`);
    }
    
    return () => {
      if ('serviceWorker' in navigator) {
        const handleMessage = (event) => handleServiceWorkerMessage(event);
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, []);

  const handleServiceWorkerMessage = (event) => {
    console.log('Service worker message:', event.data);
    if (event.data.type === 'CACHE_PROGRESS') {
      setProgress(event.data.progress);
    } else if (event.data.type === 'CACHE_COMPLETE') {
      console.log('Cache complete! Processing portfolio info...');
      setIsDownloading(false);
      setDownloadComplete(true);
      getCacheStatus();
      
      // Use portfolio data from the service worker message
      if (event.data.portfolioData) {
        addCachedPortfolio(event.data.portfolioData, event.data.mediaCount);
      }
    }
  };

  const getCachedPortfolios = () => {
    try {
      const cached = JSON.parse(localStorage.getItem('cachedPortfolios') || '[]');
      setCachedPortfolios(cached);
    } catch (error) {
      console.error('Error loading cached portfolios:', error);
      setCachedPortfolios([]);
    }
  };

  const fetchPortfolios = async () => {
    try {
      console.log('Fetching portfolios list...');
      setDebugInfo('Loading portfolios...');
      
      const response = await fetch('/api/portfolios');
      
      if (!response.ok) {
        throw new Error(`Portfolio API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Portfolios fetched:', data.portfolios.length);
      
      setPortfolios(data.portfolios);
      setDebugInfo(`Found ${data.portfolios.length} portfolios. Select one to cache.`);
      
    } catch (error) {
      console.error('Failed to fetch portfolios:', error);
      setDebugInfo(`Portfolio fetch error: ${error.message}`);
    }
  };

  const fetchMediaUrls = async (portfolioId) => {
    try {
      console.log('Fetching media URLs for portfolio:', portfolioId);
      setDebugInfo('Fetching media files...');
      
      const response = await fetch(`/api/media-urls?portfolio=${portfolioId}`);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      console.log('API response:', data);
      console.log('Total unique URLs found:', data.count);
      console.log('Sample URLs:', data.urls.slice(0, 3));
      console.log('Artworks found:', data.artworks?.length || 0);
      
      setMediaUrls(data.urls);
      setDebugInfo(`Found ${data.count} media files for selected portfolio`);
      
      return data; // Return the full data including artworks
      
    } catch (error) {
      console.error('Failed to fetch media URLs:', error);
      setDebugInfo(`API fetch error: ${error.message}`);
    }
  };

  const getCacheStatus = async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        console.log('Cache status:', event.data);
        setCacheStatus(event.data);
      };
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [messageChannel.port2]
      );
    }
  };

  const startDownload = async () => {
    console.log('Starting download...');
    
    if (!selectedPortfolio) {
      alert('Please select a portfolio first!');
      return;
    }
    
    if (!('serviceWorker' in navigator)) {
      alert('Service Worker not supported in this browser.');
      return;
    }
    
    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) {
      alert('Service Worker not ready. Please refresh the page.');
      return;
    }
    
    setIsDownloading(true);
    setProgress(0);
    setDownloadComplete(false);
    
    try {
      // Fetch media URLs for selected portfolio and wait for completion
      const mediaData = await fetchMediaUrls(selectedPortfolio);
      
      // Give React a moment to update state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use the media data from the API response
      const currentMediaUrls = mediaData?.urls || mediaUrls;
      
      if (currentMediaUrls.length === 0) {
        alert('No media files found for this portfolio.');
        setIsDownloading(false);
        return;
      }
      
      console.log('Sending URLs to service worker:', currentMediaUrls.length);
      
      // Get the portfolio data fresh from API to ensure we have it
      let portfolioSlug = null;
      let portfolioData = null;
      try {
        const portfolioResponse = await fetch('/api/portfolios');
        const apiData = await portfolioResponse.json();
        portfolioData = apiData.portfolios.find(p => p._id === selectedPortfolio);
        portfolioSlug = portfolioData?.slug;
        
        // Add artworks data to portfolio data for service worker
        if (portfolioData && mediaData?.artworks) {
          portfolioData.artworks = mediaData.artworks;
        }
        
        console.log('Portfolio data for caching:', {
          selectedPortfolio,
          selectedPortfolioData: portfolioData,
          portfolioSlug,
          allPortfolios: apiData.portfolios.length,
          artworksCount: portfolioData?.artworks?.length || 0
        });
      } catch (error) {
        console.error('Error fetching portfolio data:', error);
      }
      
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CACHE_MEDIA',
          urls: currentMediaUrls,
          portfolioSlug: portfolioSlug,
          portfolioData: portfolioData // Pass the portfolio data with the message
        });
      } else {
        alert('Service Worker controller not available. Please refresh the page.');
        setIsDownloading(false);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert(`Download failed: ${error.message}`);
      setIsDownloading(false);
    }
  };
  
  // Helper function to get current media URLs
  const getCurrentMediaUrls = async (portfolioId) => {
    try {
      const response = await fetch(`/api/media-urls?portfolio=${portfolioId}`);
      const data = await response.json();
      return data.urls || [];
    } catch (error) {
      console.error('Error fetching media URLs:', error);
      return [];
    }
  };

  const addCachedPortfolio = (portfolioData, mediaCount) => {
    try {
      console.log('addCachedPortfolio called with:', {
        portfolioData,
        mediaCount
      });
      
      if (portfolioData) {
        const portfolioInfo = {
          ...portfolioData,
          cachedAt: new Date().toLocaleString(),
          mediaCount: mediaCount || 14
        };
        
        console.log('Creating portfolio info:', portfolioInfo);
        
        setCachedPortfolios(prev => {
          const filtered = prev.filter(p => p._id !== portfolioData._id);
          const newList = [...filtered, portfolioInfo];
          console.log('New cached portfolios list:', newList);
          return newList;
        });
        
        // Store in localStorage for persistence
        try {
          const updatedCached = JSON.parse(localStorage.getItem('cachedPortfolios') || '[]');
          const filteredUpdated = updatedCached.filter(p => p._id !== portfolioData._id);
          const newCachedList = [...filteredUpdated, portfolioInfo];
          localStorage.setItem('cachedPortfolios', JSON.stringify(newCachedList));
          console.log('Saved to localStorage:', newCachedList);
        } catch (error) {
          console.error('Error saving to localStorage:', error);
        }
      } else {
        console.error('No portfolio data provided to addCachedPortfolio!');
      }
    } catch (error) {
      console.error('Error in addCachedPortfolio:', error);
    }
  };

  const clearCache = async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      setCacheStatus(null);
      setDownloadComplete(false);
      setCachedPortfolios([]);
      localStorage.removeItem('cachedPortfolios');
      alert('Cache cleared!');
    }
  };

  // Debug state logging
  console.log('Current state:', {
    isDownloading,
    mediaUrlsLength: mediaUrls.length,
    downloadComplete,
    hasServiceWorker: 'serviceWorker' in navigator,
    controllerExists: navigator.serviceWorker?.controller,
    debugInfo
  });

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>
          Download for Offline Viewing
        </h1>
        
        {/* Debug Info */}
        <div style={{backgroundColor: '#f0f0f0', padding: '1rem', marginBottom: '1rem', borderRadius: '4px'}}>
          <h3>Debug Info:</h3>
          <p><strong>Status:</strong> {debugInfo}</p>
          <p><strong>Selected portfolio:</strong> {selectedPortfolio ? portfolios.find(p => p._id === selectedPortfolio)?.title || 'Loading...' : 'None'}</p>
          <p><strong>Media URLs found:</strong> {mediaUrls.length}</p>
          <p><strong>Service Worker supported:</strong> {'serviceWorker' in navigator ? 'Yes' : 'No'}</p>
          <p><strong>Service Worker controller:</strong> {navigator.serviceWorker?.controller ? 'Yes' : 'No'}</p>
          <p><strong>Button disabled:</strong> {(isDownloading || !selectedPortfolio) ? 'Yes' : 'No'}</p>
          <p><strong>Is downloading:</strong> {isDownloading ? 'Yes' : 'No'}</p>
          <p><strong>Cached portfolios count:</strong> {cachedPortfolios.length}</p>
          <p><strong>LocalStorage data:</strong> {localStorage.getItem('cachedPortfolios') || 'None'}</p>
        </div>
        
        {/* Portfolio Selection */}
        <div className={styles.portfolioSelection}>
          <label htmlFor="portfolio-select" className={styles.selectLabel}>
            Choose a portfolio to cache:
          </label>
          <select 
            id="portfolio-select"
            value={selectedPortfolio} 
            onChange={(e) => setSelectedPortfolio(e.target.value)}
            className={styles.portfolioSelect}
          >
            <option value="">Select a portfolio...</option>
            {portfolios.map(portfolio => (
              <option key={portfolio._id} value={portfolio._id}>
                {portfolio.title} ({portfolio.artworkCount} pieces)
              </option>
            ))}
          </select>
        </div>
        
        <div className={styles.intro}>
          <p className={styles.description}>
            Select a portfolio above to download its videos, audio, and images for offline viewing. 
            Perfect for showing your work when WiFi is spotty!
          </p>
          
          {selectedPortfolio && mediaUrls.length > 0 && (
            <p className={styles.mediaCount}>
              Found {mediaUrls.length} media files to cache
            </p>
          )}
        </div>

        {/* Cached Portfolios List */}
        {cachedPortfolios.length > 0 && (
          <div className={styles.cachedPortfolios}>
            <h3 className={styles.cachedTitle}>Cached Portfolios (Available Offline)</h3>
            <div className={styles.cachedList}>
              {cachedPortfolios.map(portfolio => (
                <div key={portfolio._id} className={styles.cachedItem}>
                  <div className={styles.cachedItemHeader}>
                    <strong>{portfolio.title}</strong>
                    <span className={styles.cachedDate}>Cached: {portfolio.cachedAt}</span>
                  </div>
                  <div className={styles.cachedItemDetails}>
                    <span>{portfolio.mediaCount} media files cached</span>
                    <a 
                      href={`/portfolio/${portfolio.slug || portfolio._id}`} 
                      className={styles.cachedViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Portfolio →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cache Status */}
        {cacheStatus && (
          <div className={styles.cacheStatus}>
            <h3 className={styles.cacheTitle}>Current Cache Status</h3>
            <p className={styles.cacheInfo}>
              {cacheStatus.fileCount} files cached ({cacheStatus.formattedSize})
            </p>
          </div>
        )}

        {/* Download Progress */}
        {isDownloading && (
          <div className={styles.progressSection}>
            <div className={styles.progressHeader}>
              <span>Downloading...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {downloadComplete && (
          <div className={styles.successMessage}>
            <h3 className={styles.successTitle}>Download Complete!</h3>
            <p className={styles.successText}>
              The website is now available for offline viewing. You can browse all content even without internet.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.buttonGroup}>
          <button
            onClick={startDownload}
            disabled={isDownloading || !selectedPortfolio}
            className={styles.downloadButton}
          >
            {isDownloading ? 'Downloading...' : selectedPortfolio ? 'Download Portfolio for Offline' : 'Select Portfolio First'}
          </button>
          
          <button
            onClick={clearCache}
            className={styles.clearButton}
          >
            Clear Cache
          </button>
          
          <button
            onClick={() => {
              console.log('Manual test - Current state:', {
                cachedPortfolios,
                localStorage: localStorage.getItem('cachedPortfolios'),
                selectedPortfolio,
                portfolios: portfolios.length
              });
              // Force reload cached portfolios
              getCachedPortfolios();
            }}
            className={styles.clearButton}
          >
            Debug Cache
          </button>
          
          <button
            onClick={() => {
              // Manually add current portfolio to test the display
              const selectedPortfolioData = portfolios.find(p => p._id === selectedPortfolio);
              if (selectedPortfolioData) {
                const portfolioInfo = {
                  ...selectedPortfolioData,
                  cachedAt: new Date().toLocaleString(),
                  mediaCount: mediaUrls.length || 14
                };
                
                setCachedPortfolios(prev => [...prev, portfolioInfo]);
                
                const cached = JSON.parse(localStorage.getItem('cachedPortfolios') || '[]');
                const newList = [...cached, portfolioInfo];
                localStorage.setItem('cachedPortfolios', JSON.stringify(newList));
                
                console.log('Manually added portfolio:', portfolioInfo);
              }
            }}
            className={styles.clearButton}
          >
            Force Add Portfolio
          </button>
        </div>

        {/* Instructions */}
        <div className={styles.instructions}>
          <h3 className={styles.instructionsTitle}>How it works:</h3>
          <ul className={styles.instructionsList}>
            <li>• Downloads all videos, audio, and images to your device</li>
            <li>• Works offline after initial download</li>
            <li>• Automatically updates when you have good WiFi</li>
            <li>• Add this page to your home screen for easy access</li>
          </ul>
        </div>
      </div>
    </div>
  );
}