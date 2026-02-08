
import { useState, useRef } from 'react';
import { Upload, Camera, Loader2, ChefHat, Sparkles } from 'lucide-react';
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

export const FlyerAnalysisView = ({ onAddRecipe, existingRecipes }: FlyerAnalysisViewProps) => {
    const [image, setImage] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
                setResult(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = async () => {
        if (!image) return;
        setAnalyzing(true);
        setResult(null);

        try {
            const response = await fetch('/api/analyze-flyer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image,
                    recipes: existingRecipes.map(r => ({ name: r.name, id: r.id }))
                })
            });

            if (!response.ok) throw new Error('Analysis failed');

            const data = await response.json();
            setResult(data);
        } catch (error) {
            console.error(error);
            alert('分析に失敗しました。時間をおいて再度お試しください。');
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
            <div
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors
                    ${image ? 'border-orange-300 bg-orange-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
                `}
                onClick={() => fileInputRef.current?.click()}
            >
                {image ? (
                    <div className="relative w-full max-h-48 overflow-hidden rounded-lg">
                        <img src={image} alt="Uploaded flyer" className="w-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <span className="text-white font-bold bg-black/50 px-3 py-1 rounded-full">変更する</span>
                        </div>
                    </div>
                ) : (
                    <>
                        <Upload className="text-gray-400 mb-2" size={32} />
                        <p className="text-sm text-gray-500 font-bold">チラシ画像をアップロード</p>
                        <p className="text-xs text-gray-400 mt-1">タップして選択または撮影</p>
                    </>
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                />
            </div>

            {/* Action Button */}
            {image && !analyzing && !result && (
                <button
                    onClick={handleAnalyze}
                    className="mt-4 w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold py-3 rounded-xl shadow-md flex items-center justify-center gap-2 transform active:scale-95 transition-all"
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
                        onClick={() => { setImage(null); setResult(null); }}
                        className="w-full text-gray-400 text-xs text-center hover:text-gray-600 underline"
                    >
                        他のチラシを読み込む
                    </button>
                </div>
            )}
        </div>
    );
};
