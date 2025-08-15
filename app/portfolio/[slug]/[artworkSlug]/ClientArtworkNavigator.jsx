// components/ClientArtworkNavigator.jsx
'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from "next/link"
import ResponsiveArtworkImage from "@/components/ResponsiveArtworkImage"
import MuxVideo from "@/components/MuxVideo"
import PdfViewer from "@/components/PdfViewer"
import AudioPlayer from "@/components/AudioPlayer"
import ArtworkNavigation from "@/components/ArtworkNavigation"
import { Suspense } from "react"
import styles from "./ArtworkPage.module.css"

// Helper function to get embed URL from video links
function getEmbedUrl(url) {
  const youtubeRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const youtubeMatch = url.match(youtubeRegex);

  if (youtubeMatch && youtubeMatch[2].length === 11) {
    return `https://www.youtube.com/embed/${youtubeMatch[2]}`;
  }

  const vimeoRegex = /^.*(vimeo\.com\/)((channels\/[A-z]+\/)|(groups\/[A-z]+\/videos\/))?([0-9]+)/;
  const vimeoMatch = url.match(vimeoRegex);

  if (vimeoMatch && vimeoMatch[5]) {
    return `https://player.vimeo.com/video/${vimeoMatch[5]}`;
  }

  return url;
}

export default function ClientArtworkNavigator({ portfolioData, initialArtworkSlug }) {
  const router = useRouter()
  const [currentArtworkSlug, setCurrentArtworkSlug] = useState(initialArtworkSlug)
  const [preloadedAssets, setPreloadedAssets] = useState(() => new Map())
  const [loadingAssets, setLoadingAssets] = useState(() => new Set())
  const [isNavigating, setIsNavigating] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [connectionSpeed, setConnectionSpeed] = useState('fast') // Default to fast

  // Set mounted state after hydration and detect connection speed
  useEffect(() => {
    setMounted(true)
    
    // Detect connection speed
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
      if (connection) {
        const effectiveType = connection.effectiveType
        if (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g') {
          setConnectionSpeed('slow')
        } else {
          setConnectionSpeed('fast')
        }
      }
    }
  }, [])

  // Get current artwork and navigation
  const currentIndex = useMemo(() => 
    portfolioData.artworks.findIndex(a => a.slug === currentArtworkSlug),
    [portfolioData.artworks, currentArtworkSlug]
  )
  
  const currentArtwork = portfolioData.artworks[currentIndex]
  const prevArtwork = currentIndex > 0 
    ? portfolioData.artworks[currentIndex - 1] 
    : portfolioData.artworks[portfolioData.artworks.length - 1]
  const nextArtwork = currentIndex < portfolioData.artworks.length - 1 
    ? portfolioData.artworks[currentIndex + 1] 
    : portfolioData.artworks[0]

  // Navigation function
  const navigate = useCallback((direction) => {
    const targetArtwork = direction === 'next' ? nextArtwork : prevArtwork
    if (!targetArtwork) return

    setIsNavigating(true)
    setCurrentArtworkSlug(targetArtwork.slug)
    
    // Only update URL if mounted (client-side)
    if (mounted && typeof window !== 'undefined') {
      const newUrl = `/portfolio/${portfolioData.slug}/${targetArtwork.slug}`
      window.history.pushState({}, '', newUrl)
      
      // Update document title
      document.title = targetArtwork.displayableTitle 
        ? `${targetArtwork.displayableTitle} - ${portfolioData.title}`
        : portfolioData.title
    }

    // Reset navigation state after a brief moment
    setTimeout(() => setIsNavigating(false), 100)
  }, [nextArtwork, prevArtwork, portfolioData.slug, portfolioData.title, mounted])

  // Robust preloading with duplicate prevention - only after mount
  useEffect(() => {
    if (!mounted) return

    const preloadAsset = (artwork) => {
      if (!artwork) return

      const key = `${artwork.slug}-${artwork.mediaType}`
      
      // Skip if already loaded or currently loading
      if (preloadedAssets.has(key) || loadingAssets.has(key)) return

      // Mark as loading
      setLoadingAssets(prev => new Set(prev).add(key))

      const handleLoadComplete = () => {
        setLoadingAssets(prev => {
          const newSet = new Set(prev)
          newSet.delete(key)
          return newSet
        })
      }

      switch (artwork.mediaType) {
        case 'image':
          if (artwork.imageUrl) {
            // Choose image based on connection speed
            const imageUrl = connectionSpeed === 'slow' && artwork.lowResImageUrl 
              ? artwork.lowResImageUrl 
              : artwork.imageUrl

            const img = new Image()
            img.onload = () => {
              setPreloadedAssets(prev => new Map(prev).set(key, {
                type: 'image',
                url: imageUrl,
                highResUrl: artwork.imageUrl,
                loaded: true,
                isLowRes: connectionSpeed === 'slow' && artwork.lowResImageUrl
              }))
              handleLoadComplete()
            }
            img.onerror = () => {
              console.warn(`Failed to preload image: ${imageUrl}`)
              handleLoadComplete()
            }
            img.src = imageUrl
          }
          break
          
        case 'video':
          if (artwork.videoThumbnailUrl) {
            const img = new Image()
            img.onload = () => {
              setPreloadedAssets(prev => new Map(prev).set(key, {
                type: 'video-thumbnail',
                url: artwork.videoThumbnailUrl,
                loaded: true
              }))
              handleLoadComplete()
            }
            img.onerror = () => {
              console.warn(`Failed to preload video thumbnail: ${artwork.videoThumbnailUrl}`)
              handleLoadComplete()
            }
            img.src = artwork.videoThumbnailUrl
          } else {
            handleLoadComplete()
          }
          break
          
        default:
          handleLoadComplete()
      }
    }

    // Preload adjacent artworks
    const artworksToPreload = []
    
    // Previous artwork
    if (prevArtwork) artworksToPreload.push(prevArtwork)
    
    // Next artwork
    if (nextArtwork) artworksToPreload.push(nextArtwork)
    
    // One more in each direction for better UX
    const prevPrevIndex = currentIndex > 1 
      ? currentIndex - 2 
      : portfolioData.artworks.length - (2 - currentIndex)
    const nextNextIndex = currentIndex < portfolioData.artworks.length - 2 
      ? currentIndex + 2 
      : (currentIndex + 2) % portfolioData.artworks.length
      
    if (prevPrevIndex >= 0) artworksToPreload.push(portfolioData.artworks[prevPrevIndex])
    if (nextNextIndex < portfolioData.artworks.length) artworksToPreload.push(portfolioData.artworks[nextNextIndex])

    artworksToPreload.forEach(preloadAsset)

  }, [currentIndex, prevArtwork, nextArtwork, portfolioData.artworks, mounted, connectionSpeed, preloadedAssets, loadingAssets])

  // Keyboard navigation - only after mount
  useEffect(() => {
    if (!mounted) return

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        navigate('prev')
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        navigate('next')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate, mounted])

  function renderArtworkDisplay(artwork) {
    if (!artwork) return null

    const preloadedAsset = preloadedAssets.get(`${artwork.slug}-${artwork.mediaType}`)
    
    switch (artwork.mediaType) {
      case "image":
        // Use preloaded image for instant display if available
        if (mounted && preloadedAsset?.loaded) {
          return (
            <img
              src={preloadedAsset.url}
              alt={artwork.displayableTitle || "Artwork"}
              className={styles.artworkImage}
              style={{ 
                opacity: isNavigating ? 0.7 : 1,
                transition: 'opacity 0.2s ease'
              }}
              onLoad={() => {
                // If we loaded a low-res version, upgrade to high-res after display
                if (preloadedAsset.isLowRes && preloadedAsset.highResUrl) {
                  setTimeout(() => {
                    const highResImg = new Image()
                    highResImg.onload = () => {
                      setPreloadedAssets(prev => {
                        const updated = new Map(prev)
                        const key = `${artwork.slug}-${artwork.mediaType}`
                        updated.set(key, {
                          ...preloadedAsset,
                          url: preloadedAsset.highResUrl,
                          isLowRes: false
                        })
                        return updated
                      })
                    }
                    highResImg.src = preloadedAsset.highResUrl
                  }, 500) // Wait 500ms before upgrading
                }
              }}
            />
          )
        }
        
        // Fallback to ResponsiveArtworkImage with connection-aware src
        const imageSrc = connectionSpeed === 'slow' && artwork.lowResImageUrl 
          ? artwork.lowResImageUrl 
          : artwork.imageUrl
          
        return (
          <Suspense fallback={<div className={styles.skeletonImage}></div>}>
            <ResponsiveArtworkImage
              src={imageSrc}
              alt={artwork.displayableTitle || "Artwork"}
              title={artwork.displayableTitle}
              priority={true}
            />
          </Suspense>
        )
        
      case "video":
        return (
          <div className={styles.videoContainer}>
            {artwork.muxPlaybackId ? (
              <MuxVideo
                playbackId={artwork.muxPlaybackId}
                poster={artwork.videoThumbnailUrl}
                title={artwork.displayableTitle || "Video artwork"}
                className={styles.artworkVideo}
                controls={true}
                preload="none"
              />
            ) : artwork.videoUrl ? (
              <video
                src={artwork.videoUrl}
                controls
                className={styles.artworkVideo}
                preload="none"
                poster={artwork.videoThumbnailUrl}
              />
            ) : artwork.externalVideoUrl ? (
              <Suspense fallback={<div className={styles.skeletonVideo}></div>}>
                <iframe
                  src={getEmbedUrl(artwork.externalVideoUrl)}
                  title={artwork.displayableTitle || "Video artwork"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className={styles.artworkVideo}
                  loading="lazy"
                ></iframe>
              </Suspense>
            ) : (
              <div className={styles.videoError}>Video not available</div>
            )}
          </div>
        )
        
      case "pdf":
        return (
          <Suspense fallback={<div className={styles.skeletonPdf}></div>}>
            <PdfViewer artwork={artwork} />
          </Suspense>
        )
        
      case "audio":
        return (
          <div className={styles.audioContainer}>
            {artwork.audioUrl ? (
              <Suspense fallback={<div className={styles.skeletonAudio}></div>}>
                <AudioPlayer
                  src={artwork.audioUrl}
                  title={artwork.displayableTitle}
                />
              </Suspense>
            ) : (
              <div className={styles.audioError}>Audio not available</div>
            )}
          </div>
        )
        
      default:
        return null
    }
  }

  if (!currentArtwork) {
    return (
      <div>
        <h1>Artwork not found</h1>
        <Link href={`/portfolio/${portfolioData.slug}`}>Return to portfolio</Link>
      </div>
    )
  }

  return (
    <div className={styles.pageWrapper}>
      {/* Breadcrumbs */}
      <div className={styles.breadcrumbs}>
        <Link href="/" className={styles.breadcrumbLink}>
          Home
        </Link>
        <span className={styles.breadcrumbSeparator}>/</span>

        {portfolioData.parentPortfolio && (
          <>
            <Link
              href={`/portfolio/${portfolioData.parentPortfolio.slug}`}
              className={styles.breadcrumbLink}
            >
              {portfolioData.parentPortfolio.title}
            </Link>
            <span className={styles.breadcrumbSeparator}>/</span>
          </>
        )}

        <Link
          href={`/portfolio/${portfolioData.slug}`}
          className={styles.breadcrumbLink}
        >
          {portfolioData.title}
        </Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>
          {currentArtwork.displayableTitle || "Artwork"}
        </span>
      </div>

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        <div className={styles.artworkContainer}>
          {renderArtworkDisplay(currentArtwork)}
        </div>
      </div>

      {/* Bottom Navigation and Info */}
      <div className={styles.bottomSection}>
        <div className={styles.navigation}>
          <button
            onClick={() => navigate('prev')}
            className={styles.navLink}
            disabled={isNavigating}
          >
            Previous
          </button>

          <div className={styles.desktopArtworkInfo}>
            {currentArtwork.displayableTitle && (
              <h1 className={styles.artworkTitle}>
                {currentArtwork.displayableTitle}
              </h1>
            )}

            <div className={styles.artworkDetails}>
              {currentArtwork.year && (
                <p className={styles.artworkYear}>{currentArtwork.year}</p>
              )}
              {currentArtwork.medium && (
                <p className={styles.artworkMedium}>{currentArtwork.medium}</p>
              )}
              {currentArtwork.dimensions && (
                <p className={styles.artworkDimensions}>{currentArtwork.dimensions}</p>
              )}
            </div>

            {currentArtwork.description && (
              <div className={styles.artworkDescription}>
                <p>{currentArtwork.description}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('next')}
            className={styles.navLink}
            disabled={isNavigating}
          >
            Next
          </button>
        </div>
      </div>
      
      <ArtworkNavigation
        prevUrl={`/portfolio/${portfolioData.slug}/${prevArtwork.slug}`}
        nextUrl={`/portfolio/${portfolioData.slug}/${nextArtwork.slug}`}
      />
    </div>
  )
}