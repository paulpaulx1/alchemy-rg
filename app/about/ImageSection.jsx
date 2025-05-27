'use client';
import { useState } from 'react';
import styles from "./About.module.css";

export default function ImageSection({ mainImage, additionalImages, artistName }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Combine main image with additional images
  const allImages = [
    { url: mainImage, alt: artistName },
    ...(additionalImages || [])
  ];

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  if (!mainImage) return null;

  return (
    <div className={styles.imageSection}>
      {/* Mobile Carousel */}
      <div className={styles.mobileCarousel}>
        <div className={styles.carouselContainer}>
          <img 
            src={allImages[currentIndex].url} 
            alt={allImages[currentIndex].alt || artistName}
            className={styles.carouselImage}
          />
        </div>
        
        {allImages.length > 1 && (
          <>
            <button 
              onClick={prevImage}
              className={`${styles.carouselButton} ${styles.prevButton}`}
              aria-label="Previous image"
            >
              ‹
            </button>
            <button 
              onClick={nextImage}
              className={`${styles.carouselButton} ${styles.nextButton}`}
              aria-label="Next image"
            >
              ›
            </button>
            
            <div className={styles.carouselDots}>
              {allImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`${styles.dot} ${index === currentIndex ? styles.activeDot : ''}`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Desktop Stacked Images */}
      <div className={styles.desktopStack}>
        {allImages.map((image, index) => (
          <div key={index} className={styles.stackedImage}>
            <img 
              src={image.url} 
              alt={image.alt || `${artistName} photo ${index + 1}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}