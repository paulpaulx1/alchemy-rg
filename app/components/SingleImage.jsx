// SingleImage.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./FeaturedPortfolio.module.css";

export default function SingleImage({ artwork, visible, zIndex }) {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
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
    if (!artwork) return;
    
    const loadAndCalculateImage = () => {
      const img = new Image();
      img.onload = () => calculateImageSize(img);
      img.onerror = (err) => console.error("Failed to load image:", err);
      img.src = artwork.image.asset.url;
    };
    
    loadAndCalculateImage();
    
    const handleResize = () => loadAndCalculateImage();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [artwork]);

  if (!artwork || !imageSize.width) return null;

  return (
    <div
      className={styles.artwork}
      style={{
        opacity: visible ? 1 : 0,
        filter: visible ? 'blur(0px)' : 'blur(10px)',
        transition: 'opacity 2s linear, filter 2s linear',
        width: `${imageSize.width}px`,
        height: `${imageSize.height}px`,
        position: 'absolute',
        zIndex: zIndex || 1
      }}
    >
      <img
        src={artwork.image.asset.url}
        alt={artwork.title || "Artwork"}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}