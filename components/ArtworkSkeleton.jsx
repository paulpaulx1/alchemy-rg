'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import styles from './ArtworkGrid.module.css';

// Skeleton component for loading state
function ArtworkSkeleton() {
  return (
    <div className={styles.gridItem}>
      <div className={styles.imageContainer}>
        <div className={styles.innerContainer}>
          <div className={styles.skeletonImage}></div>
        </div>
      </div>
      <div className={styles.artworkInfo}>
        <div className={styles.skeletonTitle}></div>
        <div className={styles.skeletonYear}></div>
      </div>
    </div>
  );
}

// Grid of skeletons for initial loading
function ArtworkGridSkeleton({ count = 6 }) {
  return (
    <div className={styles.grid}>
      {Array.from({ length: count }).map((_, index) => (
        <ArtworkSkeleton key={index} />
      ))}
    </div>
  );
}

export default function ArtworkGrid({ artworks, isLoading = false, skeletonCount = 6 }) {
  const params = useParams();
  const portfolioSlug = params.slug;

  // Show skeleton while loading
  if (isLoading) {
    return <ArtworkGridSkeleton count={skeletonCount} />;
  }

  if (!artworks.length) {
    return (
      <div className={styles.emptyMessage}>No artworks in this portfolio</div>
    );
  }

  const isSingleArtwork = artworks.length === 1;

  function renderArtworkThumbnail(artwork) {
    switch (artwork.mediaType) {
      case 'image':
        return (
          <img
            src={artwork.imageUrl}
            alt={artwork.title || 'Untitled artwork'}
            className={styles.thumbnail}
            loading="lazy"
          />
        );
      case 'video':
        return (
          <div className={styles.videoThumbnail}>
            {artwork.videoThumbnailUrl ? (
              <img
                src={artwork.videoThumbnailUrl}
                alt={artwork.title || 'Untitled video'}
                className={styles.thumbnail}
                loading="lazy"
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
                  src={artwork.pdfThumbnailUrl}
                  alt={artwork.title || 'Untitled PDF'}
                  className={styles.thumbnail}
                  loading="lazy"
                />
              </div>
            ) : (
              <div className={styles.pdfDefaultThumbnail}>
                <img
                  src={
                    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Icon_pdf_file.svg/256px-Icon_pdf_file.svg.png?20241007091317'
                  }
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
                  src={artwork.audioThumbnailUrl}
                  alt={artwork.title || 'Untitled audio'}
                  className={styles.thumbnail}
                  loading="lazy"
                />
              </div>
            ) : (
              <div className={styles.pdfDefaultThumbnail}>
                <img
                  src={
                    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/HD%40DH.nrw_Audio_Icon_2.svg/512px-HD%40DH.nrw_Audio_Icon_2.svg.png?20231011144101'
                  }
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
        >
          <div className={styles.imageContainer}>
            <div className={styles.innerContainer}>
              {renderArtworkThumbnail(artwork)}
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

// Export the skeleton component separately for use in other places
export { ArtworkGridSkeleton };