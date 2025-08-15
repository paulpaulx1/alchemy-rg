import { client } from '@/lib/client';
import Link from 'next/link';
import ArtworkGrid from '@/components/ArtworkGrid';
import styles from './Portfolio.module.css';
import { PortableText } from '@portabletext/react';
import { Suspense } from 'react';
import Image from 'next/image';

// Better metadata for performance
export const metadata = {
  robots: 'index, follow',
};

// More aggressive static generation for key portfolios
export async function generateStaticParams() {
  const portfolios = await client.fetch(`
    *[_type == "portfolio" && (parentPortfolio == null || featured == true)] {
      "slug": slug.current,
      featured
    }
  `);

  return portfolios.map((portfolio) => ({
    slug: portfolio.slug,
  }));
}

// Skeleton components (keep your existing ones)
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

// Optimized data fetching with smaller initial payload
async function getPortfolioBasicInfo(slug) {
  return await client.fetch(
    `
    *[_type == "portfolio" && slug.current == $slug][0] {
      _id,
      title,
      description,
      richTextBlock,
      featured,
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
        // Smaller initial images for faster loading
        "imageUrl": image.asset->url + "?w=600&h=450&fit=crop&auto=format&q=80",
        "lowResImageUrl": lowResImage.asset->url + "?w=100&h=75&fit=crop&auto=format&q=60",
        "videoThumbnailUrl": videoThumbnail.asset->url + "?w=600&h=450&fit=crop&auto=format&q=80",
        "pdfThumbnailUrl": pdfThumbnail.asset->url + "?w=600&h=450&fit=crop&auto=format&q=80",
        "audioThumbnailUrl": audioThumbnail.asset->url + "?w=600&h=450&fit=crop&auto=format&q=80",
        // Only include Mux fields if needed
        ...select(mediaType == "video" => {
          muxPlaybackId,
          muxStatus
        }),
        year
      },
      "subPortfolios": *[_type == "portfolio" && parentPortfolio._ref == $portfolioId] | order(order asc) {
        _id,
        title,
        "slug": slug.current,
        description,
        order,
        // Smaller cover images
        "coverImageUrl": coalesce(
          coverArtwork->image.asset->url + "?w=400&h=300&fit=crop&auto=format&q=85",
          coverImage.asset->url + "?w=400&h=300&fit=crop&auto=format&q=85",
          *[_type == "artwork" && portfolio._ref == ^._id] | order(order asc)[0].image.asset->url + "?w=400&h=300&fit=crop&auto=format&q=85"
        ),
        "lowResCoverUrl": coalesce(
          coverArtwork->image.asset->url + "?w=50&h=38&fit=crop&auto=format&q=60",
          coverImage.asset->url + "?w=50&h=38&fit=crop&auto=format&q=60",
          *[_type == "artwork" && portfolio._ref == ^._id] | order(order asc)[0].image.asset->url + "?w=50&h=38&fit=crop&auto=format&q=60"
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

  // Get basic info first for instant rendering
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

  // Get content in parallel for faster loading
  const portfolioContent = await getPortfolioContent(portfolioBasic._id);
  const portfolio = { ...portfolioBasic, ...portfolioContent };

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

      {/* Sub-portfolios with optimized images */}
      {portfolio.subPortfolios && portfolio.subPortfolios.length > 0 && (
        <Suspense fallback={<SubPortfoliosSkeleton />}>
          <div className={styles.subPortfolioList}>
            <div className={styles.portfolioGrid}>
              {portfolio.subPortfolios.map((subPortfolio, index) => (
                <Link
                  href={`/portfolio/${subPortfolio.slug}`}
                  key={subPortfolio._id}
                  className={styles.portfolioCard}
                  prefetch={index < 2} // Only prefetch first 2
                >
                  {subPortfolio.coverImageUrl && (
                    <div className={styles.portfolioImage}>
                      <Image
                        src={subPortfolio.coverImageUrl}
                        alt={subPortfolio.title}
                        width={400}
                        height={300}
                        placeholder="blur"
                        blurDataURL={subPortfolio.lowResCoverUrl || "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Rq5TnyKnLYs1rBsGY4n1mT3/h7BZIJe9fIq0WXlPOuYYrN9t1EJo0ZqGPJOmWUGOGwAAEcELgW+wbAVeV1OlTJlyEZnQ5JUJKFwqaHoRkAVUYjLOUYkqwNaHfGnPV0r3/ahfCFZGbfLxXqDtg"}
                        loading={index < 2 ? "eager" : "lazy"}
                        decoding="async"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        quality={85}
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

      {/* Artworks with improved loading */}
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