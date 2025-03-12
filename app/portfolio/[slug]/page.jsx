// app/portfolio/[slug]/page.js
import { createClient } from "@sanity/client";
import Link from "next/link";
import ArtworkGrid from "@/app/components/ArtworkGrid";
import styles from "./Portfolio.module.css";

// Initialize the Sanity client (server-side)
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2023-03-01",
  useCdn: false, // For fresh data in SSR
});

// Generate static params for static generation
export async function generateStaticParams() {
  const portfolios = await client.fetch(`
    *[_type == "portfolio"] {
      "slug": slug.current
    }
  `);

  return portfolios.map((portfolio) => ({
    slug: portfolio.slug,
  }));
}

export default async function Portfolio({ params }) {
  const { slug } = params;

  // Fetch portfolio data
  // In app/portfolio/[slug]/page.js, modify the query:
  const portfolio = await client.fetch(
    `
  *[_type == "portfolio" && slug.current == $slug][0] {
    _id,
    title,
    description,
    "parentPortfolio": parentPortfolio->{
      title,
      "slug": slug.current
    },
    "artworks": *[_type == "artwork" && portfolio._ref == ^._id] | order(order asc) {
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
      dimensions
    },
    "subPortfolios": *[_type == "portfolio" && parentPortfolio._ref == ^._id] {
      _id,
      title,
      "slug": slug.current,
      description,
      "coverImageUrl": coverImage.asset->url
    }
  }
`,
    { slug }
  );

  if (!portfolio) {
    return (
      <div className={styles.container}>
        <h1 className={styles.heading}>Portfolio not found</h1>
        <Link href="/" className={styles.link}>
          Return to home
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Breadcrumb navigation */}
      <div className={styles.breadcrumbs}>{/* Same as before */}</div>

      <h1 className={styles.heading}>{portfolio.title}</h1>

      {portfolio.description && (
        <p className={styles.description}>{portfolio.description}</p>
      )}

      {/* Show sub-portfolios if they exist */}
      {portfolio.subPortfolios && portfolio.subPortfolios.length > 0 && (
        <div className={styles.subPortfolioList}>
          <h2 className={styles.subHeading}>Collections</h2>
          <div className={styles.portfolioGrid}>
            {portfolio.subPortfolios.map((subPortfolio) => (
              <Link
                href={`/portfolio/${subPortfolio.slug}`}
                key={subPortfolio._id}
                className={styles.portfolioCard}
              >
                {subPortfolio.coverImageUrl && (
                  <div className={styles.portfolioImage}>
                    <img
                      src={subPortfolio.coverImageUrl}
                      alt={subPortfolio.title}
                    />
                  </div>
                )}
                <h3 className={styles.portfolioTitle}>{subPortfolio.title}</h3>
                {subPortfolio.description && (
                  <p className={styles.portfolioDescription}>
                    {subPortfolio.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Show artworks if they exist */}
      {portfolio.artworks && portfolio.artworks.length > 0 && (
        <ArtworkGrid artworks={portfolio.artworks} />
      )}

      {/* Show a message if no content */}
      {(!portfolio.artworks || portfolio.artworks.length === 0) &&
        (!portfolio.subPortfolios || portfolio.subPortfolios.length === 0) && (
          <p className={styles.emptyMessage}>
            No artwork or collections in this portfolio yet.
          </p>
        )}
    </div>
  );
}

// Enable ISR - updates the cache every 60 seconds
export const revalidate = 60;
