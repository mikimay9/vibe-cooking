
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FoodCategory } from "../types";

// Viteで環境変数を読み込む (GOOGLE_API_KEY)
const API_KEY = import.meta.env.GOOGLE_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY;

// APIキーがない場合のハンドリングは呼び出し元で行うか、ここでエラーログを出す
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export interface GeminiProductPrediction {
    name: string;
    category: FoodCategory;
    quantity?: number; // 数量の推論 (例: "2L" -> 2) -> 今回は単位が難しいので名前とカテゴリメイン
    unit?: string;     // 単位の推論
}

/**
 * JANコードから商品情報を推論する関数
 * @param barcode JANコード
 * @returns 推論された商品情報 or null
 */
export async function predictProductFromBarcode(barcode: string): Promise<GeminiProductPrediction | null> {
    if (!genAI) {
        console.warn("Gemini API Key is not set.");
        return null;
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
        あなたは日本の防災備蓄管理システムのAIアシスタントです。
        以下のJANコードに対応する商品情報を推測してください。

        JANコード: ${barcode}

        以下のJSON形式のみを返してください（Markdown記法は不要です）。
        わからない場合はnullではなく、推測できる範囲で答えてください（特にカテゴリ）。
        商品名は具体的かつ簡潔に。

        カテゴリの選択肢: "水・飲料", "主食（米・パン）", "缶詰・レトルト", "お菓子・栄養補助", "調味料", "その他"

        Output Format:
        {
            "name": "商品名",
            "category": "カテゴリ",
            "unit": "単位の推測 (例: 本, 個, 箱, 袋)",
            "defaultExpirationDays": "賞味期限の目安(日数) 数値で"
        }
        `;

        const result = await model.generateContent(prompt);
        const responseProxy = result.response;
        const text = responseProxy.text();

        // JSONパース (Markdownのコードブロック ```json ... ``` が含まれる場合への対応)
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const data = JSON.parse(cleanText);

        return {
            name: data.name,
            category: data.category as FoodCategory,
            unit: data.unit,
            // defaultExpirationDays は呼び出し元で数値変換などして使う
        };

    } catch (error) {
        console.error("Gemini inference failed:", error);
        return null;
    }
}
