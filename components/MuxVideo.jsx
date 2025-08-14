// components/MuxVideo.js
'use client';

import MuxPlayer from '@mux/mux-player-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './MuxVideo.module.css';

export default function MuxVideo({ 
  playbackId, 
  poster, 
  title, 
  className = '',
  ...props 
}) {
  const [containerStyle, setContainerStyle] = useState({});
  const [aspectRatio, setAspectRatio] = useState(null);
  const containerRef = useRef(null);

  console.log('MuxVideo received playbackId:', playbackId);

  if (!playbackId) {
    console.log('No playbackId provided!');
    return (
      <div className={`${styles.videoError} ${className}`}>
        <p>Video not available</p>
      </div>
    );
  }

  // Set up CSS custom property for viewport height (Safari mobile fix)
  useEffect(() => {
    const setViewportHeight = () => {
      // Use document.documentElement.clientHeight for more reliable mobile measurements
      const vh = document.documentElement.clientHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);

    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
    };
  }, []);

  // Calculate optimal container dimensions
  const calculateContainerDimensions = useCallback((videoWidth, videoHeight, isSafari = false) => {
    const ratio = videoWidth / videoHeight;
    // Use document.documentElement.clientHeight for more reliable mobile measurements
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    
    let containerHeight, containerWidth;
    
    if (ratio < 0.8) {
      // Vertical video
      let maxHeight = viewportHeight * 0.85;
      
      // Reduce height on wide screens (desktop/tablet landscape)
      if (viewportWidth > 768) {
        const originalMaxHeight = maxHeight;
        maxHeight = Math.min(maxHeight, viewportHeight - 280);
        console.log(`Wide screen detected (${viewportWidth}px). Original maxHeight: ${originalMaxHeight}, reduced to: ${maxHeight}`);
      }
      
      containerHeight = Math.min(maxHeight, 800);
      containerWidth = containerHeight * ratio;
      
      // Safari-specific adjustments
      if (isSafari) {
        containerWidth = containerWidth * 0.9;
        containerHeight = containerHeight * 0.85; // Reduce height by 15% for Safari
        console.log('Applied Safari-specific width and height reduction');
      }
      
      // Ensure width never exceeds reasonable viewport limits
      const maxAllowedWidth = Math.min(viewportWidth * 0.9, 600);
      if (containerWidth > maxAllowedWidth) {
        containerWidth = maxAllowedWidth;
        containerHeight = containerWidth / ratio;
      }
      
      console.log(`Vertical video calculations - ratio: ${ratio}, containerHeight: ${containerHeight}, containerWidth: ${containerWidth}, maxAllowedWidth: ${maxAllowedWidth}, Safari: ${isSafari}`);
      
      // Mobile-specific constraints
      if (viewportWidth <= 768) {
        const maxMobileWidth = viewportWidth * 0.95;
        if (containerWidth > maxMobileWidth) {
          containerWidth = maxMobileWidth;
          containerHeight = containerWidth / ratio;
        }
        
        const maxMobileHeight = viewportHeight * 0.8;
        if (containerHeight > maxMobileHeight) {
          containerHeight = maxMobileHeight;
          containerWidth = containerHeight * ratio;
        }
      } else {
        // Desktop: Ensure it doesn't get too wide on very tall screens
        if (containerWidth > viewportWidth * 0.6) {
          containerWidth = viewportWidth * 0.6;
          containerHeight = containerWidth / ratio;
        }
      }
    } else if (ratio > 1.2) {
      // Landscape video
      containerHeight = Math.min(viewportHeight * 0.7, 600);
      containerWidth = Math.min(viewportWidth * 0.9, containerHeight * ratio);
      
      if (containerWidth > viewportWidth * 0.9) {
        containerWidth = viewportWidth * 0.9;
        containerHeight = containerWidth / ratio;
      }
    } else {
      // Square-ish video
      const size = Math.min(viewportHeight * 0.75, viewportWidth * 0.75, 600);
      containerHeight = size;
      containerWidth = size;
    }

    return {
      width: `${containerWidth}px`,
      height: `${containerHeight}px`,
      maxWidth: 'none',
      maxHeight: 'none'
    };
  }, []);

  // Handle when video metadata is loaded
  const handleLoadedMetadata = (event) => {
    const video = event.target;
    
    // Safari sometimes fires loadedmetadata before dimensions are available
    if (!video.videoWidth || !video.videoHeight) {
      console.log('Safari being Safari - dimensions not ready yet, retrying...');
      
      let retryCount = 0;
      const maxRetries = 10;
      
      const retryInterval = setInterval(() => {
        retryCount++;
        console.log(`Safari retry attempt ${retryCount}/${maxRetries}`);
        
        if (video.videoWidth && video.videoHeight) {
          console.log('Safari retry successful - got dimensions:', video.videoWidth, 'x', video.videoHeight);
          clearInterval(retryInterval);
          
          const ratio = video.videoWidth / video.videoHeight;
          setAspectRatio(ratio);
          
          const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
          const newStyle = calculateContainerDimensions(video.videoWidth, video.videoHeight, isSafari);
          setContainerStyle(newStyle);
          
          console.log('Applied container style from retry (Safari):', newStyle);
          return;
        } 
        
        if (retryCount >= maxRetries) {
          console.log('Safari retry failed after', maxRetries, 'attempts - using fallback');
          clearInterval(retryInterval);
          
          setContainerStyle({
            width: '90vw',
            height: '70vh',
            maxWidth: '600px',
            maxHeight: 'none'
          });
        }
      }, 150);
      
      return;
    }
    
    const ratio = video.videoWidth / video.videoHeight;
    setAspectRatio(ratio);
    
    console.log(`Video dimensions: ${video.videoWidth}x${video.videoHeight}, aspect ratio: ${ratio}`);
    
    const newStyle = calculateContainerDimensions(video.videoWidth, video.videoHeight);
    setContainerStyle(newStyle);
    
    console.log('Applied container style:', newStyle);
  };

  // Additional event handler for Safari's quirks
  const handleCanPlay = (event) => {
    const video = event.target;
    
    if ((!aspectRatio || isNaN(aspectRatio)) && video.videoWidth && video.videoHeight) {
      console.log('Got dimensions from canplay event (Safari fallback)');
      handleLoadedMetadata(event);
    }
  };

  // Recalculate on window resize
  useEffect(() => {
    const handleResize = () => {
      if (aspectRatio && containerRef.current) {
        console.log('Window resized, recalculating...');
        const video = containerRef.current.querySelector('video');
        if (video && video.videoWidth && video.videoHeight) {
          console.log('Found video element, recalculating dimensions');
          const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
          const newStyle = calculateContainerDimensions(video.videoWidth, video.videoHeight, isSafari);
          setContainerStyle(newStyle);
          console.log('Applied new container style on resize:', newStyle);
        } else {
          console.log('No video element found for resize calculation');
        }
      } else {
        console.log('No aspect ratio available for resize calculation');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [aspectRatio, calculateContainerDimensions]);

  return (
    <div 
      ref={containerRef}
      className={`${styles.muxPlayerContainer} ${className}`}
      style={containerStyle}
    >
      <MuxPlayer
        playbackId={playbackId}
        poster={poster}
        title={title}
        streamType="on-demand"
        preload="metadata"
        controls
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        {...props}
      />
    </div>
  );
}