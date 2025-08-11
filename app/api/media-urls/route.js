// app/api/media-urls/route.js
import { client } from "@/lib/client";

function createProxyUrl(sanityUrl) {
  if (!sanityUrl) return null;
  return `/api/asset-proxy?url=${encodeURIComponent(sanityUrl)}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get("portfolio");

    if (!portfolioId) {
      return Response.json(
        { error: "Portfolio ID is required" },
        { status: 400 }
      );
    }

    console.log("Fetching media URLs for portfolio:", portfolioId);

    const query = `*[_type == "artwork" && portfolio._ref == $portfolioId] {
    _id,
    mediaType,
    "slug": slug.current,
    "videoUrl": video.asset->url + "?w=800&h=600&fit=crop&auto=format&q=85",
    "audioUrl": audioFile.asset->url,
    "imageUrl": image.asset->url + "?w=800&h=600&fit=crop&auto=format&q=85",
    "lowResImageUrl": lowResImage.asset->url + "?w=400&h=300&fit=crop&auto=format&q=85",
    "videoThumbnailUrl": videoThumbnail.asset->url + "?w=600&h=400&fit=crop&auto=format&q=85",
    "audioThumbnailUrl": audioThumbnail.asset->url + "?w=400&h=400&fit=crop&auto=format&q=85",
    "pdfUrl": pdfFile.asset->url,
    "pdfThumbnailUrl": pdfThumbnail.asset->url + "?w=400&h=400&fit=crop&auto=format&q=85",
    
    // ADD BASE VERSIONS (without transformations) for individual artwork pages
    "baseVideoUrl": video.asset->url,
    "baseImageUrl": image.asset->url,
    "baseLowResImageUrl": lowResImage.asset->url,
    "baseVideoThumbnailUrl": videoThumbnail.asset->url,
    "baseAudioThumbnailUrl": audioThumbnail.asset->url,
    "basePdfThumbnailUrl": pdfThumbnail.asset->url
  }`;

    const artworks = await client.fetch(query, { portfolioId });
    console.log("Fetched artworks:", artworks.length);

    // Convert Sanity URLs to proxied URLs - including BOTH transformed AND base versions
    const urls = artworks
      .flatMap((artwork) => [
        // Transformed versions (for portfolio overview pages)
        createProxyUrl(artwork.videoUrl),
        createProxyUrl(artwork.audioUrl),
        createProxyUrl(artwork.imageUrl),
        createProxyUrl(artwork.lowResImageUrl),
        createProxyUrl(artwork.videoThumbnailUrl),
        createProxyUrl(artwork.audioThumbnailUrl),
        createProxyUrl(artwork.pdfUrl),
        createProxyUrl(artwork.pdfThumbnailUrl),
        
        // Base versions (for individual artwork pages)
        createProxyUrl(artwork.baseVideoUrl),
        createProxyUrl(artwork.baseImageUrl),
        createProxyUrl(artwork.baseLowResImageUrl),
        createProxyUrl(artwork.baseVideoThumbnailUrl),
        createProxyUrl(artwork.baseAudioThumbnailUrl),
        createProxyUrl(artwork.basePdfThumbnailUrl),
      ])
      .filter(Boolean); // Remove null values

    const uniqueUrls = [...new Set(urls)]; // Remove duplicates

    console.log(`Generated ${uniqueUrls.length} proxied URLs (including base versions)`);
    console.log("Sample proxied URLs:", uniqueUrls.slice(0, 3));

    return Response.json({ 
        urls: uniqueUrls, 
        count: uniqueUrls.length,
        artworks: artworks 
      });
  } catch (error) {
    console.error("Failed to fetch media URLs:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}