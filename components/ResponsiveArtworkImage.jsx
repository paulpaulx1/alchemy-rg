'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
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

  if (isMobile) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '80vh' }}>
        <Image
          src={src}
          alt={alt || title || "Untitled artwork"}
          fill
          quality={95}
          sizes="100vw"
          style={{ objectFit: 'contain', ...style }}
          className={className}
          priority={priority}
          onLoad={handleImageLoad}
          {...props}
        />
      </div>
    );
  }

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