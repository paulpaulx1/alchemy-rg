// app/api/artworks/[portfolioId]/route.js
import { client } from '@/lib/client';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params; // Fix: await params first
    const { portfolioId } = resolvedParams; // Fix: use resolved params
    
    const remainingData = await client.fetch(`
      *[_type == "portfolio" && _id == $portfolioId][0] {
        "artworks": *[_type == "artwork" && portfolio._ref == ^._id] | order(order asc) [1...20] {
          _id,
          title,
          displayTitle,
          "displayableTitle": select(displayTitle == true => title, null),
          mediaType,
          "slug": slug.current,
          image {
            asset-> {
              url,
              "optimizedUrl": url + "?w=800&h=600&fit=crop&auto=format&q=80",
              "lowResUrl": url + "?w=100&h=75&fit=crop&auto=format&q=60"
            }
          },
          "videoThumbnailUrl": videoThumbnail.asset->url + "?w=800&h=600&fit=crop&auto=format&q=80",
          "pdfThumbnailUrl": pdfThumbnail.asset->url + "?w=800&h=600&fit=crop&auto=format&q=80",
          "audioThumbnailUrl": audioThumbnail.asset->url + "?w=800&h=600&fit=crop&auto=format&q=80",
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