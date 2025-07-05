// app/api/artworks/[portfolioId]/route.js
import { client } from '@/lib/client';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { portfolioId } = params;
    
    const remainingData = await client.fetch(`
      *[_type == "portfolio" && _id == $portfolioId][0] {
        "artworks": *[_type == "artwork" && portfolio._ref == ^._id] | order(order asc) [1...20] {
          _id,
          title,
          image {
            asset-> {
              url,
              "optimizedUrl": url + "?w=1200&h=800&fit=max&auto=format&q=75"
            }
          }
        }
      }
    `, { portfolioId });
    
    return NextResponse.json(remainingData || { artworks: [] });
  } catch (error) {
    console.error('Error fetching remaining artworks:', error);
    return NextResponse.json({ artworks: [] }, { status: 500 });
  }
}