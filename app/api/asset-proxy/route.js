// app/api/asset-proxy/route.js
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const assetUrl = searchParams.get('url');
    
    if (!assetUrl || !assetUrl.includes('cdn.sanity.io')) {
      return new Response('Invalid asset URL', { status: 400 });
    }
    
    try {
      console.log('Proxying asset:', assetUrl);
      
      const response = await fetch(assetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NextJS-AssetProxy/1.0)',
          'Accept': '*/*',
          'Accept-Encoding': 'gzip, deflate, br',
        }
      });
      
      if (!response.ok) {
        console.error(`Asset fetch failed: ${response.status} ${response.statusText}`);
        throw new Error(`Asset fetch failed: ${response.status}`);
      }
      
      console.log('Asset fetch successful, content-type:', response.headers.get('Content-Type'));
      
      // Get the content type from the response
      const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
      
      return new Response(response.body, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    } catch (error) {
      console.error('Proxy error:', error);
      return new Response(`Proxy failed: ${error.message}`, { status: 500 });
    }
  }