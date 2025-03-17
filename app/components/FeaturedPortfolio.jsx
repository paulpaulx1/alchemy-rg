"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./FeaturedPortfolio.module.css";

export default function FeaturedPortfolio({ artworks }) {
  // Filter valid artworks
  const validArtworks = artworks.filter(
    (artwork) => artwork?.image?.asset?.url && artwork?.lowResImage?.asset?.url
  );
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lowResOpacity, setLowResOpacity] = useState(0);
  const [highResOpacity, setHighResOpacity] = useState(0);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  // Avoid using state for transition tracking - use refs instead
  const isInitialLoadRef = useRef(true);
  const timeoutsRef = useRef([]);
  
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

  // The main sequence effect - improved for smoother transitions
  useEffect(() => {
    // Skip if no valid images or no dimensions calculated yet
    if (!validArtworks.length || !imageSize.width) {
      return;
    }
    
    // Skip if only one image (no need to transition)
    if (validArtworks.length <= 1) {
      setLowResOpacity(0);
      setHighResOpacity(1);
      return;
    }
    
    // Clear any existing timeouts to prevent overlapping sequences
    clearAllTimeouts();
    
    // Improved transition timing
    const transitionIn = 1000; // slower fade-in for smoother perception
    const blendTime = 1000;    // longer overlap between low-res and high-res
    const displayTime = 4000;  // longer display time for each image
    const transitionOut = 1500; // slower fade-out
    
    // If this is the initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      
      // Reset both opacities
      setLowResOpacity(0);
      setHighResOpacity(0);
      
      // Start sequence - more gradual now
      
      // First, fade in low-res image
      safeTimeout(() => {
        setLowResOpacity(1);
        
        // Begin fading in high-res while low-res is still visible
        safeTimeout(() => {
          setHighResOpacity(1);
          
          // Only start fading out low-res after high-res has had time to appear
          safeTimeout(() => {
            setLowResOpacity(0);
            
            // Display the high-res image for a while
            safeTimeout(() => {
              // Begin transition to next image
              setHighResOpacity(0);
              
              // After fade-out completes, move to next image
              safeTimeout(() => {
                const nextIndex = (currentIndex + 1) % validArtworks.length;
                setCurrentIndex(nextIndex);
              }, transitionOut);
            }, displayTime);
          }, blendTime);
        }, transitionIn);
      }, 300);
    } else {
      // For subsequent transitions - smoother sequence
      
      // Start with low-res image fading in
      setLowResOpacity(1);
      setHighResOpacity(0);
      
      // Begin fading in high-res while low-res is still visible
      safeTimeout(() => {
        setHighResOpacity(1);
        
        // Only start fading out low-res after high-res has had time to appear
        safeTimeout(() => {
          setLowResOpacity(0);
          
          // Display the high-res image for a while
          safeTimeout(() => {
            // Begin transition to next image
            setHighResOpacity(0);
            
            // After fade-out completes, move to next image
            safeTimeout(() => {
              const nextIndex = (currentIndex + 1) % validArtworks.length;
              setCurrentIndex(nextIndex);
            }, transitionOut);
          }, displayTime);
        }, blendTime);
      }, transitionIn);
    }
    
    // Clean up all timeouts when the effect re-runs or component unmounts
    return () => {
      clearAllTimeouts();
    };
  }, [currentIndex, validArtworks.length, imageSize.width]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, []);

  // Preload next image for smoother transitions
  useEffect(() => {
    if (validArtworks.length <= 1) return;
    
    const nextIndex = (currentIndex + 1) % validArtworks.length;
    const nextArtwork = validArtworks[nextIndex];
    
    if (nextArtwork) {
      const highResImg = new Image();
      highResImg.src = nextArtwork.image.asset.url;
      
      const lowResImg = new Image();
      lowResImg.src = nextArtwork.lowResImage.asset.url;
    }
  }, [currentIndex, validArtworks]);

  if (!validArtworks.length) {
    return <div className={styles.container}>No images available</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.imageContainer}>
        {imageSize.width > 0 && currentArtwork && (
          <>
            {/* Low-res image */}
            <div
              className={styles.artwork}
              style={{
                opacity: lowResOpacity,
                transition: "opacity 1.5s ease-in-out", // Longer, smoother transition
                width: `${imageSize.width}px`,
                height: `${imageSize.height}px`,
              }}
            >
              <img
                src={currentArtwork.lowResImage.asset.url}
                alt={currentArtwork.title || "Artwork"}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "blur(8px)", // Slightly stronger blur for better effect
                }}
              />
            </div>

            {/* High-res image */}
            <div
              className={styles.artwork}
              style={{
                opacity: highResOpacity,
                transition: "opacity .5s ease-in-out", 
                width: `${imageSize.width}px`,
                height: `${imageSize.height}px`,
              }}
            >
              <img
                src={currentArtwork.image.asset.url}
                alt={currentArtwork.title || "Artwork"}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          </>
        )}
      </div>

      {/* Caption */}
      <div
        className={styles.imageCaption}
        style={{
          opacity: lowResOpacity || highResOpacity ? 1 : 0,
          transition: "opacity 1.5s ease-in-out",
        }}
      >
        {currentArtwork?.title}
      </div>
    </div>
  );
}