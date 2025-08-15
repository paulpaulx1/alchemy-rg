import { client } from '@/lib/client';
import FeaturedPortfolio from '../components/FeaturedPortfolio';
import { Suspense } from 'react';
import Link from 'next/link';

// Better metadata for performance and SEO
export const metadata = {
  title: 'Portfolio - Featured Artworks',
  description: 'Explore featured artworks and portfolios',
  robots: 'index, follow',
};

// Separate viewport export (Next.js 14+ requirement)
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// Optimized ISR with better caching
export const revalidate = 900; // 15 minutes for more responsive updates

// Loading component for better UX
function HomePage() {
  return (
    <div className='flex items-center justify-center h-screen'>
      <div className='text-center'>
        <div className='animate-pulse bg-gray-200 w-96 h-64 mb-4 mx-auto'></div>
        <p className='text-gray-600'>Loading portfolio...</p>
      </div>
    </div>
  );
}

export default async function Home() {
  try {
    // Get the first artwork with optimized image sizing
    const featuredPortfolio = await client.fetch(`
      *[_type == "portfolio" && featured == true][0] {
        _id,
        title,
        description,
        "firstArtwork": *[_type == "artwork" && portfolio._ref == ^._id] | order(order asc) [0] {
          _id,
          title,
          displayTitle,
          "displayableTitle": select(displayTitle == true => title, null),
          mediaType,
          image {
            asset-> {
              url,
              "optimizedUrl": url + "?w=1200&h=800&fit=max&auto=format&q=80",
              "lowResUrl": url + "?w=100&h=67&fit=max&auto=format&q=60"
            }
          },
          // Include video thumbnail for video artworks
          "videoThumbnailUrl": videoThumbnail.asset->url + "?w=1200&h=800&fit=max&auto=format&q=80",
          // Include other media thumbnails
          "pdfThumbnailUrl": pdfThumbnail.asset->url + "?w=1200&h=800&fit=max&auto=format&q=80",
          "audioThumbnailUrl": audioThumbnail.asset->url + "?w=1200&h=800&fit=max&auto=format&q=80"
        },
        // Get a count of total artworks for better UX
        "artworkCount": count(*[_type == "artwork" && portfolio._ref == ^._id])
      }
    `);

    // Better error handling with different scenarios
    if (!featuredPortfolio) {
      return (
        <main>
          <div className='flex items-center justify-center h-screen'>
            <div className='text-center'>
              <h1 className='text-2xl font-bold mb-4'>No Featured Portfolio</h1>
              <p className='text-gray-600 mb-4'>Please set a portfolio as featured in your CMS.</p>
              <Link 
                href='/portfolio' 
                className='text-blue-600 hover:text-blue-800 underline'
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
          <div className='flex items-center justify-center h-screen'>
            <div className='text-center'>
              <h1 className='text-2xl font-bold mb-4'>{featuredPortfolio.title}</h1>
              <p className='text-gray-600'>No artworks available in this portfolio yet.</p>
            </div>
          </div>
        </main>
      );
    }

    // Get the appropriate thumbnail based on media type
    const getThumbnailUrl = (artwork) => {
      switch (artwork.mediaType) {
        case 'image':
          return artwork.image?.asset?.optimizedUrl || artwork.image?.asset?.url;
        case 'video':
          return artwork.videoThumbnailUrl;
        case 'pdf':
          return artwork.pdfThumbnailUrl;
        case 'audio':
          return artwork.audioThumbnailUrl;
        default:
          return artwork.image?.asset?.optimizedUrl || artwork.image?.asset?.url;
      }
    };

    const getLowResThumbnail = (artwork) => {
      // For now, use the image low res for all media types
      // You could extend this to have low-res versions of other thumbnails
      return artwork.image?.asset?.lowResUrl;
    };

    const thumbnailUrl = getThumbnailUrl(featuredPortfolio.firstArtwork);
    const lowResThumbnail = getLowResThumbnail(featuredPortfolio.firstArtwork);

    if (!thumbnailUrl) {
      return (
        <main>
          <div className='flex items-center justify-center h-screen'>
            <div className='text-center'>
              <h1 className='text-2xl font-bold mb-4'>{featuredPortfolio.title}</h1>
              <p className='text-gray-600'>Featured artwork image not available.</p>
            </div>
          </div>
        </main>
      );
    }

    // Prepare optimized artwork data
    const optimizedArtwork = {
      ...featuredPortfolio.firstArtwork,
      image: {
        asset: {
          url: thumbnailUrl,
          lowResUrl: lowResThumbnail
        }
      }
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
    console.error('Error fetching initial data:', error);
    
    // Better error UI with retry option
    return (
      <main>
        <div className='flex items-center justify-center h-screen'>
          <div className='text-center max-w-md mx-auto px-4'>
            <h1 className='text-2xl font-bold mb-4 text-red-600'>
              Unable to Load Portfolio
            </h1>
            <p className='text-gray-600 mb-6'>
              There was an error loading the portfolio. This might be due to a network issue or server problem.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className='bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors'
            >
              Try Again
            </button>
            <p className='text-sm text-gray-500 mt-4'>
              If the problem persists, please check your internet connection.
            </p>
          </div>
        </div>
      </main>
    );
  }
}