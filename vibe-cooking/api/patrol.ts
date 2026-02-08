
import { load } from 'cheerio';

export const config = {
    runtime: 'nodejs',
};

interface PatrolSource {
    id: string;
    name: string;
    type: 'rss' | 'youtube';
    url: string; // RSS URL or YouTube Handle (@...)
    icon?: string;
}

interface PatrolRecipe {
    id: string;
    title: string;
    url: string;
    image: string;
    date: string;
    sourceName: string;
    sourceIcon?: string;
}

// Configuration: Add new chefs here!
const SOURCES: PatrolSource[] = [
    {
        id: 'ryuji',
        name: 'リュウジのバズレシピ',
        type: 'youtube', // Changed from rss
        url: 'UCMGsVYnVTHwfhcxM9TnnOCg', // @ryuji825
        // icon: '🍺' 
    },
    {
        id: 'dareuma',
        name: 'だれウマ',
        type: 'youtube', // Changed from rss
        url: 'UCG6NkcLc9gXdZiJhwukdTbQ', // @だれウマ料理研究家
        // icon: '💪'
    },
    {
        id: 'kijima',
        name: 'きじまごはん',
        type: 'youtube',
        url: 'UCoKFbpjl1NtoxQ9O6CqvrOA', // Hardcoded Channel ID
        // icon: '🍚'
    }
];

// Helper to get YouTube Channel ID from Handle
async function getYoutubeChannelId(handle: string): Promise<string | null> {
    try {
        // Try /about page first as it often contains the ID more reliably
        const url = `https://www.youtube.com/${handle}/about`;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        if (!res.ok) return null;
        const html = await res.text();

        // Try multiple selectors/regex
        const match = html.match(/"channelId":"(UC[\w-]+)"/);
        if (match) return match[1];

        const matchBrowse = html.match(/"browseId":"(UC[\w-]+)"/);
        if (matchBrowse) return matchBrowse[1];

        return null;
    } catch (e) {
        console.error(`Failed to resolve handle ${handle}`, e);
        return null;
    }
}

// Helper to fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 3000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

async function fetchRssFeed(source: PatrolSource): Promise<PatrolRecipe[]> {
    try {
        const res = await fetchWithTimeout(source.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VibeCooking/1.0)' }
        });
        if (!res.ok) throw new Error(`Failed to fetch ${source.url}`);
        const text = await res.text();
        const $ = load(text, { xmlMode: true });
        const items: PatrolRecipe[] = [];

        $('item').each((_, el) => {
            const title = $(el).find('title').text();
            const link = $(el).find('link').text();
            let date = $(el).find('pubDate').text();
            if (!date) date = $(el).find('dc\\:date').text(); // Dublin Core

            // Try to find an image
            let image = '';
            const content = $(el).find('content\\:encoded').text() || $(el).find('description').text();
            const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) {
                image = imgMatch[1];
            } else {
                // Try media:thumbnail or enclosure
                image = $(el).find('media\\:thumbnail').attr('url') ||
                    $(el).find('enclosure[type^="image"]').attr('url') || '';
            }

            items.push({
                id: link, // Use URL as ID
                title,
                url: link,
                image,
                date: new Date(date).toISOString(),
                sourceName: source.name,
                sourceIcon: source.icon
            });
        });

        return items.slice(0, 5); // Limit to 5 per source
    } catch (e) {
        console.error(`Error fetching RSS for ${source.name}:`, e);
        return [];
    }
}

async function fetchYoutubeFeed(source: PatrolSource): Promise<PatrolRecipe[]> {
    try {
        let channelId = source.url;
        if (source.url.startsWith('@')) {
            const resolved = await getYoutubeChannelId(source.url);
            if (!resolved) {
                console.warn(`Could not resolve handle ${source.url}`);
                return []; // Don't throw, just return empty
            }
            channelId = resolved;
        }

        const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        // Google often blocks requests without User-Agent
        const res = await fetchWithTimeout(feedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; VibeCooking/1.0; +https://vibe-cooking.vercel.app)'
            }
        });

        if (!res.ok) throw new Error(`Failed to fetch YT RSS ${feedUrl}: ${res.status}`);
        const text = await res.text();
        const $ = load(text, { xmlMode: true });
        const items: PatrolRecipe[] = [];

        $('entry').each((_, el) => {
            const title = $(el).find('title').text();
            const link = $(el).find('link').attr('href') || '';
            const date = $(el).find('published').text();
            const image = $(el).find('media\\:thumbnail').attr('url') || '';

            items.push({
                id: link,
                title,
                url: link,
                image,
                date: new Date(date).toISOString(),
                sourceName: source.name,
                sourceIcon: source.icon
            });
        });

        return items.slice(0, 5);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error fetching YouTube for ${source.name}:`, errorMessage);
        return [];
    }
}

export default async function handler(request: Request) {
    // CORS Headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        // Enforce a global timeout of 9 seconds to ensure we return before Vercel's 10s limit
        const timeoutPromise = new Promise<PatrolRecipe[]>((resolve) => {
            setTimeout(() => {
                console.error('Global handler timeout reached');
                resolve([]);
            }, 9000);
        });

        // Create an array of promises where each handles its own error
        // so Promise.all doesn't fail, and we can filter out empty results.
        const fetchPromises = SOURCES.map(async source => {
            try {
                if (source.type === 'rss') return await fetchRssFeed(source);
                if (source.type === 'youtube') return await fetchYoutubeFeed(source);
            } catch (e) {
                console.error(`Source ${source.name} failed:`, e);
                return []; // Return empty on error
            }
            return [];
        });

        const dataPromise = Promise.all(fetchPromises).then(results => results.flat());

        // Race against the clock
        const allRecipes = await Promise.race([dataPromise, timeoutPromise]);

        const sortedRecipes = allRecipes.sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        return new Response(JSON.stringify({ recipes: sortedRecipes }), {
            status: 200,
            headers: {
                ...corsHeaders,
                'content-type': 'application/json',
                'Cache-Control': 's-maxage=600, stale-while-revalidate=300',
            },
        });
    } catch (error: unknown) {
        // This catch block handles errors in the logic ABOVE Promise.all (unlikely)
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { ...corsHeaders, 'content-type': 'application/json' },
        });
    }
}
