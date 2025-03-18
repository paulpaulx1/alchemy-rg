"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./FeaturedPortfolio.module.css";

export default function FeaturedPortfolio({ artworks }) {
  // Filter valid artworks
  const validArtworks = artworks.filter(
    (artwork) => artwork?.image?.asset?.url
  );
  
  // State for component key to force full remount
  const [componentKey, setComponentKey] = useState(0);
  
  // Refs for DOM elements and state
  const containerRef = useRef(null);
  const indexRef = useRef(0);
  const timeoutsRef = useRef([]);
  const isRunningRef = useRef(false);
  const cleanupFunctionRef = useRef(null);
  
  // Force remount when navigating back to page
  useEffect(() => {
    // Reset the component when it mounts
    indexRef.current = 0;
    isRunningRef.current = false;
    
    // Force remount when the component becomes visible after navigation
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isRunningRef.current) {
        setComponentKey(prev => prev + 1);
      }
    };
    
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);
  
  useEffect(() => {
    // Don't do anything if no artworks
    if (!validArtworks.length) return;
    
    // Get container
    const container = containerRef.current;
    if (!container) return;
    
    // Clear existing content and timeouts
    container.innerHTML = '';
    timeoutsRef.current.forEach(id => clearTimeout(id));
    timeoutsRef.current = [];
    
    // Create two permanent image containers
    const imageContainerA = document.createElement('div');
    imageContainerA.className = styles.imageContainer;
    imageContainerA.style.position = 'relative';
    container.appendChild(imageContainerA);
    
    const imageContainerB = document.createElement('div');
    imageContainerB.className = styles.imageContainer;
    imageContainerB.style.position = 'relative';
    container.appendChild(imageContainerB);
    
    // Create artwork elements for each container
    const artworkA = document.createElement('div');
    artworkA.className = styles.artwork;
    artworkA.style.opacity = '0';
    artworkA.style.transition = 'opacity 2s ease-in, filter 2s ease-in';
    artworkA.style.position = 'absolute';
    imageContainerA.appendChild(artworkA);
    
    const artworkB = document.createElement('div');
    artworkB.className = styles.artwork;
    artworkB.style.opacity = '0';
    artworkB.style.transition = 'opacity 2s ease-in, filter 2s ease-in';
    artworkB.style.position = 'absolute';
    imageContainerB.appendChild(artworkB);
    
    // Create image elements
    const imgA = document.createElement('img');
    imgA.style.width = '100%';
    imgA.style.height = '100%';
    imgA.style.objectFit = 'cover';
    artworkA.appendChild(imgA);
    
    const imgB = document.createElement('img');
    imgB.style.width = '100%';
    imgB.style.height = '100%';
    imgB.style.objectFit = 'cover';
    artworkB.appendChild(imgB);
    
    // Track which container is active
    let activeContainer = 'A';
    
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
    
    // Set image to container and calculate size
    const setImageToContainer = (container, img, artwork, url) => {
      return new Promise((resolve) => {
        // Load image to get dimensions
        const tempImg = new Image();
        tempImg.onload = () => {
          // Calculate size
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
          
          // Set sizes and image
          artwork.style.width = `${width}px`;
          artwork.style.height = `${height}px`;
          img.src = url;
          img.alt = "Artwork";
          
          resolve();
        };
        
        tempImg.onerror = () => {
          console.error("Failed to load image:", url);
          resolve();
        };
        
        tempImg.src = url;
      });
    };
    
    // Start slideshow
    const startSlideshow = async () => {
      if (isRunningRef.current) return;
      isRunningRef.current = true;
      
      // Get current image
      const index = indexRef.current;
      const artwork = validArtworks[index];
      if (!artwork) return;
      
      // Get inactive elements
      const inactiveArtwork = activeContainer === 'A' ? artworkB : artworkA;
      const inactiveImg = activeContainer === 'A' ? imgB : imgA;
      
      // Get active elements
      const activeArtwork = activeContainer === 'A' ? artworkA : artworkB;
      const activeImg = activeContainer === 'A' ? imgA : imgB;
      
      // Set current image to active container
      await setImageToContainer(
        activeContainer === 'A' ? imageContainerA : imageContainerB,
        activeImg,
        activeArtwork,
        artwork.image.asset.url
      );
      
      // Ensure blur is applied initially
      activeArtwork.style.filter = 'blur(10px)';
      
      // Add a delay before starting fade in
      setTimeout(() => {
        // Fade in active container
        activeArtwork.style.opacity = '1';
        activeArtwork.style.filter = 'blur(0px)';
        
        // If only one image, we're done
        if (validArtworks.length <= 1) {
          isRunningRef.current = false;
          return;
        }
        
        // Schedule transition to next image
        addTimeout(async () => {
          // Get next image
          const nextIndex = (index + 1) % validArtworks.length;
          const nextArtwork = validArtworks[nextIndex];
          
          // Set next image to inactive container
          await setImageToContainer(
            activeContainer === 'A' ? imageContainerB : imageContainerA,
            inactiveImg,
            inactiveArtwork,
            nextArtwork.image.asset.url
          );
          
          // Start fading out active container
          activeArtwork.style.opacity = '0';
          activeArtwork.style.filter = 'blur(10px)';
          
          // Start fading in the next image after a short delay (creates overlap)
          addTimeout(() => {
            // Fade in inactive container
            inactiveArtwork.style.opacity = '1';
            inactiveArtwork.style.filter = 'blur(0px)';
            
            // After fade in completes, swap containers and continue
            addTimeout(() => {
              // Update tracking
              indexRef.current = nextIndex;
              activeContainer = activeContainer === 'A' ? 'B' : 'A';
              isRunningRef.current = false;
              
              // Start next cycle
              startSlideshow();
            }, 2000); // Fade in time
          }, 300); // 300ms overlap - current image starts fading out, then next image starts fading in
        }, 3200); // Display time
      }, 50); // Small delay for initial transition
    };
    
    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (!isRunningRef.current) {
          // Resume slideshow if not running
          clearAllTimeouts();
          startSlideshow();
        }
      } else {
        // Pause by clearing timeouts
        clearAllTimeouts();
        isRunningRef.current = false;
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Start the slideshow
    startSlideshow();
    
    // Store cleanup function
    cleanupFunctionRef.current = () => {
      clearAllTimeouts();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    
    // Cleanup
    return () => {
      if (cleanupFunctionRef.current) {
        cleanupFunctionRef.current();
      }
    };
  }, [validArtworks, componentKey]); // Added componentKey as dependency
  
  // Clean up when unmounting
  useEffect(() => {
    return () => {
      if (cleanupFunctionRef.current) {
        cleanupFunctionRef.current();
      }
    };
  }, []);
  
  return (
    <div ref={containerRef} className={styles.container}>
      {!validArtworks.length && <div>No images available</div>}
    </div>
  );
}