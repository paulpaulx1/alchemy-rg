// app/page.js
import { createClient } from '@sanity/client';
import FeaturedPortfolio from './components/FeaturedPortfolio';
import Navigation from './components/Navigation';

// Initialize the Sanity client (server-side)
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2023-03-01',
  useCdn: false, // Setting to false for fresh data on server
});

// Build portfolio tree from flat data
function buildPortfolioTree(portfolios, artworksCountByPortfolio) {
  const portfolioMap = {};
  const rootPortfolios = [];
  
  // First pass: map all portfolios by ID
  portfolios.forEach(portfolio => {
    portfolioMap[portfolio._id] = {
      ...portfolio,
      hasArtworks: artworksCountByPortfolio[portfolio._id] > 0,
      subPortfolios: []
    };
  });
  
  // Second pass: build the tree structure
  portfolios.forEach(portfolio => {
    if (portfolio.parentId) {
      // This is a child portfolio, add it to its parent
      if (portfolioMap[portfolio.parentId]) {
        portfolioMap[portfolio.parentId].subPortfolios.push(portfolioMap[portfolio._id]);
      }
    } else {
      // This is a root portfolio
      rootPortfolios.push(portfolioMap[portfolio._id]);
    }
  });
  
  return rootPortfolios;
}

// This becomes a server component that fetches data server-side
export default async function Home() {
  // Server-side data fetching
  const [allPortfolios, artworkCounts, featuredPortfolio] = await Promise.all([
    // Fetch all portfolios
    client.fetch(`
      *[_type == "portfolio"] {
        _id,
        title,
        slug,
        "parentId": parentPortfolio._ref
      }
    `),
    
    // Count artworks per portfolio
    client.fetch(`
      {
        "counts": *[_type == "portfolio"] {
          _id,
          "count": count(*[_type == "artwork" && portfolio._ref == ^._id])
        }
      }
    `),
    
    // Fetch featured portfolio with artwork
    client.fetch(`
      *[_type == "portfolio" && featured == true][0] {
        _id,
        title,
        "artworks": *[_type == "artwork" && portfolio._ref == ^._id] {
          _id,
          title,
          "image": {
            "asset": {
              "url": image.asset->url
            }
          },
          "lowResImage": {
            "asset": {
              "url": lowResImage.asset->url
            }
          }
        }
      }
    `)
  ]);
  
  // Convert artwork counts to a map for easier lookup
  const artworksCountByPortfolio = {};
  artworkCounts.counts.forEach(item => {
    artworksCountByPortfolio[item._id] = item.count;
  });
  
  // Build the recursive tree structure with artwork counts
  const portfolioTree = buildPortfolioTree(allPortfolios, artworksCountByPortfolio);

  return (
    <main>
      {/* Navigation - client component that receives server-fetched data */}
      <Navigation portfolios={portfolioTree} />
      
      {/* Featured Portfolio - client component that receives server-fetched data */}
      {featuredPortfolio?.artworks?.length > 0 ? (
        <FeaturedPortfolio artworks={featuredPortfolio.artworks} />
      ) : (
        <div className="flex items-center justify-center h-screen">
          <p>No featured artwork available.</p>
        </div>
      )}
    </main>
  );
}

// Enable ISR - updates the cache every 60 seconds
export const revalidate = 60;