import { client } from "@/lib/client";
import FeaturedPortfolio from "../components/FeaturedPortfolio";
import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import ReloadButton from "@/components/ReloadButton";

// Helper to optimize image URL with minimal compression
function optimizeImageUrl(url, userAgent = "") {
  if (!url) return url;

  // Extract dimensions from Sanity URL if available (format: widthxheight)
  const dimensionMatch = url.match(/-(\d+)x(\d+)\./);
  let originalWidth, originalHeight;

  if (dimensionMatch) {
    originalWidth = parseInt(dimensionMatch[1]);
    originalHeight = parseInt(dimensionMatch[2]);
  }

  // If we can estimate the file size, apply minimal compression
  if (originalWidth && originalHeight) {
    // Rough estimate: assume ~3 bytes per pixel for JPEG
    const estimatedSize = (originalWidth * originalHeight * 3) / 1024; // KB

    // Only compress if estimated size > 500KB
    if (estimatedSize > 500) {
      // Use minimal compression - just enough to get under 500KB
      // Start with high quality and only resize if absolutely necessary
      let quality = 95; // Very high quality
      let targetWidth = originalWidth;
      let targetHeight = originalHeight;

      // If image is very large, resize slightly but keep quality high
      if (originalWidth > 2000 || originalHeight > 2000) {
        const maxDimension = 1800;
        if (originalWidth > originalHeight) {
          targetWidth = maxDimension;
          targetHeight = Math.round(
            (originalHeight * maxDimension) / originalWidth
          );
        } else {
          targetHeight = maxDimension;
          targetWidth = Math.round(
            (originalWidth * maxDimension) / originalHeight
          );
        }
        quality = 92; // Still very high
      }

      return `${url}?w=${targetWidth}&h=${targetHeight}&fit=max&auto=format&q=${quality}`;
    }
  }

  // For images we can't estimate or are likely under 500KB, just add format optimization
  return `${url}?auto=format&q=95`;
}

// Better metadata for performance and SEO
export const metadata = {
  title: "Raj Gupta",
  description: "Explore featured artworks and portfolios",
  robots: "index, follow",
};

// Separate viewport export (Next.js 14+ requirement)
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Optimized ISR with better caching
export const revalidate = 604800; // 15 minutes for more responsive updates

// Loading component for better UX
function HomePage() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-pulse bg-gray-200 w-96 h-64 mb-4 mx-auto"></div>
        <p className="text-gray-600">Loading portfolio...</p>
      </div>
    </div>
  );
}

export default async function Home() {
  try {
    // Get user agent for device detection
    const headersList = headers();
    const userAgent = headersList.get("user-agent") || "";

    // Get the first artwork WITHOUT forced dimensions
    const featuredPortfolio = await client.fetch(
      `
  *[_type == "portfolio" && featured == true][0] {
    _id,
    title,
    description,
    "firstArtwork": *[_type == "artwork" && portfolio._ref == ^._id] | order(order asc)[0] {
      _id,
      title,
      displayTitle,
      "displayableTitle": select(displayTitle == true => title, null),
      mediaType,
      image { asset->{url} },
      "videoThumbnailUrl": videoThumbnail.asset->url,
      "pdfThumbnailUrl": pdfThumbnail.asset->url,
      "audioThumbnailUrl": audioThumbnail.asset->url
    },
    "artworkCount": count(*[_type == "artwork" && portfolio._ref == ^._id])
  }
  `,
      {},
      { next: { revalidate: 604800, tags: ["sanity"] } } // ✅ cache + tag
    );

    // Better error handling with different scenarios
    if (!featuredPortfolio) {
      return (
        <main>
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">No Featured Portfolio</h1>
              <p className="text-gray-600 mb-4">
                Please set a portfolio as featured in your CMS.
              </p>
              <Link
                href="/portfolio"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Browse all portfolios
              </Link>
            </div>
          </div>
        </main>
      );
    }

    if (!featuredPortfolio.firstArtwork) {
      return (
        <main>
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">
                {featuredPortfolio.title}
              </h1>
              <p className="text-gray-600">
                No artworks available in this portfolio yet.
              </p>
            </div>
          </div>
        </main>
      );
    }

    // Get the appropriate thumbnail based on media type
    const getThumbnailUrl = (artwork) => {
      switch (artwork.mediaType) {
        case "image":
          return artwork.image?.asset?.url;
        case "video":
          return artwork.videoThumbnailUrl;
        case "pdf":
          return artwork.pdfThumbnailUrl;
        case "audio":
          return artwork.audioThumbnailUrl;
        default:
          return artwork.image?.asset?.url;
      }
    };

    const thumbnailUrl = getThumbnailUrl(featuredPortfolio.firstArtwork);

    if (!thumbnailUrl) {
      return (
        <main>
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">
                {featuredPortfolio.title}
              </h1>
              <p className="text-gray-600">
                Featured artwork image not available.
              </p>
            </div>
          </div>
        </main>
      );
    }

    // Prepare artwork data with OPTIMIZED URL
    const optimizedArtwork = {
      ...featuredPortfolio.firstArtwork,
      image: {
        asset: {
          url: optimizeImageUrl(thumbnailUrl, userAgent), // Apply compression here!
        },
      },
    };

    return (
      <main>
        <Suspense fallback={<HomePage />}>
          <FeaturedPortfolio
            portfolioId={featuredPortfolio._id}
            portfolioTitle={featuredPortfolio.title}
            portfolioDescription={featuredPortfolio.description}
            artworkCount={featuredPortfolio.artworkCount}
            firstArtwork={optimizedArtwork}
          />
        </Suspense>
      </main>
    );
  } catch (error) {
    console.error("Error fetching initial data:", error);

    // Better error UI with retry option
    return (
      <main>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center max-w-md mx-auto px-4">
            <h1 className="text-2xl font-bold mb-4 text-red-600">
              Unable to Load Portfolio
            </h1>
            <p className="text-gray-600 mb-6">
              There was an error loading the portfolio. This might be due to a
              network issue or server problem.
            </p>
            <ReloadButton />
            <p className="text-sm text-gray-500 mt-4">
              If the problem persists, please check your internet connection.
            </p>
          </div>
        </div>
      </main>
    );
  }
}
