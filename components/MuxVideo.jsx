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
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const cleanupTimeoutRef = useRef(null);

  console.log('MuxVideo received playbackId:', playbackId);

  if (!playbackId) {
    console.log('No playbackId provided!');
    return (
      <div className={`${styles.videoError} ${className}`}>
        <p>Video not available</p>
      </div>
    );
  }

  // AGGRESSIVE reset when playbackId changes
  useEffect(() => {
    console.log('🔄 PlaybackId changed, HARD RESET of all state');
    
    // Force immediate DOM style reset
    if (containerRef.current) {
      containerRef.current.style.width = '';
      containerRef.current.style.height = '';
      containerRef.current.style.maxWidth = '';
      containerRef.current.style.maxHeight = '';
      console.log('💥 FORCED DOM RESET - cleared all inline styles');
    }
    
    // Reset React state
    setContainerStyle({});
    setAspectRatio(null);
    setError(null);
    setRetryCount(0);
  }, [playbackId]);

  // Cleanup function to prevent memory leaks
  const cleanup = useCallback(() => {
    console.log('Cleaning up video resources...');
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    // Reset player state
    setError(null);
    setRetryCount(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Set up CSS custom property for viewport height (Safari mobile fix)
  useEffect(() => {
    const setViewportHeight = () => {
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

  // Calculate optimal container dimensions (NO useCallback)
  const calculateContainerDimensions = (videoWidth, videoHeight, isSafari = false) => {
    const ratio = videoWidth / videoHeight;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    
    const isSafariMobile = isSafari && /iPhone|iPad|iPod/.test(navigator.userAgent);
    
    let containerHeight, containerWidth;
    
    if (ratio < 0.8) {
      // Vertical video
      let maxHeight = viewportHeight * 0.85;
      
      if (isSafariMobile) {
        maxHeight = viewportHeight * 0.65;
        console.log('Safari mobile detected - using aggressive height reduction');
      } else if (viewportWidth > 768) {
        const originalMaxHeight = maxHeight;
        maxHeight = Math.min(maxHeight, viewportHeight - 280);
        console.log(`Wide screen detected (${viewportWidth}px). Original maxHeight: ${originalMaxHeight}, reduced to: ${maxHeight}`);
      }
      
      containerHeight = Math.min(maxHeight, 800);
      containerWidth = containerHeight * ratio;
      
      if (isSafari && !isSafariMobile) {
        containerWidth = containerWidth * 0.9;
        containerHeight = containerHeight * 0.85;
        console.log('Applied Safari desktop-specific width and height reduction');
      }
      
      const maxAllowedWidth = Math.min(viewportWidth * 0.9, 600);
      if (containerWidth > maxAllowedWidth) {
        containerWidth = maxAllowedWidth;
        containerHeight = containerWidth / ratio;
      }
      
      console.log(`Vertical video calculations - ratio: ${ratio}, containerHeight: ${containerHeight}, containerWidth: ${containerWidth}, maxAllowedWidth: ${maxAllowedWidth}, Safari: ${isSafari}, Safari Mobile: ${isSafariMobile}`);
      
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
        if (containerWidth > viewportWidth * 0.6) {
          containerWidth = viewportWidth * 0.6;
          containerHeight = containerWidth / ratio;
        }
      }
    } else if (ratio >= 1.2) {
      // Landscape video (fixed the condition)
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
  };

  // Handle when video metadata is loaded
  const handleLoadedMetadata = (event) => {
    const video = event.target;
    
    console.log('🎬 METADATA LOADED for playbackId:', playbackId);
    console.log('Current state before calculation:', { containerStyle, aspectRatio });
    
    if (!video.videoWidth || !video.videoHeight) {
      console.log('Safari being Safari - dimensions not ready yet, retrying...');
      
      let retryAttempts = 0;
      const maxRetries = 10;
      
      const retryInterval = setInterval(() => {
        retryAttempts++;
        console.log(`Safari retry attempt ${retryAttempts}/${maxRetries}`);
        
        if (video.videoWidth && video.videoHeight) {
          console.log('Safari retry successful - got dimensions:', video.videoWidth, 'x', video.videoHeight);
          clearInterval(retryInterval);
          
          const ratio = video.videoWidth / video.videoHeight;
          setAspectRatio(ratio);
          
          const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
          const newStyle = calculateContainerDimensions(video.videoWidth, video.videoHeight, isSafari);
          console.log('🔧 SETTING NEW STYLE (RETRY):', newStyle);
          setContainerStyle(newStyle);
          
          return;
        } 
        
        if (retryAttempts >= maxRetries) {
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
    
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const newStyle = calculateContainerDimensions(video.videoWidth, video.videoHeight, isSafari);
    console.log('🔧 SETTING NEW STYLE (NORMAL):', newStyle);
    setContainerStyle(newStyle);
  };

  // Handle when user clicks play - this is when real dimensions become available
  const handlePlay = (event) => {
    const video = event.target;
    console.log('Play started - checking for updated dimensions:', video.videoWidth, 'x', video.videoHeight);
    
    if (video.videoWidth && video.videoHeight) {
      const ratio = video.videoWidth / video.videoHeight;
      const currentRatio = aspectRatio;
      
      // Check if dimensions changed significantly from what we calculated before
      if (!currentRatio || Math.abs(ratio - currentRatio) > 0.1) {
        console.log('Dimensions changed on play - recalculating:', ratio, 'vs previous:', currentRatio);
        
        setAspectRatio(ratio);
        
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const newStyle = calculateContainerDimensions(video.videoWidth, video.videoHeight, isSafari);
        setContainerStyle(newStyle);
        
        console.log('Applied updated container style on play:', newStyle);
      }
    }
  };

  // Handle canplay event for Safari's quirks
  const handleCanPlay = (event) => {
    const video = event.target;
    
    setRetryCount(0);
    setError(null);
    
    if ((!aspectRatio || isNaN(aspectRatio)) && video.videoWidth && video.videoHeight) {
      console.log('Got dimensions from canplay event (Safari fallback)');
      handleLoadedMetadata(event);
    }
  };

  // Handle errors and implement retry logic
  const handleError = (event) => {
    const errorDetails = event.detail || event.target?.error || 'Unknown error';
    console.error('Video error occurred:', errorDetails);
    
    setError(errorDetails);
    
    if (retryCount < 3) {
      console.log(`Attempting retry ${retryCount + 1}/3 in 2 seconds...`);
      
      retryTimeoutRef.current = setTimeout(() => {
        console.log('Retrying video load...');
        setRetryCount(prev => prev + 1);
        setError(null);
        
        if (playerRef.current) {
          try {
            playerRef.current.load();
          } catch (e) {
            console.warn('Error calling load():', e);
          }
        }
      }, 2000);
    } else {
      console.error('Max retries exceeded for video:', playbackId);
      setError('Unable to load video after multiple attempts');
    }
  };

  // Handle playback end
  const handleEnded = () => {
    console.log('Video ended, scheduling cleanup...');
    
    cleanupTimeoutRef.current = setTimeout(() => {
      if (playerRef.current) {
        try {
          playerRef.current.pause();
          playerRef.current.currentTime = 0;
        } catch (e) {
          console.warn('Error during cleanup:', e);
        }
      }
    }, 1000);
  };

  // Handle stalled/waiting events
  const handleStalled = () => {
    console.warn('Video playback stalled - network issues detected');
  };

  const handleWaiting = () => {
    console.log('Video waiting for data...');
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
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [aspectRatio]);

  // Show error state if needed
  if (error && retryCount >= 3) {
    return (
      <div className={`${styles.videoError} ${className}`}>
        <p>Unable to load video</p>
        <button 
          onClick={() => {
            setRetryCount(0);
            setError(null);
          }}
          style={{ marginTop: '10px', padding: '8px 16px', cursor: 'pointer' }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`${styles.muxPlayerContainer} ${className}`}
      style={containerStyle}
    >
      <MuxPlayer
        ref={playerRef}
        playbackId={playbackId}
        poster={poster}
        title={title}
        streamType="on-demand"
        preload="none"
        controls
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onPlay={handlePlay}
        onError={handleError}
        onEnded={handleEnded}
        onStalled={handleStalled}
        onWaiting={handleWaiting}
        {...props}
      />

      {/* Retry indicator */}
      {error && retryCount < 3 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#666',
          fontSize: '14px'
        }}>
          Retrying... ({retryCount + 1}/3)
        </div>
      )}
    </div>
  );
}