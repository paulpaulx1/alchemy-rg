"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./FeaturedPortfolio.module.css";

export default function FeaturedPortfolio({ portfolioId, firstArtwork }) {
  // Helper to optimize image URL with very minimal compression - only when needed
  const optimizeImageUrl = (url) => {
    if (!url) return url;
    
    // Check if URL is already optimized (has query parameters)
    if (url.includes('?')) {
      return url; // Already optimized, don't modify
    }
    
    // Extract dimensions from Sanity URL if available
    const dimensionMatch = url.match(/-(\d+)x(\d+)\./);
    let originalWidth, originalHeight;
    
    if (dimensionMatch) {
      originalWidth = parseInt(dimensionMatch[1]);
      originalHeight = parseInt(dimensionMatch[2]);
    }
    
    // If we can estimate the file size, apply very minimal compression only if needed
    if (originalWidth && originalHeight) {
      // Rough estimate: assume ~3 bytes per pixel for JPEG
      const estimatedSize = (originalWidth * originalHeight * 3) / 1024; // KB
      
      // Only compress if estimated size > 1000KB (much more conservative)
      if (estimatedSize > 1000) {
        // Get screen dimensions for intelligent sizing
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
        
        // Very conservative resizing - only if absolutely necessary
        let targetWidth = originalWidth;
        let targetHeight = originalHeight;
        
        // Only resize if image is absolutely huge AND larger than needed for display
        const maxDisplayWidth = screenWidth * 1.2; // Allow bigger than screen
        const maxDisplayHeight = screenHeight * 1.2;
        
        if (originalWidth > maxDisplayWidth * 2 || originalHeight > maxDisplayHeight * 2) {
          // Only resize if image is more than 2x what's needed for display
          targetWidth = Math.min(originalWidth, maxDisplayWidth * 1.8);
          targetHeight = Math.min(originalHeight, maxDisplayHeight * 1.8);
          
          // Maintain aspect ratio
          const aspectRatio = originalWidth / originalHeight;
          if (targetWidth / aspectRatio < targetHeight) {
            targetHeight = targetWidth / aspectRatio;
          } else {
            targetWidth = targetHeight * aspectRatio;
          }
        }
        
        // Use very high quality
        const quality = 96;
        
        return `${url}?w=${Math.round(targetWidth)}&h=${Math.round(targetHeight)}&fit=max&auto=format&q=${quality}`;
      }
    }
    
    // For images likely under 1000KB, just add format optimization with highest quality
    return `${url}?auto=format&q=98`;
  };

  // State for all artworks - start with first one (don't re-optimize)
  const [allArtworks, setAllArtworks] = useState(
    firstArtwork ? [firstArtwork] : [] // Use firstArtwork as-is, already optimized by page.js
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasLoadedAll, setHasLoadedAll] = useState(false);
  
  // Slideshow state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [activeContainer, setActiveContainer] = useState('A');
  
  // Image states for both containers
  const [imageA, setImageA] = useState({ opacity: '0', filter: 'blur(40px)', width: 'auto', height: 'auto', src: '' });
  const [imageB, setImageB] = useState({ opacity: '0', filter: 'blur(40px)', width: 'auto', height: 'auto', src: '' });
  
  // Refs for timeouts and fetch tracking
  const timeoutsRef = useRef([]);
  const fetchedRef = useRef(false); // Prevent duplicate fetches in dev mode
  
  // Fetch remaining artworks once when component mounts
  useEffect(() => {
    if (!portfolioId || !firstArtwork || hasLoadedAll || isLoadingMore) return;
    
    const fetchRemainingArtworks = async () => {
      setIsLoadingMore(true);
      
      try {
        const response = await fetch(`/api/artworks/${portfolioId}`);
        const remainingData = await response.json();
        
        if (remainingData?.artworks?.length > 0) {
          const validRemaining = remainingData.artworks.filter(
            (artwork) => artwork?.image?.asset?.url
          ).map(artwork => ({
            ...artwork,
            image: {
              asset: {
                url: optimizeImageUrl(artwork.image.asset.url)
              }
            }
          }));
          
          // Skip the first artwork if we already have firstArtwork to avoid duplication
          const artworksToAdd = firstArtwork && validRemaining.length > 0 
            ? validRemaining.slice(1) 
            : validRemaining;
          
          setAllArtworks(prev => [...prev, ...artworksToAdd]);
        }
        
        setHasLoadedAll(true);
      } catch (error) {
        console.error('Error fetching remaining artworks:', error);
      } finally {
        setIsLoadingMore(false);
      }
    };
    
    fetchRemainingArtworks();
  }, []); // Empty dependency array - only run once on mount
  
  // Filter valid artworks
  const validArtworks = allArtworks.filter(
    (artwork) => artwork?.image?.asset?.url
  );
  
  // Helper to add a timeout and track it
  const addTimeout = (callback, delay) => {
    const id = setTimeout(callback, delay);
    timeoutsRef.current.push(id);
    return id;
  };
  
  // Helper to clear all timeouts
  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(id => clearTimeout(id));
    timeoutsRef.current = [];
  };
  
  // Set image to container - improved error handling
  const setImageToContainer = (containerType, url, forceRecalculate = false) => {
    return new Promise((resolve) => {
      // Don't try to load if URL is invalid
      if (!url || typeof url !== 'string') {
        resolve();
        return;
      }
      
      const tempImg = new window.Image();
      
      tempImg.onload = () => {
        try {
          // Calculate size with better bounds checking
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;
          
          // Safety checks
          if (!viewportHeight || !viewportWidth || !tempImg.width || !tempImg.height) {
            resolve();
            return;
          }
          
          const maxHeight = viewportHeight * 0.8;
          const maxWidth = viewportWidth * 0.9;
          
          let width = tempImg.width;
          let height = tempImg.height;
          
          // Calculate aspect ratio once
          const aspectRatio = width / height;
          
          // Resize logic with better precision
          if (width > maxWidth) {
            width = maxWidth;
            height = width / aspectRatio;
          }
          
          if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
          }
          
          // Ensure we have valid dimensions
          if (width <= 0 || height <= 0 || !isFinite(width) || !isFinite(height)) {
            resolve();
            return;
          }
          
          // Update the appropriate container state
          const imageState = {
            width: `${Math.round(width)}px`,
            height: `${Math.round(height)}px`,
            src: url,
            opacity: forceRecalculate ? (containerType === activeContainer ? '1' : '0') : '0',
            filter: forceRecalculate ? (containerType === activeContainer ? 'blur(0px)' : 'blur(40px)') : 'blur(40px)'
          };
          
          if (containerType === 'A') {
            setImageA(imageState);
          } else {
            setImageB(imageState);
          }
          
          resolve();
        } catch (error) {
          console.error("Error calculating image dimensions:", error);
          resolve();
        }
      };
      
      tempImg.onerror = () => {
        console.error("Failed to load image:", url);
        resolve();
      };
      
      // Add timeout for loading
      const loadTimeout = setTimeout(() => {
        console.warn("Image load timeout:", url);
        resolve();
      }, 5000);
      
      const originalOnLoad = tempImg.onload;
      const originalOnError = tempImg.onerror;
      
      tempImg.onload = function(...args) {
        clearTimeout(loadTimeout);
        originalOnLoad.apply(this, args);
      };
      
      tempImg.onerror = function(...args) {
        clearTimeout(loadTimeout);
        originalOnError.apply(this, args);
      };
      
      tempImg.src = url;
    });
  };
  
  // Handle window resize - improved stability
  useEffect(() => {
    let resizeTimeout;
    
    const handleResize = () => {
      // Clear any existing timeout
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      
      // Debounce the resize handling
      resizeTimeout = setTimeout(() => {
        // Only recalculate if we have valid images and they're loaded
        if (imageA.src && imageA.width !== 'auto') {
          setImageToContainer('A', imageA.src, true);
        }
        if (imageB.src && imageB.width !== 'auto') {
          setImageToContainer('B', imageB.src, true);
        }
      }, 200); // Increased debounce time
    };
    
    window.addEventListener('resize', handleResize, { passive: true });
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
    };
  }, []); // Remove dependencies to avoid re-adding listeners
  
  // Start slideshow
  const startSlideshow = async () => {
    if (isRunning) return;
    setIsRunning(true);
    
    const artwork = validArtworks[currentIndex];
    if (!artwork) {
      setIsRunning(false);
      return;
    }
    
    // Set current image to active container
    await setImageToContainer(activeContainer, artwork.image.asset.url);
    
    // Add a delay before starting fade in
    setTimeout(() => {
      // Fade in active container
      if (activeContainer === 'A') {
        setImageA(prev => ({ ...prev, opacity: '1', filter: 'blur(0px)' }));
      } else {
        setImageB(prev => ({ ...prev, opacity: '1', filter: 'blur(0px)' }));
      }
      
      // If only one image, we're done
      if (validArtworks.length <= 1) {
        setIsRunning(false);
        return;
      }
      
      // Schedule transition to next image
      addTimeout(async () => {
        // Get next image
        const nextIndex = (currentIndex + 1) % validArtworks.length;
        const nextArtwork = validArtworks[nextIndex];
        
        // Set next image to inactive container
        const inactiveContainer = activeContainer === 'A' ? 'B' : 'A';
        await setImageToContainer(inactiveContainer, nextArtwork.image.asset.url);
        
        // Start fading out active container
        if (activeContainer === 'A') {
          setImageA(prev => ({ ...prev, opacity: '0', filter: 'blur(40px)' }));
        } else {
          setImageB(prev => ({ ...prev, opacity: '0', filter: 'blur(40px)' }));
        }
        
        // Start fading in the next image after a short delay
        addTimeout(() => {
          if (inactiveContainer === 'A') {
            setImageA(prev => ({ ...prev, opacity: '1', filter: 'blur(0px)' }));
          } else {
            setImageB(prev => ({ ...prev, opacity: '1', filter: 'blur(0px)' }));
          }
          
          // After fade in completes, update state for next cycle
          addTimeout(() => {
            setCurrentIndex(nextIndex);
            setActiveContainer(inactiveContainer);
            setIsRunning(false);
          }, 2000); // Fade in time
        }, 300); // 300ms overlap
      }, 3200); // Display time
    }, 50); // Small delay for initial transition
  };
  
  // Start slideshow when ready and not running
  useEffect(() => {
    if (validArtworks.length > 0 && !isRunning) {
      const timer = setTimeout(() => {
        startSlideshow();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [validArtworks.length, currentIndex, isRunning]);
  
  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        clearAllTimeouts();
        setIsRunning(false);
        
        setTimeout(() => {
          if (validArtworks.length > 0) {
            startSlideshow();
          }
        }, 100);
      } else {
        clearAllTimeouts();
        setIsRunning(false);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearAllTimeouts();
    };
  }, [validArtworks.length]);
  
  // Handle window focus
  useEffect(() => {
    const handleFocus = () => {
      if (!isRunning && validArtworks.length > 0) {
        clearAllTimeouts();
        setTimeout(() => {
          startSlideshow();
        }, 100);
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [isRunning, validArtworks.length]);
  
  return (
    <div className={styles.container}>
      {!validArtworks.length && <div>No images available</div>}
      
      {/* Image Container A */}
      <div className={styles.imageContainer} style={{ position: 'relative' }}>
        <div
          className={styles.artwork}
          style={{
            opacity: imageA.opacity,
            transition: 'opacity 2s ease-in, filter 2s ease-in',
            position: 'absolute',
            filter: imageA.filter,
            width: imageA.width,
            height: imageA.height,
          }}
        >
          {imageA.src && (
            <img
              src={imageA.src}
              alt="Artwork"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}
        </div>
      </div>
      
      {/* Image Container B */}
      <div className={styles.imageContainer} style={{ position: 'relative' }}>
        <div
          className={styles.artwork}
          style={{
            opacity: imageB.opacity,
            transition: 'opacity 2s ease-in, filter 2s ease-in',
            position: 'absolute',
            filter: imageB.filter,
            width: imageB.width,
            height: imageB.height,
          }}
        >
          {imageB.src && (
            <img
              src={imageB.src}
              alt="Artwork"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}