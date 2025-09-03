"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./FeaturedPortfolio.module.css";

/**
 * FeaturedPortfolio
 * - Fetches artworks once (dev/StrictMode-safe)
 * - Fetches each image URL once -> converts to a blob URL -> reused for pre-decode + <img> (no duplicate network)
 * - Computes displayed width/height in JS for varied aspect ratios
 * - Recomputes sizes on resize using cached natural sizes (no network)
 */
export default function FeaturedPortfolio({ portfolioId, firstArtwork }) {
  // -----------------------------
  // State
  // -----------------------------
  const [allArtworks, setAllArtworks] = useState(firstArtwork ? [firstArtwork] : []);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasLoadedAll, setHasLoadedAll] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [activeContainer, setActiveContainer] = useState("A");

  const [imageA, setImageA] = useState({
    opacity: "0",
    filter: "blur(40px)",
    width: "auto",
    height: "auto",
    src: "",
    originalUrl: "",
  });
  const [imageB, setImageB] = useState({
    opacity: "0",
    filter: "blur(40px)",
    width: "auto",
    height: "auto",
    src: "",
    originalUrl: "",
  });

  // -----------------------------
  // Refs / Caches
  // -----------------------------
  const timeoutsRef = useRef([]);
  const fetchedOnceRef = useRef(false); // guard fetch in dev/StrictMode

  // originalUrl -> { blobUrl, naturalWidth, naturalHeight }
  const metaCache = useRef(new Map());
  // originalUrl -> Promise<{ blobUrl, naturalWidth, naturalHeight }>
  const inflightMeta = useRef(new Map());

  // -----------------------------
  // Helpers
  // -----------------------------
  const validArtworks = allArtworks.filter((a) => a?.image?.asset?.url);

  const addTimeout = (cb, delay) => {
    const id = setTimeout(cb, delay);
    timeoutsRef.current.push(id);
    return id;
  };
  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  };

  const getViewport = () => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1920,
    h: typeof window !== "undefined" ? window.innerHeight : 1080,
  });

  // Fit a natural size into viewport (90vw x 80vh)
  const computeFittedSize = (naturalW, naturalH) => {
    const { w: vw, h: vh } = getViewport();
    const maxWidth = vw * 0.9;
    const maxHeight = vh * 0.8;
    let width = naturalW || 1;
    let height = naturalH || 1;
    const ar = width / height;

    if (width > maxWidth) {
      width = maxWidth;
      height = width / ar;
    }
    if (height > maxHeight) {
      height = maxHeight;
      width = height * ar;
    }
    return { width: Math.round(width), height: Math.round(height) };
  };

  // Fetch originalUrl once, create blob URL, decode once to learn natural sizes, cache result.
  const ensureMetaForUrl = async (originalUrl) => {
    if (!originalUrl) return null;
    if (metaCache.current.has(originalUrl)) return metaCache.current.get(originalUrl);
    if (inflightMeta.current.has(originalUrl)) return inflightMeta.current.get(originalUrl);

    const p = (async () => {
      // One network fetch, browser cache allowed
      const resp = await fetch(originalUrl, { cache: "force-cache" });
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Decode using blobUrl (no network) to get natural sizes
      const dims = await new Promise((resolve, reject) => {
        const img = new Image();
        let timeoutId = setTimeout(() => {
          // If decode stalls, still resolve with fallback sizes
          resolve({ naturalWidth: 1000, naturalHeight: 750 });
        }, 4000);

        img.onload = () => {
          clearTimeout(timeoutId);
          resolve({
            naturalWidth: img.naturalWidth || img.width || 1000,
            naturalHeight: img.naturalHeight || img.height || 750,
          });
        };
        img.onerror = (e) => {
          clearTimeout(timeoutId);
          // Fallback sizes; the <img> will still render the blob URL
          resolve({ naturalWidth: 1000, naturalHeight: 750 });
        };
        img.src = blobUrl;
      });

      const meta = { blobUrl, naturalWidth: dims.naturalWidth, naturalHeight: dims.naturalHeight };
      metaCache.current.set(originalUrl, meta);
      inflightMeta.current.delete(originalUrl);
      return meta;
    })().catch((e) => {
      inflightMeta.current.delete(originalUrl);
      throw e;
    });

    inflightMeta.current.set(originalUrl, p);
    return p;
  };

  // Set an image into container A or B, computing fitted size via cached natural sizes
  const setImageToContainer = async (containerType, originalUrl, forceRecalculate = false) => {
    if (!originalUrl || typeof originalUrl !== "string") return;

    try {
      const meta = await ensureMetaForUrl(originalUrl);
      if (!meta) return;
      const { blobUrl, naturalWidth, naturalHeight } = meta;

      // Compute fitted size for current viewport
      const { width, height } = computeFittedSize(naturalWidth, naturalHeight);

      const imageState = {
        width: `${width}px`,
        height: `${height}px`,
        src: blobUrl, // blob URL = no extra network when rendered in <img>
        originalUrl,
        opacity: forceRecalculate ? (containerType === activeContainer ? "1" : "0") : "0",
        filter: forceRecalculate ? (containerType === activeContainer ? "blur(0px)" : "blur(40px)") : "blur(40px)",
      };

      if (containerType === "A") setImageA(imageState);
      else setImageB(imageState);
    } catch (e) {
      console.error("setImageToContainer error:", e);
    }
  };

  // -----------------------------
  // Data Fetch (remaining artworks) — StrictMode safe
  // -----------------------------
  useEffect(() => {
    if (!portfolioId || !firstArtwork || hasLoadedAll || isLoadingMore) return;
    if (fetchedOnceRef.current) return; // dev-mode double-run guard
    fetchedOnceRef.current = true;

    const fetchRemaining = async () => {
      setIsLoadingMore(true);
      try {
        const res = await fetch(`/api/artworks/${portfolioId}`);
        const data = await res.json();

        if (data?.artworks?.length > 0) {
          // API already skips first [0] by returning [1...]; if not, slice below handles it
          const valid = data.artworks.filter((a) => a?.image?.asset?.url);
          const artworksToAdd =
            firstArtwork && valid.length > 0 ? valid.slice(1) : valid;
          setAllArtworks((prev) => [...prev, ...artworksToAdd]);
        }
        setHasLoadedAll(true);
      } catch (e) {
        console.error("❌ Error fetching remaining artworks:", e);
        fetchedOnceRef.current = false; // allow retry on remount
      } finally {
        setIsLoadingMore(false);
      }
    };

    fetchRemaining();
  }, [portfolioId, firstArtwork, hasLoadedAll, isLoadingMore]);

  // -----------------------------
  // Slideshow
  // -----------------------------
  const startSlideshow = async () => {
    if (isRunning) return;
    setIsRunning(true);

    const artwork = validArtworks[currentIndex];
    if (!artwork) {
      setIsRunning(false);
      return;
    }

    const url = artwork.image.asset.url;
    await setImageToContainer(activeContainer, url);

    // fade in the active container shortly after it's placed
    setTimeout(() => {
      if (activeContainer === "A") {
        setImageA((prev) => ({ ...prev, opacity: "1", filter: "blur(0px)" }));
      } else {
        setImageB((prev) => ({ ...prev, opacity: "1", filter: "blur(0px)" }));
      }

      if (validArtworks.length <= 1) {
        setIsRunning(false);
        return;
      }

      // schedule the transition to the next image
      addTimeout(async () => {
        const nextIndex = (currentIndex + 1) % validArtworks.length;
        const nextArtwork = validArtworks[nextIndex];
        const nextUrl = nextArtwork.image.asset.url;

        const inactive = activeContainer === "A" ? "B" : "A";
        await setImageToContainer(inactive, nextUrl);

        // start fading out current active
        if (activeContainer === "A") {
          setImageA((prev) => ({ ...prev, opacity: "0", filter: "blur(40px)" }));
        } else {
          setImageB((prev) => ({ ...prev, opacity: "0", filter: "blur(40px)" }));
        }

        // after a slight overlap, fade in the next
        addTimeout(() => {
          if (inactive === "A") {
            setImageA((prev) => ({ ...prev, opacity: "1", filter: "blur(0px)" }));
          } else {
            setImageB((prev) => ({ ...prev, opacity: "1", filter: "blur(0px)" }));
          }

          // after fade completes, swap containers and continue
          addTimeout(() => {
            setCurrentIndex(nextIndex);
            setActiveContainer(inactive);
            setIsRunning(false);
          }, 2000); // fade-in duration
        }, 300); // overlap
      }, 3200); // display time
    }, 50);
  };

  // Start slideshow when ready and not already running
  useEffect(() => {
    if (validArtworks.length > 0 && !isRunning) {
      const t = setTimeout(() => startSlideshow(), 100);
      return () => clearTimeout(t);
    }
  }, [validArtworks.length, currentIndex, isRunning]); // eslint-disable-line

  // -----------------------------
  // Visibility / Focus handling
  // -----------------------------
  useEffect(() => {
    const handleVisibility = () => {
      clearAllTimeouts();
      setIsRunning(false);
      if (document.visibilityState === "visible") {
        setTimeout(() => {
          if (validArtworks.length > 0) startSlideshow();
        }, 100);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearAllTimeouts();
    };
  }, [validArtworks.length]); // eslint-disable-line

  useEffect(() => {
    const handleFocus = () => {
      if (!isRunning && validArtworks.length > 0) {
        clearAllTimeouts();
        setTimeout(() => startSlideshow(), 100);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isRunning, validArtworks.length]); // eslint-disable-line

  // -----------------------------
  // Resize — recompute sizes using cached natural sizes (no network)
  // -----------------------------
  useEffect(() => {
    let resizeTimeout;
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const recalc = (container, setContainer) => {
          if (!container.src || !container.originalUrl) return;
          const meta = metaCache.current.get(container.originalUrl);
          if (!meta) return; // nothing cached yet
          const { naturalWidth, naturalHeight, blobUrl } = meta;
          const { width, height } = computeFittedSize(naturalWidth, naturalHeight);
          setContainer((prev) => ({
            ...prev,
            width: `${width}px`,
            height: `${height}px`,
            src: blobUrl,
          }));
        };
        recalc(imageA, setImageA);
        recalc(imageB, setImageB);
      }, 200);
    };
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, [imageA.src, imageB.src, imageA.originalUrl, imageB.originalUrl]); // eslint-disable-line

  // -----------------------------
  // Cleanup blob URLs on unmount
  // -----------------------------
  useEffect(() => {
    return () => {
      for (const meta of metaCache.current.values()) {
        try { URL.revokeObjectURL(meta.blobUrl); } catch {}
      }
      metaCache.current.clear();
      inflightMeta.current.clear();
      clearAllTimeouts();
    };
  }, []);

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className={styles.container}>
      {!validArtworks.length && <div>No images available</div>}

      {/* Image Container A */}
      <div className={styles.imageContainer} style={{ position: "relative" }}>
        <div
          className={styles.artwork}
          style={{
            opacity: imageA.opacity,
            transition: "opacity 2s ease-in, filter 2s ease-in",
            position: "absolute",
            filter: imageA.filter,
            width: imageA.width,
            height: imageA.height,
          }}
        >
          {imageA.src && (
            <img
              src={imageA.src}
              alt="Artwork"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
        </div>
      </div>

      {/* Image Container B */}
      <div className={styles.imageContainer} style={{ position: "relative" }}>
        <div
          className={styles.artwork}
          style={{
            opacity: imageB.opacity,
            transition: "opacity 2s ease-in, filter 2s ease-in",
            position: "absolute",
            filter: imageB.filter,
            width: imageB.width,
            height: imageB.height,
          }}
        >
          {imageB.src && (
            <img
              src={imageB.src}
              alt="Artwork"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
