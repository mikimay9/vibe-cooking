import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Recipe } from '../types';

export interface AnalysisResult {
    bargains: string[];
    recipes: {
        name: string;
        reason: string;
        is_new: boolean;
        ingredients?: string[]; // Optional, for new recipes
        category?: 'main' | 'side' | 'soup'; // Optional guess
    }[];
}

export const analyzeFlyer = async (
    images: string[],
    existingRecipes: Recipe[]
): Promise<AnalysisResult> => {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

    if (!apiKey) {
        throw new Error('API Key mismatch. Please set VITE_GOOGLE_API_KEY in .env');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Prepare image parts
    const imageParts = images.map((imgStr) => {
        // Clean base64 string
        const base64Data = imgStr.includes(',') ? imgStr.split(',')[1] : imgStr;
        return {
            inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg',
            },
        };
    });

    const prompt = `
    You are a professional "Food Director" and Japanese cooking expert.
    
    1. **Analyze these flyer images** and identify "Bargain Ingredients" (特売品). List up to 5 main items (e.g. "豚バラ", "キャベツ").
    
    2. **Suggest 3 optimal menu items (recipes)** based on these bargains.
       - **Cross-reference** with the User's Existing Recipes: ${JSON.stringify(existingRecipes.map(r => ({ id: r.id, name: r.name, ingredients: r.ingredients })))}
       - If a user's existing recipe matches the bargain ingredients well, SUGGEST IT (mark "is_new": false).
       - If no good match exists, suggest a NEW standard Japanese home-cooking recipe (mark "is_new": true).
    
    3. **Prioritize "Directors Choice"**:
       - The recipes should be practical for a busy weeknight.
       - A mix of Main, Side, or Soup is good, but Main dishes are priority.

    Output JSON format (Japanese):
    {
        "bargains": ["item1", "item2", ...],
        "recipes": [
            { 
                "name": "Recipe Name", 
                "reason": "Why this menu? (e.g. '豚バラが安いので！')", 
                "is_new": boolean,
                "ingredients": ["main ingredient 1", "main ingredient 2"],
                "category": "main" | "side" | "soup"
            }
        ]
    }
    Return ONLY valid JSON.
    `;

    try {
        const result = await model.generateContent([prompt, ...imageParts]);
        const responseText = result.response.text();

        // Clean JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : responseText;

        const data = JSON.parse(jsonStr) as AnalysisResult;
        return data;

    } catch (error) {
        console.error('Gemini Analysis Failed:', error);
        throw error;
    }
};
