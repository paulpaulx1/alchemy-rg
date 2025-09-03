'use client';

import { useState, useEffect } from 'react';
import styles from '../app/portfolio/[slug]/[artworkSlug]/ArtworkPage.module.css';

export default function ResponsiveArtworkImage({ 
  src, 
  alt, 
  title, 
  priority = false,
  style = {},
  className = '',
  ...props 
}) {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // Check on mount
    checkMobile();
    
    // Listen for resize events
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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

  // Generate mobile-optimized URL
  const getOptimizedSrc = (originalSrc) => {
    if (!originalSrc) return originalSrc;
    
    // Check if it's already a Sanity URL with parameters
    const hasParams = originalSrc.includes('?');
    const separator = hasParams ? '&' : '?';
    
    if (isMobile) {
      // Mobile: smaller size, higher compression, but still good quality
      return `${originalSrc}${separator}w=800&q=75&auto=format`;
    } else {
      // Desktop: high quality for art viewing
      return originalSrc.includes('auto=format') 
        ? originalSrc 
        : `${originalSrc}${separator}auto=format&q=95`;
    }
  };

  return (
    <img
      src={getOptimizedSrc(src)}
      alt={alt || title || "Untitled artwork"}
      className={`${styles.artworkImage} ${className}`}
      onLoad={handleImageLoad}
      loading={priority ? 'eager' : 'lazy'}
      style={style}
      {...props}
    />
  );
}