// app/layout.js
import Link from "next/link";
import "./globals.css";
import NavigationMenu from "../components/NavigationMenu";
import { client } from "@/lib/client";
import { SpeedInsights } from "@vercel/speed-insights/next";

// 🔹 Metadata for SEO
export const metadata = {
  title: "Raj Gupta | Artist",
  description: "The artistic works of Raj Gupta",
};

// 🔹 Enable ISR and static generation globally
export const dynamic = "force-static";
export const revalidate = 604800; // 7 days (refreshed by webhook instantly)

// ---------------------------------------------------------
// 🧠 Helpers
// ---------------------------------------------------------

// Build nested portfolio tree
function buildPortfolioTree(portfolios) {
  const portfolioMap = {};
  const rootPortfolios = [];

  portfolios.forEach((p) => {
    portfolioMap[p._id] = { ...p, subPortfolios: [] };
  });

  portfolios.forEach((p) => {
    if (p.parentId && portfolioMap[p.parentId]) {
      portfolioMap[p.parentId].subPortfolios.push(portfolioMap[p._id]);
    } else {
      rootPortfolios.push(portfolioMap[p._id]);
    }
  });

  return rootPortfolios;
}

// Get site settings (with ISR tag)
export async function getSiteSettings() {
  const activeSettings = await client.fetch(
    `*[_type == "siteSettings" && isActive == true][0] {
      backgroundColor,
      textColor,
      font
    }`,
    {},
    { next: { revalidate: 604800, tags: ["sanity"] } }
  );

  if (activeSettings) return activeSettings;

  return client.fetch(
    `*[_type == "siteSettings"][0] {
      backgroundColor,
      textColor,
      font
    }`,
    {},
    { next: { revalidate: 604800, tags: ["sanity"] } }
  );
}

// Get navigation portfolios (with ISR tag)
async function getNavigationData() {
  return client.fetch(
    `*[_type == "portfolio"] | order(order asc) {
      _id,
      title,
      slug,
      order,
      "parentId": parentPortfolio._ref
    }`,
    {},
    { next: { revalidate: 604800, tags: ["sanity"] } }
  );
}

// ---------------------------------------------------------
// 🧩 Root Layout
// ---------------------------------------------------------
export default async function RootLayout({ children }) {
  const [settings, allPortfolios] = await Promise.all([
    getSiteSettings(),
    getNavigationData(),
  ]);

  // Add custom "About" nav item
  const aboutItem = {
    _id: "about-page",
    title: "About",
    slug: { current: "about" },
    subPortfolios: [],
    isCustomRoute: true,
  };

  const portfolioTree = buildPortfolioTree(allPortfolios);
  const navItems = [aboutItem, ...portfolioTree];

  // Dynamic style injection from Sanity settings
  const createStyleTagContent = () => {
    let styles = "";

    if (settings?.backgroundColor?.hex) {
      styles += `
        html, body, .site-wrapper, .site-header, .site-main, 
        div, section, article, aside, nav, main, header, footer {
          background-color: ${settings.backgroundColor.hex} !important;
          background: ${settings.backgroundColor.hex} !important;
        }

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

  // ---------------------------------------------------------
  // 🧱 Layout Structure
  // ---------------------------------------------------------
  return (
    <html lang="en">
      <head>
        {/* Load selected Google font */}
        {settings?.font && settings.font !== "eb-garamond" && (
          <link
            href={`https://fonts.googleapis.com/css2?family=${settings.font.replace(
              "-",
              "+"
            )}:wght@400;500;600&display=swap`}
            rel="stylesheet"
          />
        )}

        {/* Inject Sanity-based theme styles */}
        {settings && (
          <style
            dangerouslySetInnerHTML={{
              __html: createStyleTagContent(),
            }}
          />
        )}

        {/* Allow moderate browser caching */}
        <meta httpEquiv="Cache-Control" content="public, max-age=300" />
      </head>
      <body>
        <div className="site-wrapper">
          <header className="site-header">
            <Link href="/about" className="site-title">
              Raj Gupta
            </Link>
            <NavigationMenu portfolioNavItems={navItems} />
          </header>
          <main className="site-main">{children}</main>
        </div>
        <SpeedInsights />
      </body>
    </html>
  );
}

// ---------------------------------------------------------
// 🎨 Font resolver
// ---------------------------------------------------------
function getFontFamily(fontValue) {
  switch (fontValue) {
    case "eb-garamond":
      return "'EB Garamond', serif";
    case "playfair-display":
      return "'Playfair Display', serif";
    case "merriweather":
      return "'Merriweather', serif";
    case "libre-baskerville":
      return "'Libre Baskerville', serif";
    case "lora":
      return "'Lora', serif";
    case "cormorant-garamond":
      return "'Cormorant Garamond', serif";
    case "open-sans":
      return "'Open Sans', sans-serif";
    case "roboto":
      return "'Roboto', sans-serif";
    case "lato":
      return "'Lato', sans-serif";
    case "montserrat":
      return "'Montserrat', sans-serif";
    case "raleway":
      return "'Raleway', sans-serif";
    case "work-sans":
      return "'Work Sans', sans-serif";
    case "poppins":
      return "'Poppins', sans-serif";
    case "cormorant":
      return "'Cormorant', serif";
    case "cinzel":
      return "'Cinzel', serif";
    case "josefin-sans":
      return "'Josefin Sans', sans-serif";
    case "josefin-slab":
      return "'Josefin Slab', serif";
    case "quicksand":
      return "'Quicksand', sans-serif";
    default:
      return "'EB Garamond', serif";
  }
}
