// components/MuxVideo.js
'use client';

import MuxPlayer from '@mux/mux-player-react';
import { useState, useRef, useEffect } from 'react';
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

  // Calculate optimal container dimensions
  const calculateContainerDimensions = (videoWidth, videoHeight) => {
    const ratio = videoWidth / videoHeight;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    let containerHeight, containerWidth;
    
    if (ratio < 0.8) {
      // Vertical video
      let maxHeight = viewportHeight * 0.85;
      
      // Reduce height on wide screens (desktop/tablet landscape)
      if (viewportWidth > 768) {
        maxHeight = Math.min(maxHeight, viewportHeight - 280); // Remove 280px total (140 top + 140 bottom)
      }
      
      containerHeight = Math.min(maxHeight, 800);
      containerWidth = containerHeight * ratio;
      
      // Ensure it doesn't get too wide on very tall screens
      if (containerWidth > viewportWidth * 0.6) {
        containerWidth = viewportWidth * 0.6;
        containerHeight = containerWidth / ratio;
      }
    } else if (ratio > 1.2) {
      // Landscape video
      containerHeight = Math.min(viewportHeight * 0.7, 600);
      containerWidth = Math.min(viewportWidth * 0.9, containerHeight * ratio);
      
      // Ensure height doesn't get too small
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
    const ratio = video.videoWidth / video.videoHeight;
    setAspectRatio(ratio);
    
    console.log(`Video dimensions: ${video.videoWidth}x${video.videoHeight}, aspect ratio: ${ratio}`);
    
    const newStyle = calculateContainerDimensions(video.videoWidth, video.videoHeight);
    setContainerStyle(newStyle);
    
    console.log('Applied container style:', newStyle);
  };

  // Recalculate on window resize
  useEffect(() => {
    const handleResize = () => {
      if (aspectRatio && containerRef.current) {
        // Get video dimensions from the player if available
        const video = containerRef.current.querySelector('video');
        if (video && video.videoWidth && video.videoHeight) {
          const newStyle = calculateContainerDimensions(video.videoWidth, video.videoHeight);
          setContainerStyle(newStyle);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [aspectRatio]);

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
        {...props}
      />
    </div>
  );
}