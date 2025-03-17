"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./FeaturedPortfolio.module.css";

export default function FeaturedPortfolio({ artworks }) {
  // Filter valid artworks
  const validArtworks = artworks.filter(
    (artwork) => artwork?.image?.asset?.url
  );
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageVisible, setImageVisible] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  // Refs for tracking state and timeouts
  const timeoutsRef = useRef([]);
  const documentVisibleRef = useRef(true);
  
  const currentArtwork = validArtworks[currentIndex];
  
  // Helper to safely add a timeout and track it for cleanup
  const safeTimeout = (callback, delay) => {
    const id = setTimeout(callback, delay);
    timeoutsRef.current.push(id);
    return id;
  };
  
  // Helper to clear all tracked timeouts
  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(id => clearTimeout(id));
    timeoutsRef.current = [];
  };

  // Calculate proper display size while maintaining aspect ratio
  const calculateImageSize = (img) => {
    const maxHeight = window.innerHeight * 0.8;
    const maxWidth = window.innerWidth * 0.9;

    let width = img.width;
    let height = img.height;

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

    setImageSize({ width, height });
  };

  // Load image and handle resize
  useEffect(() => {
    if (!currentArtwork) return;
    
    const loadAndCalculateImage = () => {
      const img = new Image();
      img.onload = () => calculateImageSize(img);
      img.onerror = (err) => console.error("Failed to load image:", err);
      img.src = currentArtwork.image.asset.url;
    };
    
    loadAndCalculateImage();
    
    const handleResize = () => loadAndCalculateImage();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [currentArtwork]);

  // Handle visibility change (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      documentVisibleRef.current = document.visibilityState === 'visible';
      
      if (documentVisibleRef.current) {
        // Reset the sequence when tab becomes visible again
        clearAllTimeouts();
        showCurrentImage();
      } else {
        // Pause transitions when tab is not visible
        clearAllTimeouts();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Show current image then schedule next transition
  const showCurrentImage = () => {
    setImageVisible(true);
    
    if (validArtworks.length <= 1) return;
    
    const fadeTime = 2000;      // Fade transition time
    const displayTime = 3700;   // Time at full opacity
    
    // Schedule the next transition after fade-in completes plus display time
    safeTimeout(() => {
      hideAndAdvance();
    }, fadeTime + displayTime);
  };
  
  // Hide current image and advance to next
  const hideAndAdvance = () => {
    setImageVisible(false);
    
    const fadeTime = 2000;
    
    safeTimeout(() => {
      const nextIndex = (currentIndex + 1) % validArtworks.length;
      setCurrentIndex(nextIndex);
      
      // Preload next image and perform fade-in after a short delay
      safeTimeout(() => {
        showCurrentImage();
      }, 200);
    }, fadeTime);
  };

  // Start the initial fade-in once the image is loaded and sized
  useEffect(() => {
    if (!validArtworks.length || !imageSize.width || !documentVisibleRef.current) {
      return;
    }
    
    // Clear any existing timeouts
    clearAllTimeouts();
    
    // Start with initial fade-in
    safeTimeout(() => {
      showCurrentImage();
    }, 500);
    
    return () => clearAllTimeouts();
  }, [imageSize.width]);

  // Preload next image for smoother transitions
  useEffect(() => {
    if (validArtworks.length <= 1) return;
    
    const nextIndex = (currentIndex + 1) % validArtworks.length;
    const nextArtwork = validArtworks[nextIndex];
    
    if (nextArtwork) {
      const img = new Image();
      img.src = nextArtwork.image.asset.url;
    }
  }, [currentIndex, validArtworks]);

  if (!validArtworks.length) {
    return <div className={styles.container}>No images available</div>;
  }

  // CSS for transitions
  const imageStyle = {
    opacity: imageVisible ? 1 : 0,
    filter: imageVisible ? 'blur(0px)' : 'blur(10px)',
    transition: 'opacity 2s linear, filter 2s linear',
    width: `${imageSize.width}px`,
    height: `${imageSize.height}px`,
  };

  const captionStyle = {
    opacity: imageVisible ? 1 : 0,
    transition: 'opacity 2s linear',
  };

  return (
    <div className={styles.container}>
      <div className={styles.imageContainer}>
        {imageSize.width > 0 && currentArtwork && (
          <div
            className={styles.artwork}
            style={imageStyle}
          >
            <img
              src={currentArtwork.image.asset.url}
              alt={currentArtwork.title || "Artwork"}
              style={{ width: "100%", height: "100%"}}
            />
          </div>
        )}
      </div>

      {/* Caption */}
      <div
        className={styles.imageCaption}
        style={captionStyle}
      >
        {currentArtwork?.title}
      </div>
    </div>
  );
}