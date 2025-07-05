import { client } from '@/lib/client';
import Link from 'next/link';
import ArtworkGrid from '@/components/ArtworkGrid';
import styles from './Portfolio.module.css';
import { PortableText } from '@portabletext/react';
import { Suspense } from 'react';

// Only generate static params for main portfolios to reduce build time
export async function generateStaticParams() {
  // Only generate for top-level portfolios or featured ones
  const portfolios = await client.fetch(`
    *[_type == "portfolio" && (parentPortfolio == null || featured == true)] {
      "slug": slug.current
    }
  `);

  return portfolios.map((portfolio) => ({
    slug: portfolio.slug,
  }));
}

// Skeleton components
function PortfolioBreadcrumbsSkeleton() {
  return (
    <div className={styles.breadcrumbs}>
      <div className={styles.skeletonBreadcrumb}></div>
      <span className={styles.breadcrumbSeparator}>/</span>
      <div className={styles.skeletonBreadcrumb}></div>
    </div>
  );
}

function PortfolioHeaderSkeleton() {
  return (
    <div className={styles.headerSkeleton}>
      <div className={styles.skeletonTitle}></div>
      <div className={styles.skeletonDescription}></div>
      <div className={styles.skeletonDescription} style={{ width: '60%' }}></div>
    </div>
  );
}

function SubPortfoliosSkeleton() {
  return (
    <div className={styles.subPortfolioList}>
      <div className={styles.portfolioGrid}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className={styles.portfolioCard}>
            <div className={styles.skeletonPortfolioImage}></div>
            <div className={styles.skeletonPortfolioTitle}></div>
            <div className={styles.skeletonPortfolioDesc}></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PortfolioPageSkeleton() {
  return (
    <div className={styles.container}>
      <PortfolioBreadcrumbsSkeleton />
      <PortfolioHeaderSkeleton />
      <SubPortfoliosSkeleton />
    </div>
  );
}

// Split data fetching for better performance
async function getPortfolioBasicInfo(slug) {
  return await client.fetch(
    `
    *[_type == "portfolio" && slug.current == $slug][0] {
      _id,
      title,
      description,
      richTextBlock,
      "parentPortfolio": parentPortfolio->{
        title,
        "slug": slug.current
      }
    }
  `,
    { slug }
  );
}

async function getPortfolioContent(portfolioId) {
  return await client.fetch(
    `
    {
      "artworks": *[_type == "artwork" && portfolio._ref == $portfolioId] | order(order asc) {
        _id,
        title,
        displayTitle,
        "displayableTitle": select(displayTitle == true => title, null),
        mediaType,
        "slug": slug.current,
        "imageUrl": image.asset->url + "?w=800&h=600&fit=crop&auto=format&q=85",
        "lowResImageUrl": lowResImage.asset->url,
        "videoThumbnailUrl": videoThumbnail.asset->url,
        "pdfThumbnailUrl": pdfThumbnail.asset->url,
        "audioThumbnailUrl": audioThumbnail.asset->url,
        year
      },
      "subPortfolios": *[_type == "portfolio" && parentPortfolio._ref == $portfolioId] | order(order asc) {
        _id,
        title,
        "slug": slug.current,
        description,
        order,
        "coverImageUrl": coalesce(
          coverArtwork->image.asset->url + "?w=600&h=400&fit=crop&auto=format&q=85",
          coverImage.asset->url + "?w=600&h=400&fit=crop&auto=format&q=85",
          *[_type == "artwork" && portfolio._ref == ^._id] | order(order asc)[0].image.asset->url + "?w=600&h=400&fit=crop&auto=format&q=85"
        )
      }
    }
  `,
    { portfolioId }
  );
}

export default async function Portfolio({ params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  // First, get basic portfolio info quickly
  const portfolioBasic = await getPortfolioBasicInfo(slug);

  if (!portfolioBasic) {
    return (
      <div className={styles.container}>
        <h1 className={styles.heading}>Portfolio not found</h1>
        <Link href='/' className={styles.link}>
          Return to home
        </Link>
      </div>
    );
  }

  // Then get the content (this can be slower)
  const portfolioContent = await getPortfolioContent(portfolioBasic._id);

  // Combine the data
  const portfolio = {
    ...portfolioBasic,
    ...portfolioContent
  };

  return (
    <div className={styles.container}>
      {/* Breadcrumbs */}
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

        <span className={styles.breadcrumbCurrent}>{portfolio.title}</span>
      </div>

      {/* Portfolio Header */}
      {!portfolio.richTextBlock && (
        <h1 className={styles.heading}>{portfolio.title}</h1>
      )}

      {/* Rich text block or fallback description */}
      {portfolio.richTextBlock ? (
        <div className={styles.description}>
          <PortableText value={portfolio.richTextBlock} />
        </div>
      ) : portfolio.description && !portfolio.description.includes(`Portfolio: ${portfolio.title}`) ? (
        <p className={styles.description}>{portfolio.description}</p>
      ) : null}

      {/* Sub-portfolios with lazy loading */}
      {portfolio.subPortfolios && portfolio.subPortfolios.length > 0 && (
        <Suspense fallback={<SubPortfoliosSkeleton />}>
          <div className={styles.subPortfolioList}>
            <div className={styles.portfolioGrid}>
              {portfolio.subPortfolios.map((subPortfolio) => (
                <Link
                  href={`/portfolio/${subPortfolio.slug}`}
                  key={subPortfolio._id}
                  className={styles.portfolioCard}
                  prefetch={false} // Don't prefetch sub-portfolios immediately
                >
                  {subPortfolio.coverImageUrl && (
                    <div className={styles.portfolioImage}>
                      <img
                        src={subPortfolio.coverImageUrl}
                        alt={subPortfolio.title}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  )}
                  <h3 className={styles.portfolioTitle}>{subPortfolio.title}</h3>
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
        </Suspense>
      )}

      {/* Artworks with skeleton loading */}
      {portfolio.artworks && portfolio.artworks.length > 0 && (
        <Suspense fallback={
          <ArtworkGrid 
            artworks={[]} 
            isLoading={true} 
            skeletonCount={Math.min(portfolio.artworks.length, 8)} 
          />
        }>
          <ArtworkGrid 
            artworks={portfolio.artworks} 
            isLoading={false}
          />
        </Suspense>
      )}

      {/* Empty state */}
      {(!portfolio.artworks || portfolio.artworks.length === 0) &&
        (!portfolio.subPortfolios || portfolio.subPortfolios.length === 0) && (
          <p className={styles.emptyMessage}>
            No artwork or collections in this portfolio yet.
          </p>
        )}
    </div>
  );
}

// Better caching strategy
export const revalidate = 300; // 5 minutes

// Export skeleton for loading.js
export { PortfolioPageSkeleton };