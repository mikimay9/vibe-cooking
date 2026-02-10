
import { useState, useRef } from 'react';
import { Upload, Camera, Loader2, ChefHat, Sparkles, X, ShoppingCart } from 'lucide-react';
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
            const response = await fetch('/api/flyer-analysis', {
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
                    // Combine error and details for visibility
                    errorDetails = [json.error, json.details].filter(Boolean).join(': ');
                    if (!errorDetails) errorDetails = text;
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
        <div className="h-full flex flex-col p-4 bg-white overflow-y-auto">
            <h2 className="text-2xl font-black italic tracking-tighter text-black mb-6 flex items-center gap-2 uppercase transform -skew-x-12 border-b-4 border-neon-pink pb-2 w-max">
                <Camera size={28} strokeWidth={3} /> FLYER SCANNER
            </h2>

            {/* Image Upload Area */}
            {images.length < 2 && (
                <div
                    className="border-4 border-dashed border-black bg-gray-100 p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-neon-yellow/20 hover:border-black transition-colors mb-4 group"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload className="text-black mb-2 group-hover:scale-110 transition-transform" size={40} strokeWidth={3} />
                    <p className="text-sm text-black font-black uppercase tracking-widest">UPLOAD FLYER</p>
                    <p className="text-[10px] text-gray-500 mt-1 font-mono">
                        MAX 2 IMAGES (FRONT/BACK)<br />
                        TAP TO SELECT
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
                <div className="grid grid-cols-2 gap-4 mb-4">
                    {images.map((img, idx) => (
                        <div key={idx} className="relative aspect-[3/4] border-2 border-black shadow-brutal bg-white p-1">
                            <img src={img} alt={`Flyer ${idx + 1}`} className="w-full h-full object-contain bg-gray-50" />
                            <button
                                onClick={() => removeImage(idx)}
                                className="absolute -top-2 -right-2 bg-neon-pink text-white border-2 border-black w-6 h-6 flex items-center justify-center hover:bg-black transition-colors"
                            >
                                <X size={14} strokeWidth={3} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Action Button */}
            {images.length > 0 && !analyzing && !result && (
                <button
                    onClick={handleAnalyze}
                    className="mt-2 w-full bg-neon-yellow text-black border-2 border-black font-black py-4 shadow-brutal flex items-center justify-center gap-2 transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all uppercase text-lg tracking-widest hover:bg-white"
                >
                    <Sparkles size={24} strokeWidth={3} /> START ANALYSIS
                </button>
            )}

            {analyzing && (
                <div className="mt-8 flex flex-col items-center text-black animate-pulse">
                    <Loader2 size={40} className="animate-spin mb-4" strokeWidth={3} />
                    <p className="font-black text-xl uppercase italic">ANALYZING...</p>
                    <p className="text-xs text-gray-500 font-mono mt-2">DETECTING BARGAINS & RECIPES</p>
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="mt-6 space-y-6 animate-in slide-in-from-bottom duration-500">

                    {/* Bargain Items */}
                    <div className="bg-black p-4 border-2 border-black shadow-brutal">
                        <h3 className="font-black text-neon-yellow mb-4 flex items-center gap-2 text-sm uppercase tracking-widest">
                            <ShoppingCart size={20} strokeWidth={3} /> BARGAIN DETECTED
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {result.bargains.map((item, idx) => (
                                <span key={idx} className="bg-white text-black border border-black px-2 py-1 text-xs font-bold shadow-[2px_2px_0px_0px_#FFF]">
                                    {item}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Recipe Suggestions */}
                    <div className="space-y-4">
                        <h3 className="font-black text-black mb-1 flex items-center gap-2 text-sm uppercase tracking-widest border-b-2 border-black pb-1 w-max">
                            <ChefHat size={18} strokeWidth={3} /> SUGGESTED MENU
                        </h3>

                        {result.recipes.map((recipe, idx) => (
                            <div key={idx} className={`p-4 border-2 border-black shadow-brutal relative ${recipe.is_new ? 'bg-neon-yellow/10' : 'bg-white'}`}>
                                {recipe.is_new && (
                                    <span className="absolute -top-3 -right-2 bg-neon-pink text-white text-[10px] font-black px-2 py-1 border-2 border-black shadow-sm transform rotate-3">
                                        NEW IDEA!
                                    </span>
                                )}
                                <h4 className="font-black text-lg text-black mb-2 uppercase">{recipe.name}</h4>
                                <p className="text-xs text-gray-600 mb-4 font-mono leading-relaxed">{recipe.reason}</p>
                                <button
                                    onClick={() => onAddRecipe({ name: recipe.name, category: 'main' })} // Default to main for now
                                    className="w-full bg-white border-2 border-black hover:bg-black hover:text-white text-black text-xs font-black py-3 transition-colors flex items-center justify-center gap-2 uppercase tracking-wider"
                                >
                                    ＋ ADD TO STOCK
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => { setImages([]); setResult(null); }}
                        className="w-full text-gray-400 text-xs text-center hover:text-black underline uppercase font-bold mt-8"
                    >
                        SCAN ANOTHER FLYER
                    </button>
                </div>
            )}
        </div>
    );
};
