'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './ArtworkGrid.module.css';

// Connection detection utilities
function getConnectionSpeed() {
  if ('connection' in navigator) {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      const effectiveType = connection.effectiveType;
      const downlink = connection.downlink;
      
      if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 0.5) {
        return 'very-slow';
      } else if (effectiveType === '3g' || downlink < 1.5) {
        return 'slow';
      } else if (effectiveType === '4g' || downlink > 1.5) {
        return 'fast';
      }
    }
  }
  
  if ('deviceMemory' in navigator && navigator.deviceMemory <= 2) {
    return 'slow';
  }
  
  return 'moderate';
}

function optimizeImageUrl(imageUrl, connectionSpeed) {
  if (!imageUrl) return imageUrl;
  
  const cleanUrl = imageUrl.split('?')[0];
  
  const sizes = {
    'very-slow': { w: 300, h: 300, q: 40 },
    'slow': { w: 400, h: 400, q: 60 },
    'moderate': { w: 500, h: 500, q: 75 },
    'fast': { w: 600, h: 600, q: 85 }
  };
  
  const size = sizes[connectionSpeed] || sizes.moderate;
  
  return `${cleanUrl}?w=${size.w}&h=${size.h}&fit=crop&auto=format&q=${size.q}`;
}

function generateBlurPlaceholder(imageUrl) {
  if (!imageUrl) return null;
  const cleanUrl = imageUrl.split('?')[0];
  return `${cleanUrl}?w=20&h=20&fit=crop&auto=format&q=20&blur=50`;
}

export default function ArtworkGrid({ artworks, isLoading = false, skeletonCount = 8 }) {
  const params = useParams();
  const portfolioSlug = params.slug;
  const [connectionSpeed, setConnectionSpeed] = useState('moderate');
  const [imageStates, setImageStates] = useState({});

  useEffect(() => {
    const speed = getConnectionSpeed();
    setConnectionSpeed(speed);
    console.log('ArtworkGrid connection speed:', speed);
    
    // Listen for connection changes
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      const handleConnectionChange = () => {
        const newSpeed = getConnectionSpeed();
        setConnectionSpeed(newSpeed);
        console.log('ArtworkGrid connection changed to:', newSpeed);
      };
      
      connection.addEventListener('change', handleConnectionChange);
      return () => connection.removeEventListener('change', handleConnectionChange);
    }
  }, []);

  // Show loading skeletons
  if (isLoading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <div key={index} className={styles.gridItem}>
            <div className={styles.imageContainer}>
              <div className={styles.innerContainer}>
                <div className={styles.thumbnailSkeleton}></div>
              </div>
            </div>
            <div className={styles.artworkInfo}>
              <div className={styles.titleSkeleton}></div>
              <div className={styles.yearSkeleton}></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!artworks.length) {
    return (
      <div className={styles.emptyMessage}>No artworks in this portfolio</div>
    );
  }

  const isSingleArtwork = artworks.length === 1;

  const handleImageLoad = (artworkId, imageType) => {
    setImageStates(prev => ({
      ...prev,
      [`${artworkId}-${imageType}`]: { loaded: true }
    }));
  };

  const handleImageError = (artworkId, imageType) => {
    setImageStates(prev => ({
      ...prev,
      [`${artworkId}-${imageType}`]: { error: true }
    }));
  };

  function renderArtworkThumbnail(artwork, index) {
    const imageKey = `${artwork._id}-${artwork.mediaType}`;
    const imageState = imageStates[imageKey] || {};
    const priority = index < 4; // First 4 images get priority

    switch (artwork.mediaType) {
      case 'image':
        const optimizedImageUrl = optimizeImageUrl(artwork.imageUrl, connectionSpeed);
        const blurDataURL = generateBlurPlaceholder(artwork.imageUrl);
        
        return (
          <div style={{ position: 'relative' }}>
            {/* Blur placeholder */}
            {blurDataURL && !imageState.loaded && (
              <img
                src={blurDataURL}
                alt=""
                className={styles.thumbnail}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  filter: 'blur(5px)',
                  zIndex: 1
                }}
              />
            )}
            
            {/* Main image */}
            <img
              src={optimizedImageUrl}
              alt={artwork.title || 'Untitled artwork'}
              className={styles.thumbnail}
              loading={priority ? 'eager' : 'lazy'}
              onLoad={() => handleImageLoad(artwork._id, artwork.mediaType)}
              onError={() => handleImageError(artwork._id, artwork.mediaType)}
              style={{ 
                position: 'relative', 
                zIndex: 2,
                opacity: imageState.loaded ? 1 : 0,
                transition: 'opacity 0.3s ease-in-out'
              }}
            />
          </div>
        );

      case 'video':
        const optimizedVideoThumb = optimizeImageUrl(artwork.videoThumbnailUrl, connectionSpeed);
        
        return (
          <div className={styles.videoThumbnail}>
            {artwork.videoThumbnailUrl ? (
              <img
                src={optimizedVideoThumb}
                alt={artwork.title || 'Untitled video'}
                className={styles.thumbnail}
                loading={priority ? 'eager' : 'lazy'}
                onLoad={() => handleImageLoad(artwork._id, 'video')}
              />
            ) : (
              <div className={styles.videoPlaceholder}>
                <span>Video</span>
              </div>
            )}
            <div className={styles.playButton}>▶</div>
          </div>
        );

      case 'pdf':
        return (
          <>
            {artwork.pdfThumbnailUrl ? (
              <div className={styles.pdfThumbnail}>
                <img
                  src={optimizeImageUrl(artwork.pdfThumbnailUrl, connectionSpeed)}
                  alt={artwork.title || 'Untitled PDF'}
                  className={styles.thumbnail}
                  loading={priority ? 'eager' : 'lazy'}
                />
              </div>
            ) : (
              <div className={styles.pdfDefaultThumbnail}>
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Icon_pdf_file.svg/256px-Icon_pdf_file.svg.png?20241007091317"
                  alt={artwork.title || 'Untitled PDF'}
                  className={styles.defaultThumbnail}
                  loading="lazy"
                />
              </div>
            )}
          </>
        );

      case 'audio':
        return (
          <>
            {artwork.audioThumbnailUrl ? (
              <div className={styles.pdfThumbnail}>
                <img
                  src={optimizeImageUrl(artwork.audioThumbnailUrl, connectionSpeed)}
                  alt={artwork.title || 'Untitled audio'}
                  className={styles.thumbnail}
                  loading={priority ? 'eager' : 'lazy'}
                />
              </div>
            ) : (
              <div className={styles.pdfDefaultThumbnail}>
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/HD%40DH.nrw_Audio_Icon_2.svg/512px-HD%40DH.nrw_Audio_Icon_2.svg.png?20231011144101"
                  alt={artwork.title || 'Untitled Audio File'}
                  className={styles.defaultThumbnail}
                  loading="lazy"
                />
              </div>
            )}
          </>
        );

      default:
        return null;
    }
  }

  return (
    <div
      className={`${styles.grid} ${
        isSingleArtwork ? styles.singleItemGrid : ''
      }`}
    >
      {artworks.map((artwork, index) => (
        <Link
          href={`/portfolio/${portfolioSlug}/${artwork.slug}`}
          key={artwork._id}
          className={styles.gridItem}
          prefetch={connectionSpeed !== 'very-slow' && index < 2} // Smart prefetching
        >
          <div className={styles.imageContainer}>
            <div className={styles.innerContainer}>
              {renderArtworkThumbnail(artwork, index)}
            </div>
          </div>
          <div className={styles.artworkInfo}>
            <h3
              className={styles.artworkTitle}
              alt={artwork.displayableTitle || 'Artwork'}
            >
              {artwork.displayableTitle}
            </h3>
            {artwork.year && (
              <p className={styles.artworkYear}>{artwork.year}</p>
            )}
          </div>
        </Link>
      ))}
      
      {/* Connection indicator for development */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          background: connectionSpeed === 'very-slow' ? '#ff4444' : 
                     connectionSpeed === 'slow' ? '#ff8800' : 
                     connectionSpeed === 'moderate' ? '#ffbb00' : '#44ff44',
          color: 'white',
          padding: '8px 12px',
          fontSize: '12px',
          borderRadius: '6px',
          zIndex: 1000,
          fontFamily: 'monospace'
        }}>
          Grid: {connectionSpeed}
        </div>
      )}
    </div>
  );
}