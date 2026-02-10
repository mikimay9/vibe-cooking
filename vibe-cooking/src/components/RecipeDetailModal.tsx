/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2 } from 'lucide-react';
import type { Recipe } from '../types';
import { supabase } from '../lib/supabase';

interface RecipeDetailModalProps {
    recipe: Recipe | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export const RecipeDetailModal = ({ recipe, isOpen, onClose, onUpdate }: RecipeDetailModalProps) => {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [category, setCategory] = useState<'main' | 'side' | 'soup'>('main');
    const [memo, setMemo] = useState('');
    const [rating, setRating] = useState(3);
    const [frequency, setFrequency] = useState<'biweekly' | 'monthly' | 'quarterly' | 'none'>('none');
    const [workDuration, setWorkDuration] = useState(0);
    const [ingredients, setIngredients] = useState('');
    const [newArrangement, setNewArrangement] = useState('');
    const [loading, setLoading] = useState(false);
    const [isHibernating, setIsHibernating] = useState(false);

    // eslint-disable-next-line
    useEffect(() => {
        if (recipe) {
            setName(recipe.name);
            setUrl(recipe.url || '');
            setCategory(recipe.category || 'main');
            setMemo(recipe.memo || '');
            setRating(recipe.rating || 3); // Updated to use 'rating' based on new schema, fallback to 3
            setFrequency(recipe.frequency || 'none');
            setWorkDuration(recipe.work_duration || 0);
            setIngredients(recipe.ingredients ? recipe.ingredients.join('\n') : '');
            setIsHibernating(recipe.is_hibernating || false);
        }
    }, [recipe]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase || !recipe) return;

        setLoading(true);

        const updatedArrangements = recipe.arrangements || [];
        if (newArrangement.trim()) {
            updatedArrangements.push({
                date: new Date().toISOString().split('T')[0],
                text: newArrangement.trim()
            });
        }

        const { error } = await supabase
            .from('recipes')
            .update({
                name,
                url,
                category,
                memo,
                rating: rating, // Updated column name
                frequency,
                work_duration: workDuration,
                ingredients: ingredients.split('\n').filter(line => line.trim() !== ''),
                arrangements: updatedArrangements,
                is_hibernating: isHibernating, // New field
            })
            .eq('id', recipe.id);

        setLoading(false);

        if (error) {
            alert('エラーが発生しました: ' + error.message);
        } else {
            onUpdate();
            onClose();
            setNewArrangement(''); // Reset input
        }
    };

    const handleDelete = async () => {
        if (!supabase || !recipe) return;
        if (!confirm('本当に削除しますか？')) return;

        setLoading(true);
        const { error } = await supabase.from('recipes').delete().eq('id', recipe.id);
        setLoading(false);

        if (error) {
            alert('削除に失敗しました');
        } else {
            onUpdate();
            onClose();
        }
    };

    if (!isOpen || !recipe) return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative bg-white p-6 shadow-brutal border-4 border-black w-full max-w-md max-h-[90vh] overflow-y-auto font-body z-50"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6 border-b-4 border-black pb-2">
                        <h3 className="text-3xl font-black italic tracking-tighter text-black uppercase transform -skew-x-12">EDIT PROJECT</h3>
                        <button onClick={onClose} className="p-1 hover:bg-black hover:text-white transition-colors border-2 border-transparent hover:border-black">
                            <X size={24} strokeWidth={3} />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name */}
                        <div>
                            <label className="block text-xs font-black mb-1 uppercase tracking-widest bg-black text-white inline-block px-1">PROJECT NAME</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-gray-100 border-2 border-black p-2 focus:bg-neon-yellow/20 focus:border-neon-pink outline-none transition-colors font-bold"
                                required
                            />
                        </div>

                        {/* Status (Hibernate) */}
                        <div>
                            <label className="block text-xs font-black mb-1 uppercase tracking-widest bg-black text-white inline-block px-1">STATUS</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsHibernating(false)}
                                    className={`flex-1 py-2 text-xs border-2 border-black font-black uppercase tracking-wider transition-all ${!isHibernating ? 'bg-black text-white' : 'bg-white text-gray-400 hover:bg-gray-100'}`}
                                >
                                    ACTIVE
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsHibernating(true)}
                                    className={`flex-1 py-2 text-xs border-2 border-black font-black uppercase tracking-wider transition-all ${isHibernating ? 'bg-blue-600 text-white shadow-[2px_2px_0px_0px_#000]' : 'bg-white text-gray-400 hover:bg-gray-100'}`}
                                >
                                    HIBERNATE 💤
                                </button>
                            </div>
                        </div>

                        {/* Category */}
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

                        {/* Rating & Work Duration */}
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-black mb-1 uppercase tracking-widest bg-black text-white inline-block px-1">RATING</label>
                                <div className="flex gap-1 border-2 border-black p-2 bg-white justify-center">
                                    {[1, 2, 3].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            className={`text-2xl leading-none transition-transform hover:scale-110 ${rating >= star ? 'text-neon-yellow drop-shadow-[1px_1px_0_#000]' : 'text-gray-200'}`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-black mb-1 uppercase tracking-widest bg-black text-white inline-block px-1">TIME (MIN)</label>
                                <input
                                    type="number"
                                    value={workDuration}
                                    onChange={(e) => setWorkDuration(Number(e.target.value))}
                                    className="w-full h-[52px] bg-gray-50 border-2 border-black p-2 focus:bg-white outline-none transition-colors text-lg font-black text-center"
                                />
                            </div>
                        </div>

                        {/* Ingredients */}
                        <div>
                            <label className="block text-xs font-black mb-1 uppercase tracking-widest bg-black text-white inline-block px-1">MATERIALS</label>
                            <textarea
                                value={ingredients}
                                onChange={(e) => setIngredients(e.target.value)}
                                rows={5}
                                className="w-full bg-gray-50 border-2 border-black p-2 focus:bg-white outline-none transition-colors text-xs font-mono leading-relaxed"
                            />
                        </div>

                        {/* Memo */}
                        <div>
                            <label className="block text-xs font-black mb-1 uppercase tracking-widest bg-black text-white inline-block px-1">MEMO</label>
                            <textarea
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                                rows={2}
                                className="w-full bg-yellow-50 border-2 border-black p-2 focus:bg-white outline-none transition-colors text-xs font-mono resize-none leading-relaxed"
                            />
                        </div>

                        {/* Arrangements (History) */}
                        <div>
                            <label className="block text-xs font-black mb-1 uppercase tracking-widest bg-black text-white inline-block px-1">LOGS</label>
                            {recipe.arrangements && recipe.arrangements.length > 0 && (
                                <div className="mb-2 space-y-2 border-2 border-black bg-gray-100 p-2 max-h-32 overflow-y-auto">
                                    {recipe.arrangements.map((item, index) => (
                                        <div key={index} className="text-xs border-b border-gray-300 last:border-0 pb-1 mb-1 last:pb-0 last:mb-0">
                                            <span className="font-mono text-gray-500 mr-2">[{item.date}]</span>
                                            <span className="font-bold">{item.text}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <textarea
                                value={newArrangement}
                                onChange={(e) => setNewArrangement(e.target.value)}
                                rows={2}
                                placeholder="ADD NEW LOG..."
                                className="w-full bg-white border-2 border-black p-2 focus:bg-neon-cyan/10 outline-none text-xs transition-colors"
                            />
                        </div>

                        {/* URL */}
                        <div>
                            <label className="block text-xs font-black mb-1 uppercase tracking-widest bg-black text-white inline-block px-1">URL</label>
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="w-full bg-gray-100 border-b-4 border-black p-2 focus:border-neon-cyan outline-none transition-colors font-mono text-xs"
                            />
                        </div>

                        {/* Actions */}
                        <div className="pt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="px-4 py-3 bg-white text-black font-black border-2 border-black hover:bg-neon-pink hover:text-white transition-colors"
                                title="DELETE PROJECT"
                            >
                                <Trash2 size={20} strokeWidth={3} />
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-3 bg-neon-yellow text-black font-black border-2 border-black shadow-brutal hover:bg-black hover:text-white hover:border-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 uppercase tracking-widest text-lg flex items-center justify-center gap-2"
                            >
                                <Save size={20} strokeWidth={3} />
                                {loading ? 'SAVING...' : 'UPDATE'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
};
