"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import styles from "./ArtworkGrid.module.css";

export default function ArtworkGrid({ artworks }) {
  const params = useParams();
  const portfolioSlug = params.slug;

  if (!artworks.length) {
    return (
      <div className={styles.emptyMessage}>No artworks in this portfolio</div>
    );
  }

  const isSingleArtwork = artworks.length === 1;

  return (
    <div className={`${styles.grid} ${isSingleArtwork ? styles.singleItemGrid : ''}`}>
      {artworks.map((artwork, index) => (
        <Link
          href={`/portfolio/${portfolioSlug}/${artwork.slug}`}
          key={artwork._id}
          className={styles.gridItem}
        >
          <div className={styles.imageContainer}>
            <div className={styles.innerContainer}>
              {artwork.mediaType === "image" ? (
                <img
                  src={artwork.imageUrl}
                  alt={artwork.title || "Untitled artwork"}
                  className={styles.thumbnail}
                />
              ) : (
                // Video thumbnail
                <div className={styles.videoThumbnail}>
                  {artwork.videoThumbnailUrl ? (
                    <img
                      src={artwork.videoThumbnailUrl}
                      alt={artwork.title || "Untitled video"}
                      className={styles.thumbnail}
                    />
                  ) : (
                    <div className={styles.videoPlaceholder}>
                      <span>Video</span>
                    </div>
                  )}
                  <div className={styles.playButton}>▶</div>
                </div>
              )}
            </div>
          </div>
          <div className={styles.artworkInfo}>
            <h3 className={styles.artworkTitle}>
              {artwork.title || "Untitled"}
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