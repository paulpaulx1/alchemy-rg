'use client';

import { useState, useEffect } from 'react';
import styles from '../portfolio/[slug]/[artworkSlug]/ArtworkPage.module.css';

export default function ResponsiveArtworkImage({ src, alt, title }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // Function to check if menu is open by looking for menu classes or elements
    const checkMenuState = () => {
      // Look for common menu indicators
      const menuOverlay = document.querySelector('.navigationOverlay.open, .navigation-overlay.open, [class*="overlay"][class*="open"]');
      const menuPanel = document.querySelector('.navigationPanel.open, .navigation-panel.open, [class*="panel"][class*="open"]');
      const menuButton = document.querySelector('[aria-expanded="true"]');
      
      const menuIsOpen = !!(menuOverlay || menuPanel || menuButton);
      setIsMenuOpen(menuIsOpen);
    };

    // Check initial state
    checkMenuState();

    // Set up mutation observer to watch for menu changes
    const observer = new MutationObserver(() => {
      checkMenuState();
    });

    // Watch for changes in the document
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-expanded']
    });

    // Also listen for click events that might toggle menu
    document.addEventListener('click', checkMenuState);

    return () => {
      observer.disconnect();
      document.removeEventListener('click', checkMenuState);
    };
  }, []);

  const handleImageLoad = (e) => {
    const img = e.target;
    const isPortrait = img.naturalHeight > img.naturalWidth;
    
    // Remove any existing orientation classes
    img.classList.remove(styles.portraitImage, styles.landscapeImage);
    
    // Add the appropriate class based on orientation
    if (isPortrait) {
      img.classList.add(styles.portraitImage);
    } else {
      img.classList.add(styles.landscapeImage);
    }
  };

  return (
    <img
      src={src}
      alt={alt || title || "Untitled artwork"}
      className={`${styles.artworkImage} ${isMenuOpen ? styles.menuOpen : ''}`}
      onLoad={handleImageLoad}
    />
  );
}