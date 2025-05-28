'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ArtworkNavigation({ prevUrl, nextUrl }) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  // Navigate with debounce to prevent multiple rapid navigations
  const navigateTo = (url) => {
    if (isNavigating) return;
    setIsNavigating(true);
    router.push(url);
    window.scrollTo(0,0)
    setTimeout(() => setIsNavigating(false), 500);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't capture keyboard events when user is typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault(); // Prevent scroll
        navigateTo(prevUrl);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault(); // Prevent scroll
        navigateTo(nextUrl);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [prevUrl, nextUrl, isNavigating]);

  return null;
}
