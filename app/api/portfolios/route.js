import { client } from '@/lib/client';

export async function GET() {
  try {
    const query = `*[_type == "portfolio"] | order(title asc) {
      _id,
      title,
      "slug": slug.current,
      "artworkCount": count(*[_type == "artwork" && portfolio._ref == ^._id])
    }`;
    
    const portfolios = await client.fetch(query);
    
    return Response.json({ portfolios });
    
  } catch (error) {
    console.error('Failed to fetch portfolios:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}