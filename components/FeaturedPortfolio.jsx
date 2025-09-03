"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./FeaturedPortfolio.module.css";

/** Timings */
const FADE_OUT_MS = 3200;       // outgoing fade duration
const FADE_IN_MS  = 3200;       // incoming fade duration
const STAGGER_MS  = 100;        // delay before incoming starts
const SHARP_HOLD_MS = 2000;     // fully sharp time between fades

/** Look & feel */
const MAX_BLUR_PX = 5;
const OPACITY_EASE = "linear";                          // steady, film-like dissolve
const FILTER_EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";   // outgoing blur clears quickly
const FILTER_EASE_INOUT = "cubic-bezier(0.45, 0, 0.55, 1)"; // incoming blur eases in/out (smooth)

/** Keyframes */
const inKeyframes = (b) => [
  { opacity: 0, filter: `blur(${b}px)` },
  { opacity: 1, filter: "blur(0px)" },
];
const outKeyframes = (b) => [
  { opacity: 1, filter: "blur(0px)" },
  { opacity: 0, filter: `blur(${b}px)` },
];

export default function FeaturedPortfolio({ portfolioId, firstArtwork }) {
  const [allArtworks, setAllArtworks] = useState([firstArtwork]);
  const [initialized, setInitialized] = useState(false);
  const [idx, setIdx] = useState(0);
  const [isAActive, setIsAActive] = useState(true);

  const layerARef = useRef(null);
  const layerBRef = useRef(null);
  const timeoutRef = useRef(null);

  // latest refs for timers/state
  const idxRef = useRef(idx);
  const isAActiveRef = useRef(isAActive);
  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => { isAActiveRef.current = isAActive; }, [isAActive]);

  const clearTimer = () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); timeoutRef.current = null; };
  const scheduleNext = (delay = SHARP_HOLD_MS) => {
    if (timeoutRef.current) return;
    timeoutRef.current = setTimeout(() => { void crossfade(); }, delay);
  };

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

  /** Fetch more artworks */
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

  /** Auto-start once we have 2+ slides */
  useEffect(() => {
    if (!initialized) return;
    if (validArtworks.length > 1) scheduleNext(SHARP_HOLD_MS);
  }, [initialized, validArtworks.length]);

  /** Safe img setter (no broken icon/alt flash) */
  const setLayerSrc = (el, src) => {
    if (!el) return;
    const img = el.querySelector("img");
    if (!img) return;

    el.style.visibility = "hidden";
    img.onload = null;
    img.onerror = null;

    if (!src) { img.removeAttribute("src"); return; }

    img.onload = () => { el.style.visibility = "visible"; img.onload = img.onerror = null; };
    img.onerror = () => { el.style.visibility = "hidden"; img.removeAttribute("src"); img.onload = img.onerror = null; };

    if (img.getAttribute("src") !== src) img.setAttribute("src", src);
    else el.style.visibility = "visible";
  };

  /** Staggered dissolve: fade-out starts now; fade-in begins after STAGGER_MS.
      Blur easings: outgoing = ease-out (quicker), incoming = ease-in-out (smooth). */
  const runDissolveStaggered = async ({ incomingEl, outgoingEl }) => {
    incomingEl.style.opacity = "0";
    incomingEl.style.filter = `blur(${MAX_BLUR_PX}px)`;
    outgoingEl.style.opacity = "1";
    outgoingEl.style.filter = "blur(0px)";

    // Outgoing animations (start immediately)
    const outAnim = outgoingEl.animate(outKeyframes(MAX_BLUR_PX), {
      duration: FADE_OUT_MS,
      easing: OPACITY_EASE,
      fill: "forwards",
      delay: 0,
    });
    const outFilter = outgoingEl.animate(outKeyframes(MAX_BLUR_PX), {
      duration: Math.round(FADE_OUT_MS * 0.75),
      easing: FILTER_EASE_OUT,   // quick drift away
      fill: "forwards",
      delay: 0,
    });

    // Incoming animations (start after stagger)
    const inAnim = incomingEl.animate(inKeyframes(MAX_BLUR_PX), {
      duration: FADE_IN_MS,
      easing: OPACITY_EASE,
      fill: "forwards",
      delay: STAGGER_MS,
    });
    const inFilter = incomingEl.animate(inKeyframes(MAX_BLUR_PX), {
      duration: Math.round(FADE_IN_MS * 0.85), // a touch longer for smoother focus
      easing: FILTER_EASE_INOUT,               // smooth ease-in/out
      fill: "forwards",
      delay: STAGGER_MS,
    });

    // Wait for the incoming opacity to finish (the later animation)
    await inAnim.finished.catch(() => {});

    // Ensure final state
    incomingEl.style.opacity = "1";
    incomingEl.style.filter = "blur(0px)";
    outgoingEl.style.opacity = "0";
    outgoingEl.style.filter = `blur(${MAX_BLUR_PX}px)`;
  };

  /** Initial paint */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (initialized || validArtworks.length === 0 || !layerARef.current || !layerBRef.current) return;

      const firstUrl = getUrl(validArtworks[0]);
      try { await preload(firstUrl); } catch (_) {}
      if (cancelled) return;

      setLayerSrc(layerARef.current, firstUrl);
      setLayerSrc(layerBRef.current, null);

      layerARef.current.style.opacity = "0";
      layerARef.current.style.filter = `blur(${MAX_BLUR_PX}px)`;
      layerBRef.current.style.opacity = "0";
      layerBRef.current.style.filter = `blur(${MAX_BLUR_PX}px)`;

      await runDissolveStaggered({ incomingEl: layerARef.current, outgoingEl: layerBRef.current });

      setIdx(0);
      setIsAActive(true);
      setInitialized(true);

      if (validArtworks.length > 1) scheduleNext(SHARP_HOLD_MS);
      else scheduleNext(1000); // poll until more slides arrive
    })();

    return () => { cancelled = true; clearTimer(); };
  }, [initialized, validArtworks.length]);

  /** Crossfade loop */
  const crossfade = async () => {
    if (validArtworks.length <= 1 || !layerARef.current || !layerBRef.current) {
      clearTimer();
      scheduleNext(1000);
      return;
    }

    const current = idxRef.current;
    const nextIndex = (current + 1) % validArtworks.length;
    const nextSrc = getUrl(validArtworks[nextIndex]);

    try { await preload(nextSrc); } catch (_) {}

    const incomingEl = isAActiveRef.current ? layerBRef.current : layerARef.current;
    const outgoingEl = isAActiveRef.current ? layerARef.current : layerBRef.current;

    setLayerSrc(incomingEl, nextSrc);

    await runDissolveStaggered({ incomingEl, outgoingEl });

    setIsAActive((v) => !v);
    setIdx(nextIndex);

    clearTimer();
    scheduleNext(SHARP_HOLD_MS);
  };

  /** Pause/resume on tab visibility */
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) clearTimer();
      else if (initialized) { clearTimer(); scheduleNext(SHARP_HOLD_MS); }
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
