"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import styles from "./ArtworkGrid.module.css";

// -----------------------------------------------------------
// 🖼️ Progressive image loader (optional low-res → high-res swap)
// -----------------------------------------------------------
function useProgressiveImage(lowResUrl, fullResUrl) {
  const [currentSrc, setCurrentSrc] = useState(lowResUrl || fullResUrl);
  const [isLoaded, setIsLoaded] = useState(false);

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

// -----------------------------------------------------------
// 🧱 ArtworkGrid
// -----------------------------------------------------------
export default function ArtworkGrid({
  artworks,
  isLoading = false,
  skeletonCount = 8,
}) {
  const params = useParams();
  const portfolioSlug = params.slug;

  console.log("[ArtworkGrid] artworks:", artworks);

  // -----------------------------------------------------------
  // ⏳ Skeleton state
  // -----------------------------------------------------------
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

  // -----------------------------------------------------------
  // 🪶 Empty state
  // -----------------------------------------------------------
  if (!artworks?.length) {
    return (
      <div className={styles.emptyMessage}>No artworks in this portfolio.</div>
    );
  }

  const isSingleArtwork = artworks.length === 1;

  // -----------------------------------------------------------
  // 🎨 Thumbnail Renderer
  // -----------------------------------------------------------
  function renderArtworkThumbnail(artwork, index) {
    const priority = index < 4;

    switch (artwork.mediaType) {
      // 🖼️ IMAGE
      case "image": {
        const imageUrl = artwork.lowResImageUrl || artwork.imageUrl;
        const displayUrl = imageUrl
          ? `${imageUrl}?auto=format&fit=crop&w=600&h=600&q=75`
          : null;

        return displayUrl ? (
          <img
            src={displayUrl}
            alt={artwork.title || "Untitled artwork"}
            className={styles.thumbnail}
            loading={priority ? "eager" : "lazy"}
          />
        ) : (
          <div className={styles.imagePlaceholder}>No Image</div>
        );
      }

      // 🎥 VIDEO
      case "video": {
        const videoThumbUrl = artwork.videoThumbnailUrl
          ? `${artwork.videoThumbnailUrl}?auto=format&fit=crop&w=600&h=600&q=75`
          : null;

        // If no thumbnail at all, fallback to a generic icon
        if (!videoThumbUrl) {
          return (
            <div className={styles.videoPlaceholder}>
              <span>Video</span>
            </div>
          );
        }

        return (
          <div className={styles.videoThumbnail}>
            <img
              src={videoThumbUrl}
              alt={artwork.title || "Untitled video"}
              className={styles.thumbnail}
              loading={index < 2 ? "eager" : "lazy"}
            />
            <div className={styles.playButton}>▶</div>
          </div>
        );
      }

      // 📄 PDF
      case "pdf": {
        console.log("[ArtworkGrid] PDF artwork:", artwork);
        return (
          <div className={styles.pdfThumbnail}>
            {artwork.pdfThumbnailUrl ? (
              <img
                src={`${artwork.pdfThumbnailUrl}?auto=format&fit=crop&w=600&h=600&q=75`}
                alt={artwork.title || "PDF Thumbnail"}
                className={styles.thumbnail}
                loading={index < 2 ? "eager" : "lazy"}
              />
            ) : (
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Icon_pdf_file.svg/256px-Icon_pdf_file.svg.png"
                alt={artwork.title || "Untitled PDF"}
                className={styles.defaultThumbnail}
                loading="lazy"
              />
            )}
          </div>
        );
      }

      // 🎧 AUDIO
      case "audio": {
        const audioThumb = artwork.audioThumbnailUrl
          ? `${artwork.audioThumbnailUrl}?auto=format&fit=crop&w=600&h=600&q=75`
          : null;

        return (
          <div className={styles.audioThumbnail}>
            {audioThumb ? (
              <img
                src={audioThumb}
                alt={artwork.title || "Untitled audio"}
                className={styles.thumbnail}
                loading={priority ? "eager" : "lazy"}
              />
            ) : (
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/HD%40DH.nrw_Audio_Icon_2.svg/512px-HD%40DH.nrw_Audio_Icon_2.svg.png"
                alt={artwork.title || "Untitled Audio File"}
                className={styles.defaultThumbnail}
                loading="lazy"
              />
            )}
          </div>
        );
      }

      // ❓ UNSUPPORTED
      default:
        return (
          <div className={styles.unsupportedType}>
            Unsupported media type: {artwork.mediaType}
          </div>
        );
    }
  }

  // -----------------------------------------------------------
  // 🧩 Render Grid
  // -----------------------------------------------------------
  return (
    <div
      className={`${styles.grid} ${
        isSingleArtwork ? styles.singleItemGrid : ""
      }`}
    >
      {artworks.map((artwork, index) => (
        <Link
          href={`/portfolio/${portfolioSlug}/${artwork.slug}`}
          key={artwork._id}
          className={styles.gridItem}
          prefetch={index < 2}
        >
          <div className={styles.imageContainer}>
            <div className={styles.innerContainer}>
              {renderArtworkThumbnail(artwork, index)}
            </div>
          </div>

          <div className={styles.artworkInfo}>
            {artwork.displayableTitle && (
              <h3
                className={styles.artworkTitle}
                alt={artwork.displayableTitle || "Artwork"}
              >
                {artwork.displayableTitle}
              </h3>
            )}
            {artwork.year && (
              <p className={styles.artworkYear}>{artwork.year}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
