export const config = {
    runtime: 'edge', // Use Edge runtime for speed and lower cost
};

export default async function handler(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return new Response(JSON.stringify({ error: 'Missing URL parameter' }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
        });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
            throw new Error('Not an HTML page');
        }

        const html = await response.text();

        // Simple regex to extract title
        const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        let title = match ? match[1] : '';

        // Clean up title (remove whitespace, decode entities if needed - basic handling)
        title = title.trim().replace(/\s+/g, ' ');

        return new Response(JSON.stringify({ title }), {
            status: 200,
            headers: {
                'content-type': 'application/json',
                'Cache-Control': 's-maxage=3600, stale-while-revalidate',
            },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message || 'Failed to fetch title' }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
        });
    }
}
