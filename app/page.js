import { client } from '@/lib/client';
import FeaturedPortfolio from '../components/FeaturedPortfolio';

// Use ISR for better caching
export const revalidate = 1800; // 30 minutes

export default async function Home() {
  try {
    // Get the first artwork immediately for instant display
    const featuredPortfolio = await client.fetch(`
      *[_type == "portfolio" && featured == true][0] {
        _id,
        title,
        "firstArtwork": *[_type == "artwork" && portfolio._ref == ^._id] | order(order asc) [0] {
          _id,
          title,
          image {
            asset-> {
              url,
              "optimizedUrl": url + "?w=1200&h=800&fit=max&auto=format&q=75"
            }
          }
        }
      }
    `);

    if (!featuredPortfolio?.firstArtwork?.image?.asset) {
      return (
        <div className='flex items-center justify-center h-screen'>
          <p>No featured artwork available.</p>
        </div>
      );
    }

    // Pass the portfolio ID to the component so it can fetch the rest
    return (
      <div>
        <FeaturedPortfolio 
          portfolioId={featuredPortfolio._id}
          firstArtwork={{
            ...featuredPortfolio.firstArtwork,
            image: {
              asset: {
                url: featuredPortfolio.firstArtwork.image.asset.optimizedUrl || featuredPortfolio.firstArtwork.image.asset.url
              }
            }
          }}
        />
      </div>
    );
  } catch (error) {
    console.error('Error fetching initial data:', error);
    return (
      <main>
        <div className='flex items-center justify-center h-screen'>
          <p>Sorry, there was an error loading the portfolio.</p>
        </div>
      </main>
    );
  }
}