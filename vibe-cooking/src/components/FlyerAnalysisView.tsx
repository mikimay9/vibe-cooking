
import { useState, useRef } from 'react';
import { Upload, Camera, Loader2, ChefHat, Sparkles, X } from 'lucide-react';
import type { Recipe } from '../types';

interface FlyerAnalysisViewProps {
    onAddRecipe: (recipe: Partial<Recipe>) => void;
    existingRecipes: Recipe[];
}

interface AnalysisResult {
    bargains: string[];
    recipes: {
        name: string;
        reason: string;
        is_new?: boolean;
    }[];
}

// Helper to resize image
const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Tweak: Lower resolution and quality to avoid Vercel 4.5MB payload limit
                const MAX_WIDTH = 500;
                const scaleSize = MAX_WIDTH / img.width;
                const width = Math.min(MAX_WIDTH, img.width);
                const height = img.height * (width < img.width ? scaleSize : 1);

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                // Compress to JPEG 50% quality
                const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                resolve(dataUrl);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const FlyerAnalysisView = ({ onAddRecipe, existingRecipes }: FlyerAnalysisViewProps) => {
    const [images, setImages] = useState<string[]>([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setResult(null);
            const newImages: string[] = [];

            // Process up to 2 images
            const count = Math.min(files.length, 2 - images.length);

            for (let i = 0; i < count; i++) {
                try {
                    const resized = await resizeImage(files[i]);
                    newImages.push(resized);
                } catch (err) {
                    console.error('Resize failed', err);
                }
            }

            setImages(prev => [...prev, ...newImages].slice(0, 2));
        }
        // Reset input so same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setResult(null);
    };

    const handleAnalyze = async () => {
        if (images.length === 0) return;
        setAnalyzing(true);
        setResult(null);

        // Check payload size roughly
        const totalSize = images.reduce((acc, img) => acc + img.length, 0);
        console.log('Sending payload size (Approx characters):', totalSize, 'Limit: 4000000');

        // Base64 string length ~ 1.33 * size in bytes. 
        // Vercel limit is 4.5MB (approx 5.9M chars). 
        // We set safe limit at 4MB (approx 4M bytes * 1.33 = 5.3M chars?). 
        // Actually 4MB bytes = 4 * 1024 * 1024 = 4,194,304 bytes.
        // In Base64: 4,194,304 * 1.37 approx = 5,746,196 chars.
        // Setting limit at 4,500,000 chars is very safe (~3.2MB bytes).
        if (totalSize > 4500000) {
            alert(`画像サイズが大きすぎます(現在: ${(totalSize / 1024 / 1024).toFixed(2)}MB相当)。枚数を減らすか、トリミングしてください。`);
            setAnalyzing(false);
            return;
        }

        try {
            const response = await fetch('/api/analyze-flyer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    images, // Send array of images
                    recipes: existingRecipes.map(r => ({ name: r.name, id: r.id }))
                })
            });

            if (!response.ok) {
                // Try to get text if json fails
                const text = await response.text();
                let errorDetails = text;
                try {
                    const json = JSON.parse(text);
                    errorDetails = json.error || json.message || text;
                } catch {
                    // ignore
                }
                throw new Error(`Server Error (${response.status}): ${errorDetails}`);
            }

            const data = await response.json();
            setResult(data);
        } catch (error: unknown) {
            console.error('Full Error Object:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(`分析に失敗しました: ${errorMessage}`);
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-4 bg-white/50 overflow-y-auto">
            <h2 className="text-xl font-bold text-orange-800 mb-4 flex items-center gap-2">
                <Camera size={24} /> チラシ分析
            </h2>

            {/* Image Upload Area */}
            {images.length < 2 && (
                <div
                    className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-colors mb-4"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload className="text-gray-400 mb-2" size={32} />
                    <p className="text-sm text-gray-500 font-bold">チラシ画像をアップロード</p>
                    <p className="text-xs text-gray-400 mt-1">
                        最大2枚まで（表・裏など）<br />
                        タップして選択または撮影
                    </p>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                    />
                </div>
            )}

            {/* Image Previews */}
            {images.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {images.map((img, idx) => (
                        <div key={idx} className="relative aspect-[3/4] rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white">
                            <img src={img} alt={`Flyer ${idx + 1}`} className="w-full h-full object-contain" />
                            <button
                                onClick={() => removeImage(idx)}
                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Action Button */}
            {images.length > 0 && !analyzing && !result && (
                <button
                    onClick={handleAnalyze}
                    className="mt-2 w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold py-3 rounded-xl shadow-md flex items-center justify-center gap-2 transform active:scale-95 transition-all"
                >
                    <Sparkles size={20} /> AIで特売レシピを診断
                </button>
            )}

            {analyzing && (
                <div className="mt-8 flex flex-col items-center text-orange-600 animate-pulse">
                    <Loader2 size={40} className="animate-spin mb-2" />
                    <p className="font-bold">チラシを読み込んでいます...</p>
                    <p className="text-xs text-orange-400">特売品から献立を考えています🍳</p>
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="mt-6 space-y-6 animate-in slide-in-from-bottom duration-500">

                    {/* Bargain Items */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-orange-100">
                        <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2 text-sm">
                            <span className="text-lg">🛒</span> 今日の特売・旬食材
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {result.bargains.map((item, idx) => (
                                <span key={idx} className="bg-orange-100 text-orange-800 px-2 py-1 rounded-md text-xs font-bold">
                                    {item}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Recipe Suggestions */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-ink mb-1 flex items-center gap-2 text-sm">
                            <ChefHat size={16} /> おすすめ献立
                        </h3>

                        {result.recipes.map((recipe, idx) => (
                            <div key={idx} className={`p-4 rounded-lg shadow-sm border relative ${recipe.is_new ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'}`}>
                                {recipe.is_new && (
                                    <span className="absolute -top-2 -right-2 bg-yellow-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-bounce">
                                        NEW IDEA!
                                    </span>
                                )}
                                <h4 className="font-bold text-lg text-ink mb-1">{recipe.name}</h4>
                                <p className="text-xs text-gray-500 mb-3">{recipe.reason}</p>
                                <button
                                    onClick={() => onAddRecipe({ name: recipe.name, category: 'main' })} // Default to main for now
                                    className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold py-2 rounded-md transition-colors flex items-center justify-center gap-1"
                                >
                                    ＋ 本棚に追加
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => { setImages([]); setResult(null); }}
                        className="w-full text-gray-400 text-xs text-center hover:text-gray-600 underline"
                    >
                        他のチラシを読み込む
                    </button>
                </div>
            )}
        </div>
    );
};
