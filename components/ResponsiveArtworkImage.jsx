'use client';

import Image from 'next/image';
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
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const handleImageLoad = (e) => {
    const img = e.target;
    const isPortrait = img.naturalHeight > img.naturalWidth;
    
    // Store actual dimensions
    setDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
    
    img.classList.remove(styles.portraitImage, styles.landscapeImage);
    
    if (isPortrait) {
      img.classList.add(styles.portraitImage);
    } else {
      img.classList.add(styles.landscapeImage);
    }
  };

  return (
    <Image
      src={src}
      alt={alt || title || "Untitled artwork"}
      width={dimensions.width}
      height={dimensions.height}
      className={`${styles.artworkImage} ${className}`}
      onLoad={handleImageLoad}
      priority={priority}
      style={style}
      sizes="(max-width: 768px) 100vw, 90vw"
      {...props}
    />
  );
}