"use client";

import { useRouter } from "next/navigation";
import styles from "@/app/portfolio/[slug]/[artworkSlug]/ArtworkPage.module.css";

// ⬅️ Previous link
export function PrevNavLink({ prevUrl }) {
  const router = useRouter();

  const handleClick = (e) => {
    console.log("PrevNavLink clicked", {
      type: e.type,
      target: e.target,
      currentTarget: e.currentTarget,
      prevUrl,
    });
    e.preventDefault();
    e.stopPropagation();
    console.log("Navigating to:", prevUrl);
    router.push(prevUrl);
    console.log("router.push called");
  };

  const handleTouchEnd = (e) => {
    console.log("PrevNavLink touchEnd", {
      type: e.type,
      target: e.target,
      prevUrl,
    });
    handleClick(e);
  };

  return (
    <a
      href={prevUrl}
      className={styles.navLink}
      onClick={handleClick}
      onTouchEnd={handleTouchEnd}
    >
      Previous
    </a>
  );
}

// ➡️ Next link
export function NextNavLink({ nextUrl }) {
  const router = useRouter();

  const handleClick = (e) => {
    console.log("NextNavLink clicked", {
      type: e.type,
      target: e.target,
      currentTarget: e.currentTarget,
      nextUrl,
    });
    e.preventDefault();
    e.stopPropagation();
    console.log("Navigating to:", nextUrl);
    router.push(nextUrl);
    console.log("router.push called");
  };

  const handleTouchEnd = (e) => {
    console.log("NextNavLink touchEnd", {
      type: e.type,
      target: e.target,
      nextUrl,
    });
    handleClick(e);
  };

  return (
    <a
      href={nextUrl}
      className={styles.navLink}
      onClick={handleClick}
      onTouchEnd={handleTouchEnd}
    >
      Next
    </a>
  );
}
