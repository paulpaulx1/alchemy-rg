import { client } from "@/lib/client";
import Link from "next/link";
import ResponsiveArtworkImage from "@/components/ResponsiveArtworkImage";
import MuxVideo from "@/components/MuxVideo";
import PdfViewer from "@/components/PdfViewer";
import AudioPlayer from "@/components/AudioPlayer";
import ArtworkNavigation from "@/components/ArtworkNavigation";
import { Suspense } from "react";
import styles from "./ArtworkPage.module.css";

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
// Faster caching for artwork pages
export const revalidate = 604800; // 7 days

async function getPortfolioWithArtworks(portfolioSlug) {
  const data = await client.fetch(
    `
    *[_type == "portfolio" && slug.current == $portfolioSlug][0] {
      _id,
      title,
      "slug": slug.current,
      "parentPortfolio": parentPortfolio->{
        title,
        "slug": slug.current
      },
      "artworks": *[_type == "artwork" && portfolio._ref == ^._id] | order(order asc) {
        _id,
        title,
        mediaType,
        "slug": slug.current,
        "pdfThumbnailUrl": pdfThumbnail.asset->url,
        "pdfUrl": pdfFile.asset->url,
        "imageUrl": image.asset->url,
        year
      }
    }
    `,
    { portfolioSlug },
    { next: { revalidate: 604800, tags: ["sanity"] } }
  );

  console.log("[getPortfolioWithArtworks]", {
    portfolioSlug,
    artworkCount: data?.artworks?.length,
    pdfArtworks: data?.artworks
      ?.filter((a) => a.mediaType === "pdf")
      .map((a) => ({
        title: a.title,
        pdfThumbnailUrl: a.pdfThumbnailUrl,
        pdfUrl: a.pdfUrl,
        imageUrl: a.imageUrl,
      })),
  });

  return data;
}

// Helper function to get embed URL from video links
function getEmbedUrl(url) {
  const youtubeRegex =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const youtubeMatch = url.match(youtubeRegex);

  if (youtubeMatch && youtubeMatch[2].length === 11) {
    return `https://www.youtube.com/embed/${youtubeMatch[2]}`;
  }

  const vimeoRegex =
    /^.*(vimeo\.com\/)((channels\/[A-z]+\/)|(groups\/[A-z]+\/videos\/))?([0-9]+)/;
  const vimeoMatch = url.match(vimeoRegex);

  if (vimeoMatch && vimeoMatch[5]) {
    return `https://player.vimeo.com/video/${vimeoMatch[5]}`;
  }

  return url;
}

// Faster caching for artwork pages

export default async function ArtworkPage({ params }) {
  // In App Router, params is already resolved - no need to await
  const { slug: portfolioSlug, artworkSlug } = params;

  // Get all portfolio data including all artworks
  const portfolioData = await getPortfolioWithArtworks(
    portfolioSlug,
    artworkSlug
  );


  if (!portfolioData || !portfolioData.artworks) {
    return (
      <div>
        <h1>Portfolio not found</h1>
        <Link href="/">Return to home</Link>
      </div>
    );
  }

  // Find the current artwork
  const currentArtwork = portfolioData.artworks.find(
    (a) => a.slug === artworkSlug
  );

  if (!currentArtwork) {
    return (
      <div>
        <h1>Artwork not found</h1>
        <Link href={`/portfolio/${portfolioSlug}`}>Return to portfolio</Link>
      </div>
    );
  }

  // Get navigation artworks
  const currentIndex = portfolioData.artworks.findIndex(
    (a) => a.slug === artworkSlug
  );
  const prevArtwork =
    currentIndex > 0
      ? portfolioData.artworks[currentIndex - 1]
      : portfolioData.artworks[portfolioData.artworks.length - 1];
  const nextArtwork =
    currentIndex < portfolioData.artworks.length - 1
      ? portfolioData.artworks[currentIndex + 1]
      : portfolioData.artworks[0];

  // Render artwork based on type
  function renderArtworkDisplay(artwork) {
    switch (artwork.mediaType) {
      case "image":
        const imageUrl = artwork.lowResImageUrl || artwork.imageUrl;
        const finalUrl = imageUrl ? `${imageUrl}` : null;

        return finalUrl ? (
          <ResponsiveArtworkImage
            src={finalUrl}
            alt={artwork.displayableTitle || "Artwork"}
            title={artwork.displayableTitle}
            priority={true}
          />
        ) : (
          <div className={styles.noImage}>No image available</div>
        );

      case "video":
        const videoThumbnail = artwork.videoThumbnailUrl
          ? `${artwork.videoThumbnailUrl}?auto=format&q=75`
          : null;

        return (
          <div className={styles.videoContainer}>
            {artwork.muxPlaybackId ? (
              <MuxVideo
                playbackId={artwork.muxPlaybackId}
                poster={videoThumbnail}
                title={artwork.displayableTitle || "Video artwork"}
                className={styles.artworkVideo}
                controls={true}
                preload="none"
              />
            ) : artwork.videoUrl ? (
              <video
                src={artwork.videoUrl}
                controls
                className={styles.artworkVideo}
                preload="none"
                poster={videoThumbnail}
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
        return <div>Unsupported media type</div>;
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

        {portfolioData.parentPortfolio && (
          <>
            <Link
              href={`/portfolio/${portfolioData.parentPortfolio.slug}`}
              className={styles.breadcrumbLink}
            >
              {portfolioData.parentPortfolio.title}
            </Link>
            <span className={styles.breadcrumbSeparator}>/</span>
          </>
        )}

        <Link
          href={`/portfolio/${portfolioData.slug}`}
          className={styles.breadcrumbLink}
        >
          {portfolioData.title}
        </Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>
          {currentArtwork.displayableTitle || "Artwork"}
        </span>
      </div>

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        <div className={styles.artworkContainer}>
          {renderArtworkDisplay(currentArtwork)}
        </div>
      </div>

      {/* Bottom Navigation and Info */}
      <div className={styles.bottomSection}>
        <div className={styles.navigation}>
          <Link
            href={`/portfolio/${portfolioData.slug}/${prevArtwork.slug}`}
            className={styles.navLink}
          >
            Previous
          </Link>

          <div className={styles.desktopArtworkInfo}>
            {currentArtwork.displayableTitle && (
              <h1 className={styles.artworkTitle}>
                {currentArtwork.displayableTitle}
              </h1>
            )}

            <div className={styles.artworkDetails}>
              {currentArtwork.year && (
                <p className={styles.artworkYear}>{currentArtwork.year}</p>
              )}
              {currentArtwork.medium && (
                <p className={styles.artworkMedium}>{currentArtwork.medium}</p>
              )}
              {currentArtwork.dimensions && (
                <p className={styles.artworkDimensions}>
                  {currentArtwork.dimensions}
                </p>
              )}
            </div>

            {currentArtwork.description && (
              <div className={styles.artworkDescription}>
                <p>{currentArtwork.description}</p>
              </div>
            )}
          </div>

          <Link
            href={`/portfolio/${portfolioData.slug}/${nextArtwork.slug}`}
            className={styles.navLink}
          >
            Next
          </Link>
        </div>
      </div>

      {/* Keyboard Navigation */}
      <ArtworkNavigation
        prevUrl={`/portfolio/${portfolioData.slug}/${prevArtwork.slug}`}
        nextUrl={`/portfolio/${portfolioData.slug}/${nextArtwork.slug}`}
      />
    </div>
  );
}
