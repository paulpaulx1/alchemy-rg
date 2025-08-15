'use client';

import { useState, useEffect } from 'react';
import styles from '../app/portfolio/[slug]/[artworkSlug]/ArtworkPage.module.css';

// Get file size without downloading full image
async function getImageFileSize(imageUrl) {
  try {
    const response = await fetch(imageUrl, { 
      method: 'HEAD'
    });
    
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      return parseInt(contentLength, 10);
    }
  } catch (error) {
    console.warn('Could not determine image file size:', error);
  }
  
  return null;
}

// Simple connection detection
function getConnectionQuality() {
  if ('connection' in navigator) {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      const effectiveType = connection.effectiveType;
      const downlink = connection.downlink;
      
      if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 0.5) {
        return 40;
      } else if (effectiveType === '3g' || downlink < 1.5) {
        return 60;
      } else if (effectiveType === '4g' || downlink > 1.5) {
        return 85;
      }
    }
  }
  
  return 75;
}

// Determine quality based on both connection and file size
function getOptimalQuality(fileSizeBytes, connectionQuality) {
  if (!fileSizeBytes) return connectionQuality;
  
  const fileSizeMB = fileSizeBytes / (1024 * 1024);
  
  if (fileSizeMB > 3) {
    return Math.min(connectionQuality, 50);
  } else if (fileSizeMB > 1.5) {
    return Math.min(connectionQuality, 65);
  } else if (fileSizeMB > 0.8) {
    return Math.min(connectionQuality, 75);
  }
  
  return connectionQuality;
}

// Optimize with file size awareness
async function optimizeImageUrl(imageUrl) {
  if (!imageUrl) return imageUrl;
  
  const cleanUrl = imageUrl.split('?')[0];
  const connectionQuality = getConnectionQuality();
  
  const fileSize = await getImageFileSize(cleanUrl);
  const fileSizeMB = fileSize ? fileSize / (1024 * 1024) : 0;
  
  let quality = getOptimalQuality(fileSize, connectionQuality);
  let params = `auto=format&q=${quality}`;
  
  // For slow connections AND large files, add dimension constraints
  if (connectionQuality <= 60 && fileSizeMB > 0.8) {
    params += '&w=1200&fit=max';
    console.log('🚨 Slow connection + large file detected, adding size constraint');
  }
  
  return `${cleanUrl}?${params}`;
}

export default function ResponsiveArtworkImage({ src, alt, title, priority = false }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [optimizedSrc, setOptimizedSrc] = useState(src);

  // Connection-aware image optimization
  useEffect(() => {
    const optimizeImage = async () => {
      const connectionQuality = getConnectionQuality();
      const optimized = await optimizeImageUrl(src);
      setOptimizedSrc(optimized);
      
      if ('connection' in navigator) {
        const connection = navigator.connection;
        const fileSize = await getImageFileSize(src?.split('?')[0]);
        const fileSizeMB = fileSize ? (fileSize / (1024 * 1024)).toFixed(2) : 'unknown';
        
        console.log('🌐 Smart Image Optimization:', {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink + ' Mbps',
          originalFileSize: fileSizeMB + ' MB',
          connectionQuality: connectionQuality + '%',
          finalQuality: optimized.includes('q=') ? optimized.match(/q=(\d+)/)[1] + '%' : 'default',
          optimizedUrl: optimized
        });
      }
    };
    
    optimizeImage();
  }, [src]);

  useEffect(() => {
    const checkMenuState = () => {
      const menuOverlay = document.querySelector('.navigationOverlay.open, .navigation-overlay.open, [class*="overlay"][class*="open"]');
      const menuPanel = document.querySelector('.navigationPanel.open, .navigation-panel.open, [class*="panel"][class*="open"]');
      const menuButton = document.querySelector('[aria-expanded="true"]');
      
      const menuIsOpen = !!(menuOverlay || menuPanel || menuButton);
      setIsMenuOpen(menuIsOpen);
    };

    checkMenuState();

    const observer = new MutationObserver(() => {
      checkMenuState();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-expanded']
    });

    document.addEventListener('click', checkMenuState);

    return () => {
      observer.disconnect();
      document.removeEventListener('click', checkMenuState);
    };
  }, []);

  const handleImageLoad = (e) => {
    const img = e.target;
    const isPortrait = img.naturalHeight > img.naturalWidth;
    
    img.classList.remove(styles.portraitImage, styles.landscapeImage);
    
    if (isPortrait) {
      img.classList.add(styles.portraitImage);
    } else {
      img.classList.add(styles.landscapeImage);
    }
  };

  return (
    <img
      src={optimizedSrc}
      alt={alt || title || "Untitled artwork"}
      className={`${styles.artworkImage} ${isMenuOpen ? styles.menuOpen : ''}`}
      onLoad={handleImageLoad}
      loading={priority ? 'eager' : 'lazy'}
    />
  );
}