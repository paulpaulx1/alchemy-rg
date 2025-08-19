'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import styles from './ArtworkGrid.module.css';

// Simple progressive loading - use lowRes first, then full quality
function useProgressiveImage(lowResUrl, fullResUrl) {
  const [currentSrc, setCurrentSrc] = useState(lowResUrl || fullResUrl);
  const [isLoaded, setIsLoaded] = useState(false);

  // If we have both URLs, start with lowRes and upgrade
  if (lowResUrl && fullResUrl && !isLoaded) {
    const img = new Image();
    img.onload = () => {
      setCurrentSrc(fullResUrl);
      setIsLoaded(true);
    };
    img.src = fullResUrl;
  }

  return currentSrc;
}

export default function ArtworkGrid({ artworks, isLoading = false, skeletonCount = 8 }) {
  const params = useParams();
  const portfolioSlug = params.slug;

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

  function renderArtworkThumbnail(artwork, index) {
    const priority = index < 4; // First 4 images get priority

    switch (artwork.mediaType) {
      case 'image':
        // Use lowRes if available, otherwise fallback to original with basic optimization
        const imageUrl = artwork.lowResImageUrl || artwork.imageUrl;
        const displayUrl = imageUrl ? `${imageUrl}?auto=format&fit=crop&w=600&h=600&q=75` : null;
        
        return displayUrl ? (
          <img
            src={displayUrl}
            alt={artwork.title || 'Untitled artwork'}
            className={styles.thumbnail}
            loading={priority ? 'eager' : 'lazy'}
          />
        ) : (
          <div className={styles.imagePlaceholder}>No Image</div>
        );

      case 'video':
        const videoThumbUrl = artwork.videoThumbnailUrl 
          ? `${artwork.videoThumbnailUrl}?auto=format&fit=crop&w=600&h=600&q=75`
          : null;
        
        return (
          <div className={styles.videoThumbnail}>
            {videoThumbUrl ? (
              <img
                src={videoThumbUrl}
                alt={artwork.title || 'Untitled video'}
                className={styles.thumbnail}
                loading={priority ? 'eager' : 'lazy'}
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
                  src={`${artwork.pdfThumbnailUrl}?auto=format&fit=crop&w=600&h=600&q=75`}
                  alt={artwork.title || 'Untitled PDF'}
                  className={styles.thumbnail}
                  loading={priority ? 'eager' : 'lazy'}
                />
              </div>
            ) : (
              <div className={styles.pdfDefaultThumbnail}>
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Icon_pdf_file.svg/256px-Icon_pdf_file.svg.png"
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
              <div className={styles.audioThumbnail}>
                <img
                  src={`${artwork.audioThumbnailUrl}?auto=format&fit=crop&w=600&h=600&q=75`}
                  alt={artwork.title || 'Untitled audio'}
                  className={styles.thumbnail}
                  loading={priority ? 'eager' : 'lazy'}
                />
              </div>
            ) : (
              <div className={styles.audioDefaultThumbnail}>
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/HD%40DH.nrw_Audio_Icon_2.svg/512px-HD%40DH.nrw_Audio_Icon_2.svg.png"
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
          prefetch={index < 2} // Only prefetch first 2
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
    </div>
  );
}