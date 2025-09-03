"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./FeaturedPortfolio.module.css";

// “meet-in-the-middle” timings
const FADE_MS = 3000;                 // unified crossfade duration
const UNBLUR_DELAY_MS = 250;          // start unblurring shortly after fade starts
const UNBLUR_MS = 1700;               // blur clears well before fade ends
const SHARP_HOLD_MS = 2500;           // fully sharp time between fades

// easing
const OPACITY_EASE = "cubic-bezier(0.45, 0, 0.55, 1)";
const FILTER_EASE  = "ease-out";      // clears blur steadily, not poppy
const MAX_BLUR_PX = 5;                // lighter blur so mid-blur never lingers

export default function FeaturedPortfolio({ portfolioId, firstArtwork }) {
  const [allArtworks, setAllArtworks] = useState([firstArtwork]);
  const [firstImageReady, setFirstImageReady] = useState(false);
  const [idx, setIdx] = useState(0);
  const [isAActive, setIsAActive] = useState(true);

  const [layerA, setLayerA] = useState({ src: "", opacity: 0, blur: 1 });
  const [layerB, setLayerB] = useState({ src: "", opacity: 0, blur: 1 });

  const timeoutRef = useRef(null);
  const blurTimeoutRef = useRef(null);

  // keep latest values for timers
  const idxRef = useRef(idx);
  const isAActiveRef = useRef(isAActive);
  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => { isAActiveRef.current = isAActive; }, [isAActive]);

  const clearTimers = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    blurTimeoutRef.current = null;
  };

  const getUrl = (art) =>
    art?.image?.asset?.optimizedUrl ||
    (art?.image?.asset?.url
      ? `${art.image.asset.url}?w=1200&h=800&fit=max&auto=format&q=75`
      : "");

  const preload = (url) =>
    new Promise((resolve, reject) => {
      if (!url) return reject(new Error("No URL"));
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
      if (img.decode) img.decode().then(resolve).catch(() => resolve());
    });

  const validArtworks = allArtworks.filter((a) => getUrl(a));

  // Fetch remaining artworks
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!portfolioId) return;
      try {
        const res = await fetch(`/api/artworks/${portfolioId}`);
        const data = await res.json();
        const more = (data?.artworks || []).filter((a) => getUrl(a));
        if (!cancelled && more.length) {
          setAllArtworks((prev) => [...prev, ...more]);
        }
      } catch (e) {
        console.error("Error fetching remaining artworks:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [portfolioId]);

  // First image — identical choreography to crossfades
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (firstImageReady || validArtworks.length === 0) return;
      const url = getUrl(validArtworks[0]);
      try { await preload(url); } catch (_) {}
      if (cancelled) return;

      // mount hidden & blurred
      setLayerA({ src: url, opacity: 0, blur: 1 });
      setLayerB({ src: "", opacity: 0, blur: 1 });
      setIsAActive(true);
      setIdx(0);
      setFirstImageReady(true);

      // start fade & unblur on the same cadence as crossfades
      requestAnimationFrame(() => {
        setLayerA((p) => ({ ...p, opacity: 1 }));
        if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = setTimeout(() => {
          setLayerA((p) => ({ ...p, blur: 0 }));
        }, UNBLUR_DELAY_MS);
      });
    })();
    return () => { cancelled = true; };
  }, [validArtworks.length, firstImageReady]);

  const crossfade = async () => {
    if (validArtworks.length <= 1) return;

    const current = idxRef.current;
    const nextIndex = (current + 1) % validArtworks.length;
    const nextSrc = getUrl(validArtworks[nextIndex]);

    try { await preload(nextSrc); } catch (_) {}

    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);

    if (isAActiveRef.current) {
      // incoming on B
      setLayerB({ src: nextSrc, opacity: 0, blur: 1 });
      requestAnimationFrame(() => {
        setLayerA((p) => ({ ...p, opacity: 0, blur: 1 })); // fade out + slight blur
        setLayerB((p) => ({ ...p, opacity: 1 }));          // fade in
        blurTimeoutRef.current = setTimeout(() => {
          setLayerB((p) => ({ ...p, blur: 0 }));           // clear blur early
        }, UNBLUR_DELAY_MS);
      });
      setIsAActive(false);
    } else {
      // incoming on A
      setLayerA({ src: nextSrc, opacity: 0, blur: 1 });
      requestAnimationFrame(() => {
        setLayerB((p) => ({ ...p, opacity: 0, blur: 1 }));
        setLayerA((p) => ({ ...p, opacity: 1 }));
        blurTimeoutRef.current = setTimeout(() => {
          setLayerA((p) => ({ ...p, blur: 0 }));
        }, UNBLUR_DELAY_MS);
      });
      setIsAActive(true);
    }

    setIdx(nextIndex);

    // schedule next crossfade after fade + hold
    timeoutRef.current = setTimeout(() => {
      crossfade();
    }, FADE_MS + SHARP_HOLD_MS);
  };

  // Start/stop slideshow with visibility handling
  useEffect(() => {
    if (!firstImageReady || validArtworks.length <= 1) return;

    const start = () => {
      if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          crossfade();
        }, FADE_MS + SHARP_HOLD_MS);
      }
    };

    const stop = () => {
      clearTimers();
    };

    const onVis = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      clearTimers();
    };
  }, [firstImageReady, validArtworks.length]);

  if (!validArtworks.length) return <div>No images available</div>;

  return (
    <div className={styles.container}>
      <div className={styles.imageContainer}>
        {/* Layer A */}
        <div
          className={styles.artwork}
          style={{
            opacity: layerA.opacity,
            filter: layerA.blur ? `blur(${MAX_BLUR_PX}px)` : "blur(0px)",
            transition: `opacity ${FADE_MS}ms ${OPACITY_EASE}, filter ${UNBLUR_MS}ms ${FILTER_EASE}`,
          }}
        >
          {layerA.src && (
            <img
              src={layerA.src}
              alt="Artwork"
              style={{
                maxWidth: "90vw",
                maxHeight: "80vh",
                width: "auto",
                height: "auto",
                objectFit: "contain",
              }}
            />
          )}
        </div>

        {/* Layer B */}
        <div
          className={styles.artwork}
          style={{
            opacity: layerB.opacity,
            filter: layerB.blur ? `blur(${MAX_BLUR_PX}px)` : "blur(0px)",
            transition: `opacity ${FADE_MS}ms ${OPACITY_EASE}, filter ${UNBLUR_MS}ms ${FILTER_EASE}`,
          }}
        >
          {layerB.src && (
            <img
              src={layerB.src}
              alt="Artwork"
              style={{
                maxWidth: "90vw",
                maxHeight: "80vh",
                width: "auto",
                height: "auto",
                objectFit: "contain",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
