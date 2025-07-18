// app/layout.js
import Link from 'next/link';
import './globals.css';
import NavigationMenu from '../components/NavigationMenu';
import { client } from '@/lib/client';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata = {
  title: 'Raj Gupta | Artist',
  description: 'The artistic works of Raj Gupta',
};

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

// Cache the site settings and navigation for better performance
export const dynamic = 'force-dynamic';
export const revalidate = 60; // Cache for 60 seconds instead of 0

export async function getSiteSettings() {
  // First try to get the active settings - but only fetch what we need
  const activeSettings = await client.fetch(`
    *[_type == "siteSettings" && isActive == true][0] {
      backgroundColor,
      textColor,
      font
    }
  `);

  // If there's no active setting, fall back to the first one
  if (!activeSettings) {
    return client.fetch(`
      *[_type == "siteSettings"][0] {
        backgroundColor,
        textColor,
        font
      }
    `);
  }

  return activeSettings;
}

// Separate function to get navigation data with caching
async function getNavigationData() {
  // Only fetch essential navigation data
  const portfolios = await client.fetch(`
    *[_type == "portfolio"] | order(order asc) {
      _id,
      title,
      slug,
      order,
      "parentId": parentPortfolio._ref
    }
  `);

  return portfolios;
}

export default async function RootLayout({ children }) {
  // Fetch site settings and navigation data in parallel
  const [settings, allPortfolios] = await Promise.all([
    getSiteSettings(),
    getNavigationData()
  ]);

  // Add an "About" item at the top level
  const aboutItem = {
    _id: 'about-page',
    title: 'About',
    slug: { current: 'about' },
    subPortfolios: [],
    isCustomRoute: true,
  };

  // Build the recursive tree structure
  const portfolioTree = buildPortfolioTree(allPortfolios);

  // Add the About item at the beginning of the array
  const navItems = [aboutItem, ...portfolioTree];

  // Create style tag content - removed cache busting
  const createStyleTagContent = () => {
    let styles = '';

    if (settings?.backgroundColor?.hex) {
      styles += `
        html, body, .site-wrapper, .site-header, .site-main, 
        div, section, article, aside, nav, main, header, footer {
          background-color: ${settings.backgroundColor.hex} !important;
          background: ${settings.backgroundColor.hex} !important;
        }
        
        /* Override any other background properties */
        [style*="background"], [class*="background"], 
        [class*="bg-"], [style*="bg-"],
        [class*="container"], [class*="wrapper"],
        [class*="box"], [class*="card"] {
          background-color: ${settings.backgroundColor.hex} !important;
          background: ${settings.backgroundColor.hex} !important;
        }
      `;
    }

    if (settings?.textColor?.hex) {
      styles += `
        html, body, .site-wrapper, *, 
        h1, h2, h3, h4, h5, h6, p, span, div, button, input, textarea, select, option,
        a, a:visited, a:hover, a:active {
          color: ${settings.textColor.hex} !important;
        }
      `;
    }

    if (settings?.font) {
      const fontFamily = getFontFamily(settings.font);
      styles += `
        html, body, .site-wrapper, *, 
        h1, h2, h3, h4, h5, h6, p, span, div, button, input, textarea, select, option {
          font-family: ${fontFamily} !important;
        }
      `;
    }

    return styles;
  };

  return (
    <html lang='en'>
      <head>
        {/* Load custom font if selected */}
        {settings?.font && settings.font !== 'eb-garamond' && (
          <link
            href={`https://fonts.googleapis.com/css2?family=${settings.font.replace(
              '-',
              '+'
            )}:wght@400;500;600&display=swap`}
            rel='stylesheet'
          />
        )}

        {/* Add the dynamic styles - removed cache buster */}
        {settings && (
          <style
            dangerouslySetInnerHTML={{
              __html: createStyleTagContent()
            }}
          />
        )}

        {/* Removed aggressive cache prevention - allow normal browser caching */}
        <meta httpEquiv='Cache-Control' content='public, max-age=300' />
      </head>
      <body>
        <div className='site-wrapper'>
          <header className='site-header'>
            <Link href='/about' className='site-title'>
              Raj Gupta
            </Link>
            <NavigationMenu portfolioNavItems={navItems} />
          </header>
          <main className='site-main'>{children}</main>
        </div>
        <SpeedInsights />
      </body>
    </html>
  );
}

// Helper function to get font family
function getFontFamily(fontValue) {
  switch (fontValue) {
    // Current font
    case 'eb-garamond':
      return "'EB Garamond', serif";

    // Serif fonts
    case 'playfair-display':
      return "'Playfair Display', serif";
    case 'merriweather':
      return "'Merriweather', serif";
    case 'libre-baskerville':
      return "'Libre Baskerville', serif";
    case 'lora':
      return "'Lora', serif";
    case 'cormorant-garamond':
      return "'Cormorant Garamond', serif";

    // Sans-serif fonts
    case 'open-sans':
      return "'Open Sans', sans-serif";
    case 'roboto':
      return "'Roboto', sans-serif";
    case 'lato':
      return "'Lato', sans-serif";
    case 'montserrat':
      return "'Montserrat', sans-serif";
    case 'raleway':
      return "'Raleway', sans-serif";
    case 'work-sans':
      return "'Work Sans', sans-serif";
    case 'poppins':
      return "'Poppins', sans-serif";

    // Display/artistic fonts
    case 'cormorant':
      return "'Cormorant', serif";
    case 'cinzel':
      return "'Cinzel', serif";
    case 'josefin-sans':
      return "'Josefin Sans', sans-serif";
    case 'josefin-slab':
      return "'Josefin Slab', serif";
    case 'quicksand':
      return "'Quicksand', sans-serif";

    // Default fallback
    default:
      return "'EB Garamond', serif";
  }
}