// app/components/Navigation.jsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navigation.module.css';

export default function Navigation({ portfolios }) {
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef(null);
  const pathname = usePathname();

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
    
    // Make any portfolio clickable, even if it's just a container
    return (
      <li className={styles.navItem}>
        <div className={styles.navItemHeader}>
          <Link 
            href={`/portfolio/${portfolio.slug.current}`}
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