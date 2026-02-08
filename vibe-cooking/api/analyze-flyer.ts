
import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
    maxDuration: 60, // Allow up to 60 seconds for processing
};

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        const { image, recipes } = request.body;

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
        // Use gemini-1.5-flash for speed and cost effectiveness, or gemini-pro-vision
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        if (!image) {
            return response.status(400).json({ error: 'No image provided' });
        }

        // Clean base64 string (remove data:image/jpeg;base64, prefix if present)
        const base64Data = image.includes(',') ? image.split(',')[1] : image;

        const prompt = `
        You are a helpful Japanese cooking assistant.
        1. Analyze this flyer image and identify "Bargain Ingredients" (特売品) or "Seasonal Ingredients" (旬の食材). List up to 5 main items.
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

        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg',
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
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

    } catch (error) {
        console.error('Analysis failed:', error);
        return response.status(500).json({ error: 'Failed to analyze flyer', details: error.message });
    }
}
