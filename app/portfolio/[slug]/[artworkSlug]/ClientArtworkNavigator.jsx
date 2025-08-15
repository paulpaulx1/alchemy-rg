// Preload video// components/ClientArtworkNavigator.jsx
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
import { getConnectionSpeed, getOptimizedImageUrl } from "@/utils/connectionUtils"

// Helper function to safely get optimized URL
function getSafeOptimizedUrl(url, connectionSpeed, mediaType = 'image') {
  if (!url) return url
  
  // Remove existing query parameters to avoid conflicts
  const cleanUrl = url.split('?')[0]
  
  // Use the connection utils to get optimized params
  return getOptimizedImageUrl(cleanUrl, connectionSpeed, mediaType)
}

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
  const [preloadedAssets, setPreloadedAssets] = useState(new Map())
  const [isNavigating, setIsNavigating] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [connectionSpeed, setConnectionSpeed] = useState('moderate')

  // Set mounted state and detect connection speed
  useEffect(() => {
    setMounted(true)
    
    // Get initial connection speed
    const speed = getConnectionSpeed()
    setConnectionSpeed(speed)
    console.log('Initial connection speed:', speed)
    
    // Listen for connection changes
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
      if (connection) {
        const handleConnectionChange = () => {
          const newSpeed = getConnectionSpeed()
          console.log('Connection speed changed:', newSpeed)
          setConnectionSpeed(newSpeed)
        }
        
        connection.addEventListener('change', handleConnectionChange)
        return () => connection.removeEventListener('change', handleConnectionChange)
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

  // More aggressive preloading - preload more artworks around current position
  const getArtworksToPreload = useCallback(() => {
    const toPreload = []
    const totalArtworks = portfolioData.artworks.length
    
    // Preload 2 before and 2 after current artwork
    for (let offset = -2; offset <= 2; offset++) {
      if (offset === 0) continue // Skip current artwork
      
      let targetIndex = currentIndex + offset
      if (targetIndex < 0) targetIndex = totalArtworks + targetIndex
      if (targetIndex >= totalArtworks) targetIndex = targetIndex - totalArtworks
      
      const artwork = portfolioData.artworks[targetIndex]
      if (artwork) toPreload.push(artwork)
    }
    
    return toPreload
  }, [currentIndex, portfolioData.artworks])

  // Preload assets for adjacent artworks - connection-aware
  useEffect(() => {
    if (!mounted) return

    const preloadAsset = (artwork) => {
      if (!artwork) return

      const key = `${artwork.slug}-${artwork.mediaType}-${connectionSpeed}`
      
      // Skip if already loaded for this connection speed
      if (preloadedAssets.has(key)) return

      switch (artwork.mediaType) {
        case 'image':
          if (artwork.imageUrl) {
            // Use original URL for images to preserve aspect ratio
            const optimizedUrl = artwork.imageUrl + '?auto=format&q=85'
            
            const img = new Image()
            img.onload = () => {
              setPreloadedAssets(prev => new Map(prev).set(key, { 
                type: 'image', 
                url: optimizedUrl,
                originalUrl: artwork.imageUrl,
                loaded: true,
                connectionSpeed: connectionSpeed
              }))
            }
            img.onerror = () => {
              console.warn(`Failed to preload image: ${optimizedUrl}`)
            }
            img.src = optimizedUrl
          }
          break
          
        case 'video':
          // Preload video thumbnail with just format optimization
          if (artwork.videoThumbnailUrl) {
            const optimizedThumbnail = artwork.videoThumbnailUrl + '?auto=format&q=75'
            
            const img = new Image()
            img.onload = () => {
              setPreloadedAssets(prev => new Map(prev).set(key, { 
                type: 'video-thumbnail', 
                url: optimizedThumbnail,
                loaded: true,
                connectionSpeed: connectionSpeed
              }))
            }
            img.onerror = () => {
              console.warn(`Failed to preload video thumbnail: ${optimizedThumbnail}`)
            }
            img.src = optimizedThumbnail
          }
          break
          
        case 'pdf':
          if (artwork.pdfThumbnailUrl) {
            const optimizedThumbnail = getOptimizedImageUrl(artwork.pdfThumbnailUrl, connectionSpeed, 'image')
            
            const img = new Image()
            img.onload = () => {
              setPreloadedAssets(prev => new Map(prev).set(key, { 
                type: 'pdf-thumbnail', 
                url: optimizedThumbnail,
                loaded: true,
                connectionSpeed: connectionSpeed
              }))
            }
            img.src = optimizedThumbnail
          }
          break
          
        case 'audio':
          if (artwork.audioThumbnailUrl) {
            const optimizedThumbnail = getOptimizedImageUrl(artwork.audioThumbnailUrl, connectionSpeed, 'image')
            
            const img = new Image()
            img.onload = () => {
              setPreloadedAssets(prev => new Map(prev).set(key, { 
                type: 'audio-thumbnail', 
                url: optimizedThumbnail,
                loaded: true,
                connectionSpeed: connectionSpeed
              }))
            }
            img.src = optimizedThumbnail
          }
          break
      }
    }

    // Get artworks to preload around current position
    const artworksToPreload = getArtworksToPreload()
    artworksToPreload.forEach(preloadAsset)

  }, [currentIndex, getArtworksToPreload, mounted, connectionSpeed])

  // Navigation function
  const navigate = useCallback((direction) => {
    const targetArtwork = direction === 'next' ? nextArtwork : prevArtwork
    if (!targetArtwork) return

    setIsNavigating(true)
    setCurrentArtworkSlug(targetArtwork.slug)
    
    // Update URL without full page reload
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

  // Keyboard navigation
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

  // Update URL when component mounts or artwork changes
  useEffect(() => {
    if (!mounted) return

    const currentUrl = `/portfolio/${portfolioData.slug}/${currentArtworkSlug}`
    if (window.location.pathname !== currentUrl) {
      window.history.replaceState({}, '', currentUrl)
    }
  }, [currentArtworkSlug, portfolioData.slug, mounted])

  function renderArtworkDisplay(artwork) {
    if (!artwork) return null

    const preloadedAsset = preloadedAssets.get(`${artwork.slug}-${artwork.mediaType}-${connectionSpeed}`)
    
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
            />
          )
        }
        
        // Fallback with just format optimization (no dimensions)
        const optimizedImageUrl = artwork.imageUrl + '?auto=format&q=85'
        return (
          <Suspense fallback={<div className={styles.skeletonImage}></div>}>
            <ResponsiveArtworkImage
              src={optimizedImageUrl}
              alt={artwork.displayableTitle || "Artwork"}
              title={artwork.displayableTitle}
              priority={true}
              style={{ 
                opacity: isNavigating ? 0.7 : 1,
                transition: 'opacity 0.2s ease'
              }}
            />
          </Suspense>
        )
        
      case "video":
        const optimizedThumbnail = artwork.videoThumbnailUrl 
          ? artwork.videoThumbnailUrl + '?auto=format&q=75'
          : null
          
        return (
          <div className={styles.videoContainer}>
            {artwork.muxPlaybackId ? (
              <MuxVideo
                playbackId={artwork.muxPlaybackId}
                poster={optimizedThumbnail}
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
                poster={optimizedThumbnail}
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
        onPrevClick={() => navigate('prev')}
        onNextClick={() => navigate('next')}
      />
    </div>
  )
}