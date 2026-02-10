import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RecipeFormProps {
    onRecipeAdded: () => void;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    initialUrl?: string;
    initialData?: {
        name?: string;
        ingredients?: string[];
        category?: 'main' | 'side' | 'soup';
        memo?: string;
    };
}

export const RecipeForm = ({ onRecipeAdded, isOpen, onOpenChange, initialUrl = '', initialData }: RecipeFormProps) => {
    // const [isOpen, setIsOpen] = useState(false); // Hoisted
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [category, setCategory] = useState<'main' | 'side' | 'soup'>('main');
    const [ingredients, setIngredients] = useState('');
    const [workDuration, setWorkDuration] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(false);

    // Sync state when form opens or initial props change
    useEffect(() => {
        if (isOpen) {
            if (initialUrl) {
                setUrl(initialUrl);
            }
            if (initialData) {
                if (initialData.name) setTitle(initialData.name);
                if (initialData.ingredients) setIngredients(initialData.ingredients.join('\n'));
                if (initialData.category) setCategory(initialData.category);
            }
        }
    }, [isOpen, initialUrl, initialData]);

    // Trigger fetch when URL is set via initialUrl AND no initialData provided (priority to explicit data)
    useEffect(() => {
        if (isOpen && initialUrl && url === initialUrl && !initialData) {
            handleUrlBlur();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url, isOpen, initialUrl, initialData]);

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
                if (data.totalTime) {
                    setWorkDuration(data.totalTime);
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
                    memo: 'メモなし',
                    ingredients: ingredients.split('\n').filter(line => line.trim() !== ''),
                    work_duration: workDuration,
                },
            ]);

        setLoading(false);

        if (error) {
            alert('エラーが発生しました: ' + error.message);
        } else {
            setTitle('');
            setUrl('');
            setCategory('main');
            setIngredients('');
            setWorkDuration(0);
            onOpenChange(false);
            onRecipeAdded();
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed bottom-24 right-6 z-[100] mb-4 bg-white p-6 rounded-none shadow-brutal border-4 border-black w-80 font-body"
                        >
                            <h3 className="text-3xl font-black italic tracking-tighter mb-6 text-black border-b-4 border-black pb-2 uppercase transform -skew-x-12">NEW PROJECT</h3>
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-black mb-1 uppercase tracking-widest bg-black text-white inline-block px-1">PROJECT NAME</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full bg-gray-100 border-2 border-black p-2 focus:bg-neon-yellow/20 focus:border-neon-pink outline-none transition-colors font-bold"
                                        placeholder="INPUT TITLE..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black mb-1 uppercase tracking-widest bg-black text-white inline-block px-1">CATEGORY</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setCategory('main')}
                                            className={`flex-1 py-2 text-xs border-2 border-black font-black uppercase tracking-wider transition-all ${category === 'main' ? 'bg-red-500 text-white shadow-[2px_2px_0px_0px_#000]' : 'bg-white text-gray-400 hover:bg-gray-100'}`}
                                        >
                                            MAIN
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCategory('side')}
                                            className={`flex-1 py-2 text-xs border-2 border-black font-black uppercase tracking-wider transition-all ${category === 'side' ? 'bg-green-500 text-black shadow-[2px_2px_0px_0px_#000]' : 'bg-white text-gray-400 hover:bg-gray-100'}`}
                                        >
                                            SIDE
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCategory('soup')}
                                            className={`flex-1 py-2 text-xs border-2 border-black font-black uppercase tracking-wider transition-all ${category === 'soup' ? 'bg-yellow-400 text-black shadow-[2px_2px_0px_0px_#000]' : 'bg-white text-gray-400 hover:bg-gray-100'}`}
                                        >
                                            SOUP
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black mb-1 uppercase tracking-widest bg-black text-white inline-block px-1">SOURCE URL</label>
                                    <div className="relative">
                                        <input
                                            type="url"
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            onBlur={handleUrlBlur}
                                            className="w-full bg-gray-100 border-b-4 border-black p-2 focus:border-neon-cyan outline-none transition-colors pr-8 font-mono text-xs"
                                            placeholder="https://..."
                                        />
                                        {fetchingData && (
                                            <div className="absolute right-2 top-2">
                                                <div className="animate-spin h-4 w-4 border-2 border-black rounded-full border-t-transparent"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black mb-1 uppercase tracking-widest bg-black text-white inline-block px-1">MATERIALS</label>
                                        <textarea
                                            value={ingredients}
                                            onChange={(e) => setIngredients(e.target.value)}
                                            className="w-full h-32 bg-gray-50 border-2 border-black p-2 focus:bg-white outline-none transition-colors text-xs font-mono resize-none"
                                            placeholder="LIST HERE..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black mb-1 uppercase tracking-widest bg-black text-white inline-block px-1">TIME (MIN)</label>
                                        <input
                                            type="number"
                                            value={workDuration}
                                            onChange={(e) => setWorkDuration(Number(e.target.value))}
                                            className="w-full h-12 bg-gray-50 border-2 border-black p-2 focus:bg-white outline-none transition-colors text-lg font-black text-center"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-black text-white font-black py-3 border-2 border-black shadow-brutal hover:bg-neon-pink hover:text-white hover:border-black active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-lg"
                                >
                                    {loading ? 'SAVING...' : 'EXECUTE'}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onOpenChange(!isOpen)}
                className={`p-4 rounded-full shadow-brutal border-2 border-black transition-colors ${isOpen ? 'bg-white text-black' : 'bg-neon-pink text-white'}`}
            >
                {isOpen ? <X size={24} strokeWidth={3} /> : <Plus size={24} strokeWidth={3} />}
            </motion.button>
        </div>
    );
};
