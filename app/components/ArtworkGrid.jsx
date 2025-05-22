'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import styles from './ArtworkGrid.module.css';

export default function ArtworkGrid({ artworks }) {
  const params = useParams();
  const portfolioSlug = params.slug;

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
          <div className={styles.pdfThumbnail}>
            {artwork.pdfThumbnailUrl ? (
              <img
                src={artwork.pdfThumbnailUrl}
                alt={artwork.title || 'Untitled PDF'}
                className={styles.thumbnail}
              />
            ) : (
              <div className={styles.pdfPlaceholder}>
                <span>PDF</span>
              </div>
            )}
            <div className={styles.pdfIndicator}>
              <svg
                className={styles.pdfIcon}
                viewBox='0 0 24 24'
                width='24'
                height='24'
              >
                <path d='M20 2H8C6.9 2 6 2.9 6 4V16C6 17.1 6.9 18 8 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z' />
                <path d='M4 6H2V20C2 21.1 2.9 22 4 22H18V20H4V6Z' />
                <path d='M16 12H12V8H16V12Z' />
              </svg>
            </div>
          </div>
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
            <h3 className={styles.artworkTitle}>
              {artwork.title || 'Untitled'}
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
