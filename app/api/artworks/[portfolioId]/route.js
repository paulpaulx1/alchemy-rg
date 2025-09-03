// app/api/artworks/[portfolioId]/route.js
import { client } from '@/lib/client';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params; // Fix: await params first
    const { portfolioId } = resolvedParams; // Fix: use resolved params
    
    const remainingData = await client.fetch(`
      *[_type == "portfolio" && _id == $portfolioId][0] {
        "artworks": *[_type == "artwork" && portfolio._ref == ^._id] | order(order asc) [1...10] {
          _id,
          title,
          displayTitle,
          "displayableTitle": select(displayTitle == true => title, null),
          mediaType,
          "slug": slug.current,
          image {
            asset-> {
              url
            }
          },
          "videoThumbnailUrl": videoThumbnail.asset->url,
          "pdfThumbnailUrl": pdfThumbnail.asset->url,
          "audioThumbnailUrl": audioThumbnail.asset->url,
          year
        }
      }
    `, { portfolioId });
    
    return NextResponse.json(remainingData || { artworks: [] });
  } catch (error) {
    console.error('Error fetching remaining artworks:', error);
    return NextResponse.json({ 
      artworks: [],
      error: 'Failed to fetch artworks'
    }, { status: 500 });
  }
}

// Add caching for better performance
export const dynamic = 'force-dynamic'; // or 'auto' if you want some caching
export const revalidate = 300; // 5 minutes