import { load } from 'cheerio';

export const config = {
    runtime: 'edge', // Should switch to nodejs for cheerio usually, but cheerio works in edge if lightweight.
    // Actually Vercel Edge has issues with some Node APIs. 
    // Let's stick to Node.js runtime for cheerio/robustness.
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

        let recipeData = {
            title: '',
            image: '',
            description: '',
            ingredients: [] as string[],
            steps: [] as string[],
        };

        // Strategy 1: JSON-LD
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const data = JSON.parse($(el).html() || '{}');
                const graphs = Array.isArray(data) ? data : (data['@graph'] || [data]);

                const recipe = graphs.find((g: any) => g['@type'] === 'Recipe' || g['@type']?.includes('Recipe'));

                if (recipe) {
                    recipeData.title = recipe.name || '';
                    recipeData.description = recipe.description || '';
                    recipeData.image = Array.isArray(recipe.image) ? recipe.image[0] : (recipe.image?.url || recipe.image || '');

                    if (recipe.recipeIngredient) {
                        recipeData.ingredients = Array.isArray(recipe.recipeIngredient)
                            ? recipe.recipeIngredient
                            : [recipe.recipeIngredient];
                    }

                    if (recipe.recipeInstructions) {
                        const instructions = recipe.recipeInstructions;
                        if (Array.isArray(instructions)) {
                            recipeData.steps = instructions.map((step: any) => {
                                if (typeof step === 'string') return step;
                                if (step.text) return step.text;
                                if (step.name) return step.name;
                                return '';
                            }).filter(Boolean);
                        } else if (typeof instructions === 'string') {
                            recipeData.steps = [instructions];
                        }
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

        // Strategy 3: Heuristics (if ingredients/steps missing) - Very basic fallback
        // This is hard to get right universally, but common class names might help
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

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message || 'Failed to extract recipe' }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
        });
    }
}
