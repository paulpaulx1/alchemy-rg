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
  const navRef = useRef(null);
  const pathname = usePathname();

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
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
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
        onClick={() => setIsOpen(false)} // Close menu when clicking overlay
      />
      
      {/* Navigation Panel */}
      <div 
        ref={navRef}
        className={`${styles.navigationPanel} ${isOpen ? styles.open : ''}`}
      >
        <div className={styles.navigationInner}>
          <button 
            className={styles.closeButton}
            onClick={() => setIsOpen(false)}
          >
            ×
          </button>
          <RecursiveNavMenu portfolios={portfolios} />
        </div>
      </div>
    </>
  );
}

// Recursive component for portfolio navigation
function RecursiveNavMenu({ portfolios, level = 0 }) {
  return (
    <ul className={`${styles.navList} ${styles[`level${level}`]}`}>
      {portfolios.map((portfolio) => (
        <NavItem 
          key={portfolio._id} 
          portfolio={portfolio} 
          level={level} 
        />
      ))}
    </ul>
  );
}

// Individual navigation item
function NavItem({ portfolio, level }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSubPortfolios = portfolio.subPortfolios && portfolio.subPortfolios.length > 0;
  
  // Determine the link path based on whether it's a custom route
  const linkPath = portfolio.isCustomRoute 
    ? `/${portfolio.slug.current}` 
    : `/portfolio/${portfolio.slug.current}`;
  
  return (
    <li className={styles.navItem}>
      <div className={styles.navItemHeader}>
        <Link 
          href={linkPath}
          className={styles.navLink}
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
        />
      )}
    </li>
  );
}