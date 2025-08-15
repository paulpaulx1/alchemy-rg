import { client } from "@/lib/client";
import Link from "next/link";
import ResponsiveArtworkImage from "@/components/ResponsiveArtworkImage";
import MuxVideo from "@/components/MuxVideo";
import styles from "./ArtworkPage.module.css";
import PdfViewer from "@/components/PdfViewer";
import ArtworkNavigation from "@/components/ArtworkNavigation";
import AudioPlayer from "@/components/AudioPlayer";
import { Suspense } from "react";

// More conservative static generation
export async function generateStaticParams() {
  // Only generate for very popular artworks
  const artworks = await client.fetch(`
    *[_type == "artwork" && (featured == true || portfolio->featured == true)] [0...20] {
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
  const youtubeRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const youtubeMatch = url.match(youtubeRegex);

  if (youtubeMatch && youtubeMatch[2].length === 11) {
    return `https://www.youtube.com/embed/${youtubeMatch[2]}`;
  }

  const vimeoRegex = /^.*(vimeo\.com\/)((channels\/[A-z]+\/)|(groups\/[A-z]+\/videos\/))?([0-9]+)/;
  const vimeoMatch = url.match(vimeoRegex);

  if (vimeoMatch && vimeoMatch[5]) {
    return `https://player.vimeo.com/video/${vimeoMatch[5]}`;
  }

  return url;
}

// Split queries for faster initial load
async function getArtworkBasicInfo(artworkSlug) {
  return await client.fetch(
    `
    *[_type == "artwork" && slug.current == $artworkSlug][0] {
      _id,
      title,
      displayTitle,
      "displayableTitle": select(displayTitle == true => title, null),
      mediaType,
      "slug": slug.current,
      year,
      medium,
      dimensions,
      description,
      order,
      "portfolio": portfolio-> {
        _id,
        title,
        "slug": slug.current,
        "parentPortfolio": parentPortfolio->{
          title,
          "slug": slug.current
        }
      }
    }
  `,
    { artworkSlug }
  );
}

async function getArtworkMediaAssets(artworkId, mediaType) {
  // Only fetch assets for the specific media type
  const mediaQueries = {
    image: `
      "imageUrl": image.asset->url,
      "lowResImageUrl": lowResImage.asset->url,
    `,
    video: `
      "videoUrl": video.asset->url,
      "videoThumbnailUrl": videoThumbnail.asset->url,
      externalVideoUrl,
      muxPlaybackId,
      muxAssetId,
      muxStatus,
    `,
    pdf: `
      "pdfUrl": pdfFile.asset->url,
      "pdfThumbnailUrl": pdfThumbnail.asset->url,
    `,
    audio: `
      "audioUrl": audioFile.asset->url,
      "audioThumbnailUrl": audioThumbnail.asset->url,
    `
  };

  return await client.fetch(
    `
    *[_type == "artwork" && _id == $artworkId][0] {
      ${mediaQueries[mediaType] || ''}
    }
  `,
    { artworkId }
  );
}

async function getArtworkNavigation(portfolioId, currentOrder) {
  return await client.fetch(
    `
    *[_type == "artwork" && portfolio._ref == $portfolioId] | order(order asc) {
      _id,
      title,
      displayTitle,
      "displayableTitle": select(displayTitle == true => title, null),
      "slug": slug.current,
      order
    }
  `,
    { portfolioId, currentOrder }
  );
}

// Skeleton component
function ArtworkPageSkeleton() {
  return (
    <div className={styles.pageWrapper}>
      <div className={styles.breadcrumbs}>
        <div className={styles.skeletonBreadcrumb}></div>
        <span className={styles.breadcrumbSeparator}>/</span>
        <div className={styles.skeletonBreadcrumb}></div>
        <span className={styles.breadcrumbSeparator}>/</span>
        <div className={styles.skeletonBreadcrumb}></div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.artworkContainer}>
          <div className={styles.skeletonArtwork}></div>
        </div>
      </div>

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

// Faster caching for artwork pages
export const revalidate = 600; // 10 minutes

export default async function ArtworkPage({ params }) {
  const resolvedParams = await params;
  const { slug: portfolioSlug, artworkSlug } = resolvedParams;

  // Get basic info first for fast render
  const artworkBasic = await getArtworkBasicInfo(artworkSlug);

  if (!artworkBasic) {
    return (
      <div className={styles.container}>
        <h1>Artwork not found</h1>
        <Link href="/">Return to home</Link>
      </div>
    );
  }

  // Get media assets and navigation in parallel
  const [mediaAssets, allArtworks] = await Promise.all([
    getArtworkMediaAssets(artworkBasic._id, artworkBasic.mediaType),
    getArtworkNavigation(artworkBasic.portfolio._id, artworkBasic.order)
  ]);

  // Combine the data
  const artwork = { ...artworkBasic, ...mediaAssets };

  // Find navigation
  const currentIndex = allArtworks.findIndex((a) => a._id === artwork._id);
  const prevArtwork = currentIndex > 0 
    ? allArtworks[currentIndex - 1] 
    : allArtworks[allArtworks.length - 1];
  const nextArtwork = currentIndex < allArtworks.length - 1 
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
              priority={true}
            />
          </Suspense>
        );
      case "video":
        console.log("Full artwork object:", artwork);
        console.log("muxPlaybackId specifically:", artwork.muxPlaybackId);
        return (
          <div className={styles.videoContainer}>
            {artwork.muxPlaybackId ? (
              <MuxVideo
                playbackId={artwork.muxPlaybackId}
                poster={artwork.videoThumbnailUrl}
                title={artwork.displayableTitle || "Video artwork"}
                className={styles.artworkVideo}
                controls={true}
                // Use our optimized preload setting
                preload="none"
              />
            ) : artwork.videoUrl ? (
              <video
                src={artwork.videoUrl}
                controls
                className={styles.artworkVideo}
                preload="none" // Changed from metadata
                poster={artwork.videoThumbnailUrl}
              />
            ) : artwork.externalVideoUrl ? (
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
        <div className={styles.artworkContainer}>
          {renderArtworkDisplay(artwork)}
        </div>
      </div>

      {/* Bottom Navigation and Info */}
      <div className={styles.bottomSection}>
        <div className={styles.navigation}>
          <Link
            href={`/portfolio/${portfolioSlug}/${prevArtwork.slug}`}
            className={styles.navLink}
            prefetch={false} // Don't prefetch - too aggressive for mobile
          >
            Previous
          </Link>

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
            prefetch={false} // Don't prefetch - too aggressive for mobile
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