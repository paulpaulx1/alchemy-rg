"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./FeaturedPortfolio.module.css";

export default function FeaturedPortfolio({ portfolioId, firstArtwork }) {
  // State for all artworks
  const [allArtworks, setAllArtworks] = useState([firstArtwork]);
  const [isLoadingMore, setIsLoadingMore] = useState(true);
  
  // Slideshow state - exact same as original
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [activeContainer, setActiveContainer] = useState('A');
  
  // Image states for both containers
  const [imageA, setImageA] = useState({ opacity: '0', filter: 'blur(10px)', width: 'auto', height: 'auto', src: '' });
  const [imageB, setImageB] = useState({ opacity: '0', filter: 'blur(10px)', width: 'auto', height: 'auto', src: '' });
  
  // Refs for timeouts
  const timeoutsRef = useRef([]);
  
  // Fetch remaining artworks in background
  useEffect(() => {
    const fetchRemainingArtworks = async () => {
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
                url: artwork.image.asset.optimizedUrl || artwork.image.asset.url
              }
            }
          }));
          
          setAllArtworks(prev => [...prev, ...validRemaining]);
        }
      } catch (error) {
        console.error('Error fetching remaining artworks:', error);
      } finally {
        setIsLoadingMore(false);
      }
    };
    
    if (portfolioId) {
      fetchRemainingArtworks();
    }
  }, [portfolioId]);
  
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
  
  // Set image to container - exact same logic as original
  const setImageToContainer = (containerType, url, forceRecalculate = false) => {
    return new Promise((resolve) => {
      const tempImg = new Image();
      tempImg.onload = () => {
        // Calculate size - exact same as original
        const maxHeight = window.innerHeight * 0.8;
        const maxWidth = window.innerWidth * 0.9;
        
        let width = tempImg.width;
        let height = tempImg.height;
        
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = height * ratio;
        }
        
        if (height > maxHeight) {
          const ratio = maxHeight / height;
          height = maxHeight;
          width = width * ratio;
        }
        
        // Update the appropriate container state
        const imageState = {
          width: `${width}px`,
          height: `${height}px`,
          src: url,
          opacity: forceRecalculate ? (containerType === activeContainer ? '1' : '0') : '0',
          filter: forceRecalculate ? (containerType === activeContainer ? 'blur(0px)' : 'blur(10px)') : 'blur(10px)'
        };
        
        if (containerType === 'A') {
          setImageA(imageState);
        } else {
          setImageB(imageState);
        }
        
        resolve();
      };
      
      tempImg.onerror = () => {
        console.error("Failed to load image:", url);
        resolve();
      };
      
      tempImg.src = url;
    });
  };
  
  // Handle window resize - recalculate image dimensions
  useEffect(() => {
    const handleResize = () => {
      // Recalculate dimensions for currently visible images
      if (imageA.src && validArtworks.length > 0) {
        setImageToContainer('A', imageA.src, true);
      }
      if (imageB.src && validArtworks.length > 0) {
        setImageToContainer('B', imageB.src, true);
      }
    };
    
    // Debounce resize events
    let resizeTimeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 150);
    };
    
    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, [imageA.src, imageB.src, activeContainer, validArtworks.length]);
  
  // Start slideshow - simplified logic
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
          setImageA(prev => ({ ...prev, opacity: '0', filter: 'blur(10px)' }));
        } else {
          setImageB(prev => ({ ...prev, opacity: '0', filter: 'blur(10px)' }));
        }
        
        // Start fading in the next image after a short delay (creates overlap)
        addTimeout(() => {
          // Fade in inactive container
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
  
  // Handle visibility change - restart on tab focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Clear everything and restart fresh
        clearAllTimeouts();
        setIsRunning(false);
        
        // Reset to clean state and restart
        setTimeout(() => {
          if (validArtworks.length > 0) {
            startSlideshow();
          }
        }, 100);
      } else {
        // Pause by clearing timeouts
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
  
  // Handle window focus as backup
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
      
      {/* Loading Indicator */}
      {isLoadingMore && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 1000
          }}
        >
          Loading more images...
        </div>
      )}
    </div>
  );
}