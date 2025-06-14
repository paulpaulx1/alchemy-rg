import { client } from '@/lib/client';
import Link from 'next/link';
import ArtworkGrid from '@/components/ArtworkGrid';
import styles from './Portfolio.module.css';
import { PortableText } from '@portabletext/react';

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
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  // Fetch portfolio data
  const portfolio = await client.fetch(
    `
  *[_type == "portfolio" && slug.current == $slug][0] {
    _id,
    title,
    description,
    richTextBlock,
    "parentPortfolio": parentPortfolio->{
      title,
      "slug": slug.current
    },
    "artworks": *[_type == "artwork" && portfolio._ref == ^._id] | order(order asc) {
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
      "pdfUrl": pdfFile.asset->url,
      "pdfThumbnailUrl": pdfThumbnail.asset->url,
      "audioUrl": audioFile.asset->url,
      "audioThumbnailUrl": audioThumbnail.asset->url,
      description,
      year,
      medium,
      dimensions
    },
    "subPortfolios": *[_type == "portfolio" && parentPortfolio._ref == ^._id] | order(order asc) {
      _id,
      title,
      "slug": slug.current,
      description,
      order,
      "coverImageUrl": coalesce(
        coverArtwork->image.asset->url,
        coverImage.asset->url,
        *[_type == "artwork" && portfolio._ref == ^._id] | order(order asc)[0].image.asset->url
      )
    }
  }
  `,
    { slug }
  );

  console.log('portfolio in portfolio page', portfolio);

  if (!portfolio) {
    return (
      <div className={styles.container}>
        <h1 className={styles.heading}>Portfolio not found</h1>
        <Link href='/' className={styles.link}>
          Return to home
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Simplified breadcrumb - only show parent links */}
      <div className={styles.breadcrumbs}>
        <Link href='/' className={styles.breadcrumbLink}>
          Home
        </Link>
        <span className={styles.breadcrumbSeparator}>/</span>

        {portfolio.parentPortfolio && (
          <>
            <Link
              href={`/portfolio/${portfolio.parentPortfolio.slug}`}
              className={styles.breadcrumbLink}
            >
              {portfolio.parentPortfolio.title}
            </Link>
            <span className={styles.breadcrumbSeparator}>/</span>
          </>
        )}

        {/* Current portfolio (not clickable) */}
        <span className={styles.breadcrumbCurrent}>{portfolio.title}</span>
      </div>

      {/* Centered portfolio title - only show if no rich text */}
      {!portfolio.richTextBlock && (
        <h1 className={styles.heading}>{portfolio.title}</h1>
      )}

      {/* Rich text block or fallback description - only show one */}
      {portfolio.richTextBlock ? (
        <div className={styles.description}>
          <PortableText value={portfolio.richTextBlock} />
        </div>
      ) : portfolio.description && !portfolio.description.includes(`Portfolio: ${portfolio.title}`) ? (
        <p className={styles.description}>{portfolio.description}</p>
      ) : null}

      {/* Show sub-portfolios if they exist */}
      {portfolio.subPortfolios && portfolio.subPortfolios.length > 0 && (
        <div className={styles.subPortfolioList}>
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
                {/* Only show description if it exists AND doesn't just repeat the portfolio name */}
                {subPortfolio.description &&
                  !subPortfolio.description.includes(
                    `Portfolio: ${subPortfolio.title}`
                  ) && (
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