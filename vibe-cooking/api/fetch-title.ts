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
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status}`);
        }

        const html = await response.text();

        let title = '';

        // 1. Try og:title
        const ogMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
        if (ogMatch) title = ogMatch[1];

        // 2. Try <title>
        if (!title) {
            const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/im);
            if (titleMatch) title = titleMatch[1];
        }

        // 3. Try h1
        if (!title) {
            const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/im);
            if (h1Match) title = h1Match[1];
        }

        // 4. Try h2
        if (!title) {
            const h2Match = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/im);
            if (h2Match) title = h2Match[1];
        }

        // Clean up title
        if (title) {
            title = title.replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .trim()
                .replace(/\s+/g, ' ');
        }

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
