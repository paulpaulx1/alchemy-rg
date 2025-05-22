import { createClient } from "@sanity/client";
import Link from "next/link";
import styles from "./ArtworkPage.module.css";

// Initialize the Sanity client
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2023-03-01",
  useCdn: false,
});

// Generate static params for all artwork pages
export async function generateStaticParams() {
  const artworks = await client.fetch(`
    *[_type == "artwork"] {
      "slug": slug.current,
      "portfolioSlug": portfolio->slug.current
    }
  `);

  return artworks.map((artwork) => ({
    slug: artwork.portfolioSlug,
    artworkSlug: artwork.slug,
  }));
}

export default async function ArtworkPage({ params }) {
  const resolvedParams = await params;
  const { slug: portfolioSlug, artworkSlug } = resolvedParams;

  // Fetch the artwork and its portfolio context
  const artwork = await client.fetch(
    `
    *[_type == "artwork" && slug.current == $artworkSlug][0] {
      _id,
      title,
      mediaType,
      "slug": slug.current,
      "imageUrl": image.asset->url,
      "lowResImageUrl": lowResImage.asset->url,
      "videoUrl": video.asset->url,
      "videoThumbnailUrl": videoThumbnail.asset->url,
      externalVideoUrl,
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
        }
      }
    }
  `,
    { artworkSlug }
  );

  if (!artwork) {
    return (
      <div className={styles.container}>
        <h1>Artwork not found</h1>
        <Link href="/">Return to home</Link>
      </div>
    );
  }

  // Get all artworks in this portfolio for navigation
  const allArtworks = await client.fetch(
    `
    *[_type == "artwork" && portfolio._ref == $portfolioId] | order(order asc) {
      _id,
      title,
      "slug": slug.current,
      order
    }
  `,
    { portfolioId: artwork.portfolio._id }
  );

  // Find current artwork index and navigation links
  const currentIndex = allArtworks.findIndex(a => a._id === artwork._id);
  const prevArtwork = currentIndex > 0 ? allArtworks[currentIndex - 1] : allArtworks[allArtworks.length - 1];
  const nextArtwork = currentIndex < allArtworks.length - 1 ? allArtworks[currentIndex + 1] : allArtworks[0];

  return (
    <div className={styles.container}>
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
        <span className={styles.breadcrumbCurrent}>{artwork.title}</span>
      </div>

      {/* Navigation */}
      <div className={styles.navigation}>
        <Link
          href={`/portfolio/${portfolioSlug}/${prevArtwork.slug}`}
          className={styles.navLink}
        >
          ← Previous
        </Link>
        
        <Link
          href={`/portfolio/${portfolioSlug}`}
          className={styles.backToPortfolio}
        >
          Back to {artwork.portfolio.title}
        </Link>
        
        <Link
          href={`/portfolio/${portfolioSlug}/${nextArtwork.slug}`}
          className={styles.navLink}
        >
          Next →
        </Link>
      </div>

      {/* Artwork Display */}
      <div className={styles.artworkContainer}>
        {/* Artwork Info - Title and Description ABOVE the image */}
        <div className={styles.artworkInfo}>
          <h1 className={styles.artworkTitle}>
            {artwork.title || "Untitled"}
          </h1>
          
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

        {/* Artwork Image/Video - BELOW the info */}
        <div className={styles.artworkImageContainer}>
          {artwork.mediaType === "image" ? (
            <img
              src={artwork.imageUrl}
              alt={artwork.title || "Untitled artwork"}
              className={styles.artworkImage}
            />
          ) : (
            <div className={styles.videoContainer}>
              {artwork.videoUrl ? (
                <video
                  src={artwork.videoUrl}
                  controls
                  className={styles.artworkVideo}
                />
              ) : artwork.externalVideoUrl ? (
                <iframe
                  src={getEmbedUrl(artwork.externalVideoUrl)}
                  title={artwork.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className={styles.artworkVideo}
                ></iframe>
              ) : (
                <div className={styles.videoError}>Video not available</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
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

// Disable caching for fresh data
export const revalidate = 0;