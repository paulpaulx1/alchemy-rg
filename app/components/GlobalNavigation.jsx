// app/components/GlobalNavigation.jsx
import { createClient } from '@sanity/client';
import NavigationButton from './NavigationButton';

// Initialize the Sanity client (server-side)
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2023-03-01',
  useCdn: false, // Setting to false for fresh data on server
});

// Build portfolio tree from flat data
function buildPortfolioTree(portfolios) {
  const portfolioMap = {};
  const rootPortfolios = [];

  // First pass: map all portfolios by ID
  portfolios.forEach((portfolio) => {
    portfolioMap[portfolio._id] = {
      ...portfolio,
      subPortfolios: [],
    };
  });

  // Second pass: build the tree structure
  portfolios.forEach((portfolio) => {
    if (portfolio.parentId) {
      // This is a child portfolio, add it to its parent
      if (portfolioMap[portfolio.parentId]) {
        portfolioMap[portfolio.parentId].subPortfolios.push(
          portfolioMap[portfolio._id]
        );
      }
    } else {
      // This is a root portfolio
      rootPortfolios.push(portfolioMap[portfolio._id]);
    }
  });

  return rootPortfolios;
}


// This becomes a server component that fetches data server-side
export default async function GlobalNavigation() {
  // Server-side data fetching
  const allPortfolios = await client.fetch(`
    *[_type == "portfolio"] {
      _id,
      title,
      slug,
      "parentId": parentPortfolio._ref
    }
  `);

  // Fetch artist for About page
  const artist = await client.fetch(`
    *[_type == "artist"][0] {
      name
    }
  `);
  
  // Add an "About" item at the top level
  const aboutItem = {
    _id: 'about-page',
    title: 'About',
    slug: { current: 'about' },
    subPortfolios: [],
    isCustomRoute: true
  };

  // Build the recursive tree structure
  const portfolioTree = buildPortfolioTree(allPortfolios);
  
  // Add the About item at the beginning of the array
  const navItems = [aboutItem, ...portfolioTree];

  // Pass the pre-fetched data to the client component
  return <NavigationButton portfolios={navItems} />;
}