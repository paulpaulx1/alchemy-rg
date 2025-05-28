'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './NavigationMenu.module.css';

export default function NavigationMenu({ portfolioNavItems }) {
  const [isOpen, setIsOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0); // Add reset key for forcing re-render
  const navRef = useRef(null);
  const pathname = usePathname();
  const scrollPositionRef = useRef(0);

  // Function to lock body scroll
  const lockBodyScroll = () => {
    // Save current scroll position
    scrollPositionRef.current = window.scrollY;
    // Apply fixed positioning to body with the current scroll position
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${scrollPositionRef.current}px`;
    document.body.style.overflow = 'hidden';
  };

  // Function to unlock body scroll
  const unlockBodyScroll = () => {
    // Remove fixed positioning
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    document.body.style.overflow = '';
    // Restore scroll position
    window.scrollTo(0, scrollPositionRef.current);
  };

  // Function to close the navigation and reset expanded states
  const closeNav = () => {
    setIsOpen(false);
    setResetKey((prev) => prev + 1); // Force re-render to reset all expanded states
    // unlockBodyScroll();
  };

  // Enhanced function to open the navigation
  const openNav = () => {
    lockBodyScroll();
    setIsOpen(true);
  };

  // Toggle menu with proper scroll locking
  const toggleMenu = () => {
    if (isOpen) {
      closeNav();
    } else {
      openNav();
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        navRef.current &&
        !navRef.current.contains(event.target) &&
        !event.target.closest('.menu-button')
      ) {
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

  // Clean up scroll lock when component unmounts
  useEffect(() => {
    return () => {
      if (isOpen) {
        unlockBodyScroll();
      }
    };
  }, [isOpen]);

  return (
    <>
      {/* Menu Button */}
      <button
        className={`${styles.menuButton} menu-button`}
        onClick={toggleMenu}
        aria-expanded={isOpen}
      >
        Menu
      </button>

      {/* Overlay */}
      <div
        className={`${styles.navigationOverlay} ${isOpen ? styles.open : ''}`}
        onClick={closeNav}
      />

      {/* Navigation Panel */}
      <div
        ref={navRef}
        className={`${styles.navigationPanel} ${isOpen ? styles.open : ''}`}
      >
        <div className={styles.navigationInner}>
          <div className={styles.navigationHeader}>
            <button className={styles.closeButton} onClick={closeNav}>
              ×
            </button>
          </div>
          <div className={styles.navigationContent}>
            <RecursiveNavMenu
              key={resetKey} // Add key prop to force re-render
              portfolios={portfolioNavItems}
              closeNav={closeNav}
            />
          </div>
        </div>
      </div>
    </>
  );
}

// Recursive component for portfolio navigation
function RecursiveNavMenu({ portfolios, level = 0, closeNav }) {
  const pathname = usePathname();
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
        <li className={styles.navItem}>
          <div className={styles.navItemHeader}>
            <Link
              href='/'
              className={styles.navLink}
              onClick={(e) => {
                if (pathname === '/') {
                  e.preventDefault();
                }
                closeNav();
              }}
            >
              Home
            </Link>
          </div>
        </li>
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
            <Link href='/contact' className={styles.navLink} onClick={closeNav}>
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
  const hasSubPortfolios =
    portfolio.subPortfolios && portfolio.subPortfolios.length > 0;
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
            className={`${styles.expandButton} ${
              isExpanded ? styles.expanded : ''
            }`}
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
