// app/components/ArtworkGrid.jsx
"use client";

import { useState } from "react";
import styles from "./ArtworkGrid.module.css";

export default function ArtworkGrid({ artworks }) {
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!artworks.length) {
    return (
      <div className={styles.emptyMessage}>No artworks in this portfolio</div>
    );
  }

  // Function to handle selecting an artwork by index
  const selectArtworkByIndex = (index) => {
    setCurrentIndex(index);
    setSelectedArtwork(artworks[index]);
  };

  // Navigation functions
  const navigatePrevious = (e) => {
    e.stopPropagation();
    const newIndex = (currentIndex - 1 + artworks.length) % artworks.length;
    selectArtworkByIndex(newIndex);
  };

  const navigateNext = (e) => {
    e.stopPropagation();
    const newIndex = (currentIndex + 1) % artworks.length;
    selectArtworkByIndex(newIndex);
  };

  const isSingleArtwork = artworks.length === 1;

  return (
    <>
          <div className={`${styles.grid} ${isSingleArtwork ? styles.singleItemGrid : ''}`}>

        {artworks.map((artwork, index) => (
          <div
            key={artwork._id}
            className={styles.gridItem}
            onClick={() => {
              setCurrentIndex(index);
              setSelectedArtwork(artwork);
            }}
          >
            <div className={styles.imageContainer}>
              <div className={styles.innerContainer}>
                {artwork.mediaType === "image" ? (
                  <img
                    src={artwork.lowResImageUrl}
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
          </div>
        ))}
      </div>

      {selectedArtwork && (
        <div
          className={styles.lightbox}
          onClick={() => setSelectedArtwork(null)}
        >
          <button
            className={styles.closeButton}
            onClick={() => setSelectedArtwork(null)}
          >
            ×
          </button>

          <button
            className={`${styles.navLink} ${styles.prevLink}`}
            onClick={navigatePrevious}
            aria-label="Previous artwork"
          >
            Previous
          </button>

          <button
            className={`${styles.navLink} ${styles.nextLink}`}
            onClick={navigateNext}
            aria-label="Next artwork"
          >
            Next
          </button>

          <div
            className={styles.lightboxContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.lightboxImageContainer}>
              {selectedArtwork.mediaType === "image" ? (
                <img
                  src={selectedArtwork.imageUrl}
                  alt={selectedArtwork.title || "Untitled artwork"}
                  className={styles.fullImage}
                />
              ) : (
                <div className={styles.videoContainer}>
                  {selectedArtwork.videoUrl ? (
                    <video
                      src={selectedArtwork.videoUrl}
                      controls
                      autoPlay
                      className={styles.fullVideo}
                    />
                  ) : selectedArtwork.externalVideoUrl ? (
                    <iframe
                      src={getEmbedUrl(selectedArtwork.externalVideoUrl)}
                      title={selectedArtwork.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className={styles.fullVideo}
                    ></iframe>
                  ) : (
                    <div className={styles.videoError}>Video not available</div>
                  )}
                </div>
              )}
            </div>
            <div className={styles.lightboxInfo}>
              <h3 className={styles.lightboxTitle}>
                {selectedArtwork.title || "Untitled"}
              </h3>
              <div className={styles.lightboxDetails}>
                {selectedArtwork.year && (
                  <p className={styles.lightboxYear}>{selectedArtwork.year}</p>
                )}
                {selectedArtwork.medium && (
                  <p className={styles.lightboxMedium}>
                    {selectedArtwork.medium}
                  </p>
                )}
                {selectedArtwork.dimensions && (
                  <p className={styles.lightboxDimensions}>
                    {selectedArtwork.dimensions}
                  </p>
                )}
              </div>
              {selectedArtwork.description && (
                <div className={styles.lightboxDescription}>
                  <p>{selectedArtwork.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Helper function to get embed URL from video links
function getEmbedUrl(url) {
  // YouTube
  const youtubeRegex =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const youtubeMatch = url.match(youtubeRegex);

  if (youtubeMatch && youtubeMatch[2].length === 11) {
    return `https://www.youtube.com/embed/${youtubeMatch[2]}`;
  }

  // Vimeo
  const vimeoRegex =
    /^.*(vimeo\.com\/)((channels\/[A-z]+\/)|(groups\/[A-z]+\/videos\/))?([0-9]+)/;
  const vimeoMatch = url.match(vimeoRegex);

  if (vimeoMatch && vimeoMatch[5]) {
    return `https://player.vimeo.com/video/${vimeoMatch[5]}`;
  }

  // Return original URL if no match
  return url;
}
