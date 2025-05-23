// app/components/NavigationButton.jsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@sanity/client';
import styles from './NavigationButton.module.css';

// Initialize the client
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2023-03-01',
  useCdn: true,
});

// Build portfolio tree from flat data
function buildPortfolioTree(portfolios) {
  const portfolioMap = {};
  const rootPortfolios = [];
  
  // First pass: map all portfolios by ID
  portfolios.forEach(portfolio => {
    portfolioMap[portfolio._id] = {
      ...portfolio,
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

export default function NavigationButton({portfolios}) {
  const [isOpen, setIsOpen] = useState(false);
  const [setPortfolios] = useState([]);
  const [resetKey, setResetKey] = useState(0); // Add reset key for forcing re-render
  const navRef = useRef(null);
  const pathname = usePathname();

  // Function to close the navigation and reset expanded states
  const closeNav = () => {
    setIsOpen(false);
    setResetKey(prev => prev + 1); // Force re-render to reset all expanded states
  };

  // Fetch portfolios
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all portfolios
        const allPortfolios = await client.fetch(`
          *[_type == "portfolio"] {
            _id,
            title,
            slug,
            "parentId": parentPortfolio._ref
          }
        `);
        
        // Build the recursive tree structure
        const portfolioTree = buildPortfolioTree(allPortfolios);
        setPortfolios(portfolioTree);
      } catch (error) {
        console.error('Error fetching portfolios:', error);
      }
    }
    
    fetchData();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target) && !event.target.closest('.menu-button')) {
        closeNav(); // Use closeNav instead of setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    closeNav(); // Use closeNav instead of setIsOpen(false)
  }, [pathname]);

  return (
    <>
      {/* Menu Button */}
      <button 
        className={`${styles.menuButton} menu-button`} 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        Menu
      </button>
      
      {/* Overlay */}
      <div 
        className={`${styles.navigationOverlay} ${isOpen ? styles.open : ''}`}
        onClick={closeNav} // Use closeNav instead of () => setIsOpen(false)
      />
      
      {/* Navigation Panel */}
      <div 
        ref={navRef}
        className={`${styles.navigationPanel} ${isOpen ? styles.open : ''}`}
      >
        <div className={styles.navigationInner}>
          <button 
            className={styles.closeButton}
            onClick={closeNav} // Use closeNav instead of () => setIsOpen(false)
          >
            ×
          </button>
          <RecursiveNavMenu 
            key={resetKey} // Add key prop to force re-render
            portfolios={portfolios} 
            closeNav={closeNav} 
          />
        </div>
      </div>
    </>
  );
}

// Recursive component for portfolio navigation
function RecursiveNavMenu({ portfolios, level = 0, closeNav }) {
    // If this is the top level menu (level 0), add the Contact link at the end
    const sortedPortfolios = [...portfolios].sort((a, b) => {
      // If both have order values, compare them
      if (a.order !== null && b.order !== null) {
        return a.order - b.order;
      }
      // If a has order but b doesn't, a comes first
      if (a.order !== null && b.order === null) {
        return -1;
      }
      // If b has order but a doesn't, b comes first
      if (a.order === null && b.order !== null) {
        return 1;
      }
      // If both are null, keep original order
      return 0;
    });

    if (level === 0) {
      return (
        <ul className={`${styles.navList} ${styles[`level${level}`]}`}>
          {sortedPortfolios.map((portfolio) => (
            <NavItem 
              key={portfolio._id} 
              portfolio={portfolio} 
              level={level}
              closeNav={closeNav}
            />
          ))}
          {/* Add Contact link at the end of the top level menu */}
          <li className={styles.navItem}>
            <div className={styles.navItemHeader}>
              <Link 
                href="/contact"
                className={styles.navLink}
                onClick={closeNav}
              >
                Contact
              </Link>
            </div>
          </li>
        </ul>
      );
    }
    
    // For sub-menus, just render the portfolio items without the Contact link
    return (
      <ul className={`${styles.navList} ${styles[`level${level}`]}`}>
        {sortedPortfolios.map((portfolio) => (
          <NavItem 
            key={portfolio._id} 
            portfolio={portfolio} 
            level={level}
            closeNav={closeNav}
          />
        ))}
      </ul>
    );
  }

// Individual navigation item
function NavItem({ portfolio, level, closeNav }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSubPortfolios = portfolio.subPortfolios && portfolio.subPortfolios.length > 0;
  const pathname = usePathname();
  
  // Determine the link path based on whether it's a custom route
  const linkPath = portfolio.isCustomRoute 
    ? `/${portfolio.slug.current}` 
    : `/portfolio/${portfolio.slug.current}`;

  // Handle click on portfolio link
  const handlePortfolioClick = (e) => {
    // Only close the nav if we're already on this page
    if (pathname === linkPath) {
      e.preventDefault();
      closeNav();
    }
    // If navigating to a different page, let the link work normally
    // and let the useEffect that listens to pathname changes close the nav
  };
  
  return (
    <li className={styles.navItem}>
      <div className={styles.navItemHeader}>
        <Link 
          href={linkPath}
          className={styles.navLink}
          onClick={handlePortfolioClick}
        >
          {portfolio.title}
        </Link>
        
        {hasSubPortfolios && (
          <button 
            className={`${styles.expandButton} ${isExpanded ? styles.expanded : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
          >
            +
          </button>
        )}
      </div>
      
      {/* Recursive rendering of sub-portfolios */}
      {hasSubPortfolios && isExpanded && (
        <RecursiveNavMenu 
          portfolios={portfolio.subPortfolios} 
          level={level + 1}
          closeNav={closeNav}
        />
      )}
    </li>
  );
}