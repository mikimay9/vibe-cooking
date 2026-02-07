import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RecipeFormProps {
    onRecipeAdded: () => void;
}

export const RecipeForm = ({ onRecipeAdded }: RecipeFormProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [category, setCategory] = useState<'main' | 'side' | 'soup'>('main');
    const [ingredients, setIngredients] = useState('');
    const [steps, setSteps] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(false);

    const handleUrlBlur = async () => {
        if (!url || title) return; // Don't overwrite if title exists or URL empty

        try {
            new URL(url); // Validate URL format
        } catch {
            return;
        }

        setFetchingData(true);
        try {
            const res = await fetch(`/api/extract-recipe?url=${encodeURIComponent(url)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.title) setTitle(data.title);
                if (data.ingredients && data.ingredients.length > 0) {
                    setIngredients(data.ingredients.join('\n'));
                }
                if (data.steps && data.steps.length > 0) {
                    setSteps(data.steps.join('\n'));
                }
            }
        } catch (err) {
            console.error('Failed to extract recipe:', err);
        } finally {
            setFetchingData(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!supabase) {
            alert('Supabaseの設定が完了していません。.envファイルを確認してください。');
            return;
        }

        setLoading(true);

        const { error } = await supabase
            .from('recipes')
            .insert([
                {
                    name: title,
                    url: url,
                    category: category,
                    frequency: 'none',
                    child_rating: 3,
                    memo: 'メモなし'
                },
            ]);

        setLoading(false);

        if (error) {
            alert('エラーが発生しました: ' + error.message);
        } else {
            setTitle('');
            setUrl('');
            setCategory('main');
            setIsOpen(false);
            onRecipeAdded();
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 20 }}
                            className="fixed bottom-24 right-6 z-[100] mb-4 bg-white p-6 rounded-sm shadow-xl border border-gray-200 w-80 font-hand"
                            style={{
                                backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)',
                                backgroundSize: '24px 24px'
                            }}
                        >
                            <h3 className="text-xl font-bold mb-4 text-ink border-b-2 border-gray-200 pb-1">レシピを追加</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">レシピ名</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full bg-transparent border-b-2 border-gray-300 focus:border-blue-400 outline-none transition-colors"
                                        placeholder="例：至高のカレー"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">カテゴリー</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setCategory('main')}
                                            className={`flex-1 py-1 text-xs border rounded-sm ${category === 'main' ? 'bg-red-100 border-red-400 text-red-700 font-bold' : 'bg-white border-gray-300 text-gray-500'}`}
                                        >
                                            主菜
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCategory('side')}
                                            className={`flex-1 py-1 text-xs border rounded-sm ${category === 'side' ? 'bg-green-100 border-green-400 text-green-700 font-bold' : 'bg-white border-gray-300 text-gray-500'}`}
                                        >
                                            副菜
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCategory('soup')}
                                            className={`flex-1 py-1 text-xs border rounded-sm ${category === 'soup' ? 'bg-yellow-100 border-yellow-400 text-yellow-700 font-bold' : 'bg-white border-gray-300 text-gray-500'}`}
                                        >
                                            汁物
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">URL</label>
                                    <div className="relative">
                                        <input
                                            type="url"
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            onBlur={handleUrlBlur}
                                            className="w-full bg-transparent border-b-2 border-gray-300 focus:border-blue-400 outline-none transition-colors pr-8"
                                            placeholder="https://..."
                                        />
                                        {fetchingData && (
                                            <div className="absolute right-0 top-0 bottom-0 flex items-center">
                                                <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        URLを入力するとタイトル・材料・手順を自動取得します
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold mb-1">材料 <span className="text-xs font-normal text-gray-400">(1行ずつ)</span></label>
                                        <textarea
                                            value={ingredients}
                                            onChange={(e) => setIngredients(e.target.value)}
                                            className="w-full h-32 bg-transparent border-2 border-gray-200 rounded p-2 focus:border-blue-400 outline-none transition-colors text-sm"
                                            placeholder="豚肉 200g&#13;&#10;玉ねぎ 1個"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1">作り方 <span className="text-xs font-normal text-gray-400">(1行ずつ)</span></label>
                                        <textarea
                                            value={steps}
                                            onChange={(e) => setSteps(e.target.value)}
                                            className="w-full h-32 bg-transparent border-2 border-gray-200 rounded p-2 focus:border-blue-400 outline-none transition-colors text-sm"
                                            placeholder="1. 材料を切る&#13;&#10;2. 炒める"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-500 text-white font-bold py-2 rounded-sm shadow-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
                                >
                                    {loading ? '保存中...' : '本棚に追加'}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className="bg-yellow-400 text-ink p-4 rounded-full shadow-lg border-2 border-white"
            >
                {isOpen ? <X size={24} /> : <Plus size={24} />}
            </motion.button>
        </div>
    );
};
