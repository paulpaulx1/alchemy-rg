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
          <>
            {artwork.pdfThumbnailUrl ? (
              <div className={styles.pdfThumbnail}>
                <img
                  src={artwork.pdfThumbnailUrl}
                  alt={artwork.title || 'Untitled PDF'}
                  className={styles.thumbnail}
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
