// app/api/test-fetch/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@sanity/client';

// Initialize the Sanity client
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'your-project-id', 
  apiVersion: '2023-03-01',
  dataset: 'production',
  useCdn: false, // Set to false for fresh data
});

export async function GET() {
  try {
    // Fetch portfolios
    const portfolios = await client.fetch(`
      *[_type == "portfolio"] {
        _id,
        title,
        slug,
        description,
        "coverImage": coverImage.asset->url
      }
    `);

    // Fetch artist info
    const artist = await client.fetch(`
      *[_type == "artist"][0] {
        name,
        "image": profileImage.asset->url,
        bio
      }
    `);

    // Return the data
    return NextResponse.json({ 
      success: true, 
      portfolios, 
      artist,
      message: 'Data fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error fetching data',
      error: error.message 
    }, { status: 500 });
  }
}