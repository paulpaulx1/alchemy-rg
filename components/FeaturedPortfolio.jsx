"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./FeaturedPortfolio.module.css";

// timings (meet-in-the-middle)
const FADE_MS = 3000;          // identical duration for first + subsequent fades
const SHARP_HOLD_MS = 2000;    // time an image stays fully sharp
const MAX_BLUR_PX = 5;         // keep blur light so it never feels mushy
const OPACITY_EASE = "linear"; // film-like dissolve (very even)
const FILTER_EASE  = "ease-out";

// keyframes helpers
const inKeyframes = (maxBlur) => ([
  { opacity: 0, filter: `blur(${maxBlur}px)` },
  { opacity: 1, filter: "blur(0px)" }
]);
const outKeyframes = (maxBlur) => ([
  { opacity: 1, filter: "blur(0px)" },
  { opacity: 0, filter: `blur(${maxBlur}px)` }
]);

const animOpts = { duration: FADE_MS, easing: OPACITY_EASE, fill: "forwards" };
const filterOpts = { duration: FADE_MS * 0.75, easing: FILTER_EASE, fill: "forwards" }; // blur clears a bit faster

export default function FeaturedPortfolio({ portfolioId, firstArtwork }) {
  const [allArtworks, setAllArtworks] = useState([firstArtwork]);
  const [initialized, setInitialized] = useState(false);
  const [idx, setIdx] = useState(0);
  const [isAActive, setIsAActive] = useState(true);

  const layerARef = useRef(null);
  const layerBRef = useRef(null);
  const timeoutRef = useRef(null);

  // latest refs for timers
  const idxRef = useRef(idx);
  const isAActiveRef = useRef(isAActive);
  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => { isAActiveRef.current = isAActive; }, [isAActive]);

  const clearTimer = () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); timeoutRef.current = null; };

  const getUrl = (art) =>
    art?.image?.asset?.optimizedUrl ||
    (art?.image?.asset?.url
      ? `${art.image.asset.url}?w=1200&h=800&fit=max&auto=format&q=75`
      : "");

  const validArtworks = allArtworks.filter((a) => getUrl(a));

  const preload = (url) =>
    new Promise((resolve, reject) => {
      if (!url) return reject(new Error("No URL"));
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
      if (img.decode) img.decode().then(resolve).catch(() => resolve());
    });

  // Fetch remaining artworks
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!portfolioId) return;
      try {
        const res = await fetch(`/api/artworks/${portfolioId}`);
        const data = await res.json();
        const more = (data?.artworks || []).filter((a) => getUrl(a));
        if (!cancelled && more.length) setAllArtworks((p) => [...p, ...more]);
      } catch (e) {
        console.error("Error fetching remaining artworks:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [portfolioId]);

  // ---- Safe img setter: hide layer if src missing/broken; show only when loaded ----
  const setLayerSrc = (el, src) => {
    if (!el) return;
    const img = el.querySelector("img");
    if (!img) return;

    // Always start hidden; we'll reveal on successful load
    el.style.visibility = "hidden";

    // Clear previous handlers
    img.onload = null;
    img.onerror = null;

    if (!src) {
      // No src → remove it to avoid broken icon/alt text
      img.removeAttribute("src");
      return;
    }

    img.onload = () => {
      el.style.visibility = "visible";
      // cleanup
      img.onload = null;
      img.onerror = null;
    };
    img.onerror = () => {
      // Hide layer & clear src on error (no broken badge / alt text)
      el.style.visibility = "hidden";
      img.removeAttribute("src");
      img.onload = null;
      img.onerror = null;
    };

    // Set src AFTER handlers are in place
    if (img.getAttribute("src") !== src) {
      img.setAttribute("src", src);
    } else {
      // If same src (from preload cache), force visible
      el.style.visibility = "visible";
    }
  };

  // Run one dissolve where both layers animate with identical timing
  const runDissolve = async ({ incomingEl, outgoingEl }) => {
    // ensure starting styles
    incomingEl.style.opacity = "0";
    incomingEl.style.filter = `blur(${MAX_BLUR_PX}px)`;
    outgoingEl.style.opacity = "1";
    outgoingEl.style.filter = "blur(0px)";

    // animate opacity + blur (same timing for both initial + subsequent)
    const inAnim = incomingEl.animate(inKeyframes(MAX_BLUR_PX), animOpts);
    const inFilter = incomingEl.animate(inKeyframes(MAX_BLUR_PX), filterOpts);

    const outAnim = outgoingEl.animate(outKeyframes(MAX_BLUR_PX), animOpts);
    const outFilter = outgoingEl.animate(outKeyframes(MAX_BLUR_PX), filterOpts);

    // wait for opacity animations to finish
    await Promise.all([
      inAnim.finished.catch(() => {}),
      outAnim.finished.catch(() => {}),
    ]);

    // snap final state
    incomingEl.style.opacity = "1";
    incomingEl.style.filter = "blur(0px)";
    outgoingEl.style.opacity = "0";
    outgoingEl.style.filter = `blur(${MAX_BLUR_PX}px)`;
  };

  // First paint: fade in first artwork with the same dissolve as later
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (initialized || validArtworks.length === 0 || !layerARef.current || !layerBRef.current) return;

      const firstUrl = getUrl(validArtworks[0]);
      try { await preload(firstUrl); } catch (_) {}
      if (cancelled) return;

      // set sources
      setLayerSrc(layerARef.current, firstUrl);
      setLayerSrc(layerBRef.current, null); // hidden, no src

      // start with A hidden/blurred, B hidden
      layerARef.current.style.opacity = "0";
      layerARef.current.style.filter = `blur(${MAX_BLUR_PX}px)`;
      layerBRef.current.style.opacity = "0";
      layerBRef.current.style.filter = `blur(${MAX_BLUR_PX}px)`;

      // dissolve A in (B acts as outgoing but stays invisible)
      await runDissolve({
        incomingEl: layerARef.current,
        outgoingEl: layerBRef.current,
      });

      setIdx(0);
      setIsAActive(true);
      setInitialized(true);

      // schedule next fade
      timeoutRef.current = setTimeout(() => { void crossfade(); }, SHARP_HOLD_MS);
    })();

    return () => { cancelled = true; clearTimer(); };
  }, [initialized, validArtworks.length]);

  const crossfade = async () => {
    if (validArtworks.length <= 1 || !layerARef.current || !layerBRef.current) return;

    const current = idxRef.current;
    const nextIndex = (current + 1) % validArtworks.length;
    const nextSrc = getUrl(validArtworks[nextIndex]);

    try { await preload(nextSrc); } catch (_) {}

    const incomingEl = isAActiveRef.current ? layerBRef.current : layerARef.current;
    const outgoingEl = isAActiveRef.current ? layerARef.current : layerBRef.current;

    // set incoming src before animating (layer stays invisible until loaded)
    setLayerSrc(incomingEl, nextSrc);

    await runDissolve({ incomingEl, outgoingEl });

    // flip active layer + index
    setIsAActive((v) => !v);
    setIdx(nextIndex);

    // schedule next crossfade (hold time only; fade time already elapsed)
    clearTimer();
    timeoutRef.current = setTimeout(() => { void crossfade(); }, SHARP_HOLD_MS);
  };

  // Pause/resume on visibility change
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) clearTimer();
      else if (initialized) {
        clearTimer();
        timeoutRef.current = setTimeout(() => { void crossfade(); }, SHARP_HOLD_MS);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [initialized]);

  if (!validArtworks.length) return <div>No images available</div>;

  return (
    <div className={styles.container}>
      <div className={styles.imageContainer}>
        {/* Layer A */}
        <div ref={layerARef} className={styles.artwork} style={{ visibility: "hidden" }}>
          <img
            alt="Artwork A"
            style={{
              maxWidth: "90vw",
              maxHeight: "80vh",
              width: "auto",
              height: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>

        {/* Layer B */}
        <div ref={layerBRef} className={styles.artwork} style={{ visibility: "hidden" }}>
          <img
            alt="Artwork B"
            style={{
              maxWidth: "90vw",
              maxHeight: "80vh",
              width: "auto",
              height: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
      </div>
    </div>
  );
}
