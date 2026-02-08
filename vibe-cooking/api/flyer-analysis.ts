
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
    maxDuration: 60, // Allow up to 60 seconds for processing
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
    console.log('Analyze Flyer API called');
    console.log('Request Method:', request.method);

    try {
        if (request.method !== 'POST') {
            console.warn('Invalid method:', request.method);
            return response.status(405).json({
                error: 'Method Not Allowed',
                details: `Received method: ${request.method}`
            });
        }

        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        const { image, images, recipes } = request.body || {}; // Keep 'image' for legacy support
        console.log('Request Body Keys:', Object.keys(request.body || {}));
        console.log('Image count:', images?.length);

        // Support both single 'image' (legacy) and 'images' array
        const imageList = images || (image ? [image] : []);

        if (!images || !Array.isArray(images) || images.length === 0) {
            console.error('No images found in payload');
            return response.status(400).json({ error: 'No images provided' });
        }

        // Mock response if no key or specific debug flag (optional)
        if (!apiKey) {
            console.warn('API Key missing, returning mock data');
            return response.status(200).json({
                bargains: ['豚肉', 'キャベツ (Mock)'],
                recipes: [
                    { name: 'Mock Recipe 1', reason: 'Mock reason because API key is missing' },
                ]
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        // Use gemini-2.0-flash as 1.5-flash is not available for this user
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        if (imageList.length === 0) {
            return response.status(400).json({ error: 'No image provided' });
        }

        // Prepare image parts
        const imageParts = imageList.map((imgStr: string) => {
            // Clean base64 string (remove data:image/jpeg;base64, prefix if present)
            const base64Data = imgStr.includes(',') ? imgStr.split(',')[1] : imgStr;
            return {
                inlineData: {
                    data: base64Data,
                    mimeType: 'image/jpeg',
                },
            };
        });

        const prompt = `
        You are a helpful Japanese cooking assistant.
        1. Analyze these flyer images and identify "Bargain Ingredients" (特売品) or "Seasonal Ingredients" (旬の食材). List up to 5 main items.
        2. Based on these ingredients, and knowing the user might have these recipes: ${JSON.stringify(recipes || [])}, suggest 3 suitable recipes.
           - Prioritize recipes from the user's list if they match the ingredients.
           - If user recipes don't match well, suggest standard Japanese home cooking recipes.
        3. Also suggest 1 NEW recipe idea that is NOT in their list but uses the bargain ingredients.
        
        Output JSON format (Japanese):
        {
            "bargains": ["item1", "item2", ...],
            "recipes": [
                { "name": "Recipe Name", "reason": "Reason for suggestion (e.g. 'Cabbage is on sale!')", "is_new": boolean }
            ]
        }
        Return ONLY valid JSON. Do not use Markdown formatting.
        `;

        const result = await model.generateContent([prompt, ...imageParts]);
        const responseText = result.response.text();

        // Simple cleanup to ensure JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : responseText;

        let data;
        try {
            data = JSON.parse(jsonStr);
        } catch {
            console.error('Failed to parse JSON:', jsonStr);
            throw new Error('Invalid JSON response from AI');
        }

        return response.status(200).json(data);

    } catch (error: unknown) {
        console.error('Analysis failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return response.status(500).json({ error: 'Failed to analyze flyer', details: errorMessage });
    }
}
