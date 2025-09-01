'use client';

import { useState } from 'react';
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
      src={src}
      alt={alt || title || "Untitled artwork"}
      className={`${styles.artworkImage} ${className}`}
      onLoad={handleImageLoad}
      loading={priority ? 'eager' : 'lazy'}
      style={style}
      {...props}
    />
  );
}