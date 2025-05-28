'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ArtworkNavigation({ prevUrl, nextUrl }) {
  const router = useRouter();
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const touchStartTime = useRef(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Swipe settings
  const minSwipeDistance = 50; // Minimum swipe distance in pixels
  const maxSwipeTime = 300; // Maximum time for swipe in milliseconds

  // Navigate with debounce to prevent multiple rapid navigations
  const navigateTo = (url) => {
    if (isNavigating) return;
    setIsNavigating(true);
    router.push(url);
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

  // Handle touch events for swipe detection
  /*useEffect(() => {
    const handleTouchStart = (e) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      touchStartTime.current = Date.now();
    };

    const handleTouchEnd = (e) => {
      if (!touchStartX.current || !touchStartY.current) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX.current;
      const deltaY = touchEndY - touchStartY.current;
      const touchDuration = Date.now() - touchStartTime.current;

      // Only count as swipe if:
      // 1. Swipe is fast enough (under maxSwipeTime)
      // 2. Horizontal movement > vertical movement (to avoid triggering on scrolling)
      // 3. Horizontal movement exceeds minimum threshold
      if (
        touchDuration < maxSwipeTime &&
        Math.abs(deltaX) > Math.abs(deltaY) &&
        Math.abs(deltaX) > minSwipeDistance
      ) {
        if (deltaX < 0) {
          // Swipe left -> next
          navigateTo(nextUrl);
        } else {
          // Swipe right -> previous
          navigateTo(prevUrl);
        }
      }

      // Reset values
      touchStartX.current = null;
      touchStartY.current = null;
      touchStartTime.current = null;
    };

    document.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [prevUrl, nextUrl, isNavigating]);*/

  // This component doesn't render anything visible
  return null;
}
