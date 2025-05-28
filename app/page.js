import { client } from '@/lib/client';
import FeaturedPortfolio from '../components/FeaturedPortfolio';

// Disable Next.js caching for this page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// This becomes a server component that fetches data server-side
export default async function Home() {
  try {
    // Fetch only the featured portfolio with minimal data
    const featuredPortfolio = await client.fetch(`
      *[_type == "portfolio" && featured == true][0] {
        _id,
        title,
        "artworks": *[_type == "artwork" && portfolio._ref == ^._id] | order(order asc) {
          _id,
          title,
          image {
            asset-> {
              url
            }
          }
        }
      }
    `);

    // Filter out artworks with missing image data
    const validArtworks =
      featuredPortfolio?.artworks?.filter(
        (artwork) => artwork?.image?.asset?.url
      ) || [];

    return (
      <div>
        {validArtworks.length > 0 ? (
          <FeaturedPortfolio artworks={validArtworks} />
        ) : (
          <div className='flex items-center justify-center h-screen'>
            <p>No featured artwork available.</p>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('Error fetching data:', error);

    // Fallback UI in case of errors
    return (
      <main>
        <div className='flex items-center justify-center h-screen'>
          <p>
            Sorry, there was an error loading the portfolio. Please try again
            later.
          </p>
        </div>
      </main>
    );
  }
}
