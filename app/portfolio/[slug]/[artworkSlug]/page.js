import { client } from "@/lib/client";
import Link from "next/link";
import ResponsiveArtworkImage from "@/components/ResponsiveArtworkImage";
import MuxVideo from "@/components/MuxVideo";
import styles from "./ArtworkPage.module.css";
import PdfViewer from "@/components/PdfViewer";
import ArtworkNavigation from "@/components/ArtworkNavigation";
import AudioPlayer from "@/components/AudioPlayer";
import { Suspense } from "react";

// Only generate static params for main portfolios to reduce build time
export async function generateStaticParams() {
  // Only generate for featured/main artworks to avoid huge build times
  const artworks = await client.fetch(`
    *[_type == "artwork" && featured == true] {
      "slug": slug.current,
      "portfolioSlug": portfolio->slug.current
    }
  `);

  return artworks.map((artwork) => ({
    slug: artwork.portfolioSlug,
    artworkSlug: artwork.slug,
  }));
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

// Updated query with Mux fields
async function getArtworkWithNavigation(artworkSlug) {
  return await client.fetch(
    `
    *[_type == "artwork" && slug.current == $artworkSlug][0] {
      _id,
      title,
      displayTitle,
      "displayableTitle": select(displayTitle == true => title, null),
      mediaType,
      "slug": slug.current,
      "imageUrl": image.asset->url,
      "lowResImageUrl": lowResImage.asset->url,
      "videoUrl": video.asset->url,
      "videoThumbnailUrl": videoThumbnail.asset->url,
      externalVideoUrl,
      // Mux fields
      muxPlaybackId,
      muxAssetId,
      muxStatus,
      "pdfUrl": pdfFile.asset->url,
      "pdfThumbnailUrl": pdfThumbnail.asset->url,
      "audioUrl": audioFile.asset->url,
      "audioThumbnailUrl": audioThumbnail.asset->url,
      description,
      year,
      medium,
      dimensions,
      order,
      "portfolio": portfolio-> {
        _id,
        title,
        "slug": slug.current,
        "parentPortfolio": parentPortfolio->{
          title,
          "slug": slug.current
        },
        // Get all artworks in this portfolio in the same query
        "allArtworks": *[_type == "artwork" && portfolio._ref == ^._id] | order(order asc) {
          _id,
          title,
          displayTitle,
          "displayableTitle": select(displayTitle == true => title, null),
          "slug": slug.current,
          order
        }
      }
    }
  `,
    { artworkSlug }
  );
}

// Skeleton component for artwork page
function ArtworkPageSkeleton() {
  return (
    <div className={styles.pageWrapper}>
      {/* Breadcrumbs skeleton */}
      <div className={styles.breadcrumbs}>
        <div className={styles.skeletonBreadcrumb}></div>
        <span className={styles.breadcrumbSeparator}>/</span>
        <div className={styles.skeletonBreadcrumb}></div>
        <span className={styles.breadcrumbSeparator}>/</span>
        <div className={styles.skeletonBreadcrumb}></div>
      </div>

      {/* Main content skeleton */}
      <div className={styles.mainContent}>
        <div className={styles.artworkContainer}>
          <div className={styles.skeletonArtwork}></div>
        </div>
      </div>

      {/* Bottom section skeleton */}
      <div className={styles.bottomSection}>
        <div className={styles.navigation}>
          <div className={styles.skeletonNavButton}></div>
          <div className={styles.desktopArtworkInfo}>
            <div className={styles.skeletonTitle}></div>
            <div className={styles.skeletonDetails}></div>
          </div>
          <div className={styles.skeletonNavButton}></div>
        </div>
      </div>
    </div>
  );
}

// Allow some caching but keep fresh
export const revalidate = 300; // 5 minutes instead of 0

export default async function ArtworkPage({ params }) {
  const resolvedParams = await params;
  const { slug: portfolioSlug, artworkSlug } = resolvedParams;

  // Single optimized query
  const artwork = await getArtworkWithNavigation(artworkSlug);

  if (!artwork) {
    return (
      <div className={styles.container}>
        <h1>Artwork not found</h1>
        <Link href="/">Return to home</Link>
      </div>
    );
  }

  const allArtworks = artwork.portfolio.allArtworks;

  // Find current artwork index and navigation links
  const currentIndex = allArtworks.findIndex((a) => a._id === artwork._id);
  const prevArtwork =
    currentIndex > 0
      ? allArtworks[currentIndex - 1]
      : allArtworks[allArtworks.length - 1];
  const nextArtwork =
    currentIndex < allArtworks.length - 1
      ? allArtworks[currentIndex + 1]
      : allArtworks[0];

  function renderArtworkDisplay(artwork) {
    switch (artwork.mediaType) {
      case "image":
        return (
          <Suspense fallback={<div className={styles.skeletonImage}></div>}>
            <ResponsiveArtworkImage
              src={artwork.imageUrl}
              alt={artwork.displayableTitle || "Artwork"}
              title={artwork.displayableTitle}
              priority={true} // Load main artwork image with priority
            />
          </Suspense>
        );
      case "video":
        console.log("Full artwork object:", artwork);
        console.log("muxPlaybackId specifically:", artwork.muxPlaybackId);
        return (
          <div className={styles.videoContainer}>
            {/* Check for Mux video first */}
            {artwork.muxPlaybackId ? (
              <MuxVideo
                playbackId={artwork.muxPlaybackId}
                poster={artwork.videoThumbnailUrl}
                title={artwork.displayableTitle || "Video artwork"}
                className={styles.artworkVideo}
                controls={true}
                preload="metadata"
                // Pass menuOpen state if you have it available
                // menuOpen={menuOpen}
              />
            ) : artwork.videoUrl ? (
              /* Fallback to regular video */
              <video
                src={artwork.videoUrl}
                controls
                className={styles.artworkVideo}
                preload="metadata"
                poster={artwork.videoThumbnailUrl}
              />
            ) : artwork.externalVideoUrl ? (
              /* External video (YouTube/Vimeo) */
              <Suspense fallback={<div className={styles.skeletonVideo}></div>}>
                <iframe
                  src={getEmbedUrl(artwork.externalVideoUrl)}
                  title={artwork.displayableTitle || "Video artwork"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className={styles.artworkVideo}
                  loading="lazy"
                ></iframe>
              </Suspense>
            ) : (
              <div className={styles.videoError}>Video not available</div>
            )}
          </div>
        );
      case "pdf":
        return (
          <Suspense fallback={<div className={styles.skeletonPdf}></div>}>
            <PdfViewer artwork={artwork} />
          </Suspense>
        );
      case "audio":
        return (
          <div className={styles.audioContainer}>
            {artwork.audioUrl ? (
              <Suspense fallback={<div className={styles.skeletonAudio}></div>}>
                <AudioPlayer
                  src={artwork.audioUrl}
                  title={artwork.displayableTitle}
                />
              </Suspense>
            ) : (
              <div className={styles.audioError}>Audio not available</div>
            )}
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className={styles.pageWrapper}>
      {/* Breadcrumbs */}
      <div className={styles.breadcrumbs}>
        <Link href="/" className={styles.breadcrumbLink}>
          Home
        </Link>
        <span className={styles.breadcrumbSeparator}>/</span>

        {artwork.portfolio.parentPortfolio && (
          <>
            <Link
              href={`/portfolio/${artwork.portfolio.parentPortfolio.slug}`}
              className={styles.breadcrumbLink}
            >
              {artwork.portfolio.parentPortfolio.title}
            </Link>
            <span className={styles.breadcrumbSeparator}>/</span>
          </>
        )}

        <Link
          href={`/portfolio/${artwork.portfolio.slug}`}
          className={styles.breadcrumbLink}
        >
          {artwork.portfolio.title}
        </Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>
          {artwork.displayableTitle || "Artwork"}
        </span>
      </div>

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        {/* Artwork Display */}
        <div className={styles.artworkContainer}>
          {renderArtworkDisplay(artwork)}
        </div>
      </div>

      {/* Bottom Navigation and Info */}
      <div className={styles.bottomSection}>
        {/* Navigation with centered info for desktop */}
        <div className={styles.navigation}>
          <Link
            href={`/portfolio/${portfolioSlug}/${prevArtwork.slug}`}
            className={styles.navLink}
            prefetch={true} // Prefetch navigation links
          >
            Previous
          </Link>

          {/* Desktop: Artwork Info - centered between buttons */}
          <div className={styles.desktopArtworkInfo}>
            {artwork.displayableTitle && (
              <h1 className={styles.artworkTitle}>
                {artwork.displayableTitle}
              </h1>
            )}

            <div className={styles.artworkDetails}>
              {artwork.year && (
                <p className={styles.artworkYear}>{artwork.year}</p>
              )}
              {artwork.medium && (
                <p className={styles.artworkMedium}>{artwork.medium}</p>
              )}
              {artwork.dimensions && (
                <p className={styles.artworkDimensions}>{artwork.dimensions}</p>
              )}
            </div>

            {artwork.description && (
              <div className={styles.artworkDescription}>
                <p>{artwork.description}</p>
              </div>
            )}
          </div>

          <Link
            href={`/portfolio/${portfolioSlug}/${nextArtwork.slug}`}
            className={styles.navLink}
            prefetch={true} // Prefetch navigation links
          >
            Next
          </Link>
        </div>
      </div>
      <ArtworkNavigation
        prevUrl={`/portfolio/${portfolioSlug}/${prevArtwork.slug}`}
        nextUrl={`/portfolio/${portfolioSlug}/${nextArtwork.slug}`}
      />
    </div>
  );
}

// Export skeleton for use in loading.js
export { ArtworkPageSkeleton };
