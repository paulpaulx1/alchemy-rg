import { client } from "@/lib/client";
import Link from "next/link";
import ArtworkGrid from "@/components/ArtworkGrid";
import styles from "./Portfolio.module.css";
import { PortableText } from "@portabletext/react";
import { Suspense } from "react";
import SafeImage from "@/components/SafeImage"; // ✅ new wrapper component

// ISR config
export const revalidate = 604800; // 7 days, refreshed via webhook

export const metadata = {
  robots: "index, follow",
};

// -----------------------------------------------------------
// 🧠 Data fetching
// -----------------------------------------------------------

export async function generateStaticParams() {
  const portfolios = await client.fetch(
    `*[_type == "portfolio" && (parentPortfolio == null || featured == true)]{
      "slug": slug.current, featured
    }`,
    {},
    { next: { revalidate: 604800, tags: ["sanity"] } }
  );

  return portfolios.map((p) => ({ slug: p.slug }));
}

async function getPortfolioBasicInfo(slug) {
  return client.fetch(
    `*[_type == "portfolio" && slug.current == $slug][0]{
      _id, title, description, richTextBlock, featured,
      "parentPortfolio": parentPortfolio->{title, "slug": slug.current}
    }`,
    { slug },
    { next: { revalidate: 604800, tags: ["sanity"] } }
  );
}

async function getPortfolioContent(portfolioId) {
  return client.fetch(
    `{
      "artworks": *[_type == "artwork" && portfolio._ref == $portfolioId] | order(order asc){
        _id, title, displayTitle,
        "displayableTitle": select(displayTitle == true => title, null),
        mediaType, "slug": slug.current,
        "imageUrl": image.asset->url,
        "videoThumbnailUrl": videoThumbnail.asset->url,
        "pdfThumbnailUrl": pdfThumbnail.asset->url,
        "audioThumbnailUrl": audioThumbnail.asset->url,
        ...select(mediaType == "video" => { muxPlaybackId, muxStatus }),
        year
      },
      "subPortfolios": *[_type == "portfolio" && parentPortfolio._ref == $portfolioId] | order(order asc){
        _id, title, "slug": slug.current, description, order,
        "coverImageUrl": coalesce(
          coverArtwork->image.asset->url,
          coverImage.asset->url,
          *[_type == "artwork" && portfolio._ref == ^._id] | order(order asc)[0].image.asset->url
        )
      }
    }`,
    { portfolioId },
    { next: { revalidate: 604800, tags: ["sanity"] } }
  );
}

// -----------------------------------------------------------
// 🧱 Component
// -----------------------------------------------------------
export default async function Portfolio({ params }) {
  const { slug } = await params;
  const portfolioBasic = await getPortfolioBasicInfo(slug);

  if (!portfolioBasic) {
    return (
      <div className={styles.container}>
        <h1 className={styles.heading}>Portfolio not found</h1>
        <Link href="/" className={styles.link}>
          Return to home
        </Link>
      </div>
    );
  }

  const portfolioContent = await getPortfolioContent(portfolioBasic._id);
  const portfolio = { ...portfolioBasic, ...portfolioContent };

  return (
    <div className={styles.container}>
      {/* Breadcrumbs */}
      <div className={styles.breadcrumbs}>
        <Link href="/" className={styles.breadcrumbLink}>
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

      {/* Header */}
      {!portfolio.richTextBlock && (
        <h1 className={styles.heading}>{portfolio.title}</h1>
      )}

      {portfolio.richTextBlock ? (
        <div className={styles.description}>
          <PortableText value={portfolio.richTextBlock} />
        </div>
      ) : portfolio.description &&
        !portfolio.description.includes(`Portfolio: ${portfolio.title}`) ? (
        <p className={styles.description}>{portfolio.description}</p>
      ) : null}

      {/* Sub-portfolios */}
      {portfolio.subPortfolios?.length > 0 && (
        <Suspense fallback={<SubPortfoliosSkeleton />}>
          <div className={styles.subPortfolioList}>
            <div className={styles.portfolioGrid}>
              {portfolio.subPortfolios.map((sub, index) => (
                <Link
                  href={`/portfolio/${sub.slug}`}
                  key={sub._id}
                  className={styles.portfolioCard}
                  prefetch={index < 2}
                >
                  {sub.coverImageUrl && (
                    <div className={styles.portfolioImage}>
                      <SafeImage
                        src={sub.coverImageUrl}
                        alt={sub.title}
                        width={400}
                        height={300}
                        priority={index < 2}
                        loading={index < 2 ? "eager" : "lazy"}
                        sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 33vw"
                        className={styles.portfolioImageInner}
                      />
                    </div>
                  )}
                  <h3 className={styles.portfolioTitle}>{sub.title}</h3>
                  {sub.description &&
                    !sub.description.includes(`Portfolio: ${sub.title}`) && (
                      <p className={styles.portfolioDescription}>
                        {sub.description}
                      </p>
                    )}
                </Link>
              ))}
            </div>
          </div>
        </Suspense>
      )}

      {/* Artworks */}
      {portfolio.artworks?.length > 0 && (
        <Suspense
          fallback={
            <ArtworkGrid
              artworks={[]}
              isLoading={true}
              skeletonCount={Math.min(portfolio.artworks.length, 8)}
            />
          }
        >
          <ArtworkGrid artworks={portfolio.artworks} isLoading={false} />
        </Suspense>
      )}

      {/* Empty */}
      {!portfolio.artworks?.length && !portfolio.subPortfolios?.length && (
        <p className={styles.emptyMessage}>
          No artwork or collections in this portfolio yet.
        </p>
      )}
    </div>
  );
}

// -----------------------------------------------------------
// 🩶 Skeletons (unchanged)
// -----------------------------------------------------------
function SubPortfoliosSkeleton() {
  return (
    <div className={styles.subPortfolioList}>
      <div className={styles.portfolioGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.portfolioCard}>
            <div className={styles.skeletonPortfolioImage}></div>
            <div className={styles.skeletonPortfolioTitle}></div>
            <div className={styles.skeletonPortfolioDesc}></div>
          </div>
        ))}
      </div>
    </div>
  );
}
