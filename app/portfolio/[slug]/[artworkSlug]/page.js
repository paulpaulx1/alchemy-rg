import { client } from "@/lib/client";
import ClientArtworkNavigator from "./ClientArtworkNavigator";

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

// Enhanced query to get ALL portfolio artworks with full data
async function getPortfolioWithArtworks(portfolioSlug, artworkSlug) {
  return await client.fetch(
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
        displayTitle,
        "displayableTitle": select(displayTitle == true => title, null),
        mediaType,
        "slug": slug.current,
        year,
        medium,
        dimensions,
        description,
        order,
        "imageUrl": image.asset->url,
        "lowResImageUrl": lowResImage.asset->url,
        "videoUrl": video.asset->url,
        "videoThumbnailUrl": videoThumbnail.asset->url,
        externalVideoUrl,
        muxPlaybackId,
        muxAssetId,
        muxStatus,
        "pdfUrl": pdfFile.asset->url,
        "pdfThumbnailUrl": pdfThumbnail.asset->url,
        "audioUrl": audioFile.asset->url,
        "audioThumbnailUrl": audioThumbnail.asset->url
      }
    }
  `,
    { portfolioSlug }
  );
}

// Faster caching for artwork pages
export const revalidate = 600; // 10 minutes

export default async function ArtworkPage({ params }) {
  const resolvedParams = await params;
  const { slug: portfolioSlug, artworkSlug } = resolvedParams;

  // Get all portfolio data including all artworks
  const portfolioData = await getPortfolioWithArtworks(portfolioSlug, artworkSlug);

  if (!portfolioData || !portfolioData.artworks) {
    return (
      <div>
        <h1>Portfolio not found</h1>
        <Link href="/">Return to home</Link>
      </div>
    );
  }

  // Find the current artwork
  const currentArtwork = portfolioData.artworks.find(a => a.slug === artworkSlug);
  
  if (!currentArtwork) {
    return (
      <div>
        <h1>Artwork not found</h1>
        <Link href={`/portfolio/${portfolioSlug}`}>Return to portfolio</Link>
      </div>
    );
  }

  return (
    <ClientArtworkNavigator 
      portfolioData={portfolioData}
      initialArtworkSlug={artworkSlug}
    />
  );
}