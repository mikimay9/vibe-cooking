import { load } from 'cheerio';

export const config = {
    // Switch to nodejs for cheerio robustness
    runtime: 'nodejs',
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
        const $ = load(html);

        const recipeData = {
            title: '',
            image: '',
            description: '',
            ingredients: [] as string[],
            totalTime: 0, // minutes
        };

        // Helper to parse ISO 8601 duration (PT1H30M) to minutes
        const parseDuration = (isoDuration: string) => {
            if (!isoDuration) return 0;
            const match = isoDuration.match(/P(?:([0-9]+)Y)?(?:([0-9]+)M)?(?:([0-9]+)W)?(?:([0-9]+)D)?T(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?/);
            if (!match) return 0;
            const [, , , , , h, m] = match;
            let minutes = 0;
            if (h) minutes += parseInt(h) * 60;
            if (m) minutes += parseInt(m);
            return minutes;
        };

        // Strategy 1: JSON-LD
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const content = $(el).html();
                if (!content) return;
                const data = JSON.parse(content);
                const graphs = Array.isArray(data) ? data : (data['@graph'] || [data]);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const recipe = graphs.find((g: Record<string, any>) => g['@type'] === 'Recipe' || (Array.isArray(g['@type']) && g['@type'].includes('Recipe')));

                if (recipe) {
                    recipeData.title = recipe.name || '';
                    recipeData.description = recipe.description || '';
                    recipeData.image = Array.isArray(recipe.image) ? recipe.image[0] : (recipe.image?.url || recipe.image || '');

                    if (recipe.recipeIngredient) {
                        recipeData.ingredients = Array.isArray(recipe.recipeIngredient)
                            ? recipe.recipeIngredient
                            : [recipe.recipeIngredient];
                    }

                    // Extract Duration
                    if (recipe.totalTime) {
                        recipeData.totalTime = parseDuration(recipe.totalTime);
                    } else if (recipe.cookTime || recipe.prepTime) {
                        // Fallback: sum of cook and prep if total not available
                        recipeData.totalTime = parseDuration(recipe.cookTime) + parseDuration(recipe.prepTime);
                    }
                }
            } catch (e) {
                console.error('JSON-LD parse error', e);
            }
        });

        // Strategy 2: Meta Tags (if title/image missing)
        if (!recipeData.title) {
            recipeData.title = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
        }
        if (!recipeData.image) {
            recipeData.image = $('meta[property="og:image"]').attr('content') || '';
        }

        // Strategy 3: Heuristics
        if (recipeData.ingredients.length === 0) {
            // Cookpad specific (example)
            $('#ingredients_list .ingredient_name').each((_, el) => {
                if ($(el).text().trim()) recipeData.ingredients.push($(el).text().trim());
            });
        }

        return new Response(JSON.stringify(recipeData), {
            status: 200,
            headers: {
                'content-type': 'application/json',
                'Cache-Control': 's-maxage=3600, stale-while-revalidate',
            },
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to extract recipe';
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
        });
    }
}
