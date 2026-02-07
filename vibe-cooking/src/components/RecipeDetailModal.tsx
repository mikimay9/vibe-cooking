import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import type { Recipe } from '../App';
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
    const [newArrangement, setNewArrangement] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (recipe) {
            setName(recipe.name);
            setUrl(recipe.url || '');
            setCategory(recipe.category || 'main');
            setMemo(recipe.memo || '');
            setRating(recipe.child_rating || 3);
            setFrequency(recipe.frequency || 'none');
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
                child_rating: rating,
                frequency,
                arrangements: updatedArrangements,
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

    if (!isOpen || !recipe) return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden font-hand border-2 border-orange-100"
                    style={{
                        backgroundImage: 'radial-gradient(#f3f4f6 1px, transparent 1px)',
                        backgroundSize: '24px 24px'
                    }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-white/80">
                        <h3 className="text-xl font-bold text-orange-800">レシピを編集</h3>
                        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={24} className="text-gray-400" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">料理名</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full p-2 bg-white border border-gray-200 rounded focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none transition-all"
                                required
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">カテゴリー</label>
                            <div className="flex gap-2">
                                {[
                                    { id: 'main', label: '主菜', color: 'bg-red-100 text-red-700 border-red-200' },
                                    { id: 'side', label: '副菜', color: 'bg-green-100 text-green-700 border-green-200' },
                                    { id: 'soup', label: '汁物', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' }
                                ].map((cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setCategory(cat.id as any)}
                                        className={`flex-1 py-2 rounded-md border-2 text-sm font-bold transition-all ${category === cat.id
                                            ? `${cat.color} shadow-sm`
                                            : 'bg-gray-50 border-gray-100 text-gray-400'
                                            }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Rating & Frequency */}
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-600 mb-1">お気に入り度</label>
                                <div className="flex gap-1">
                                    {[1, 2, 3].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            className={`text-2xl transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400' : 'text-gray-200'
                                                }`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-600 mb-1">頻度</label>
                                <select
                                    value={frequency}
                                    onChange={(e) => setFrequency(e.target.value as any)}
                                    className="w-full p-2 bg-white border border-gray-200 rounded focus:border-orange-400 outline-none"
                                >
                                    <option value="biweekly">隔週</option>
                                    <option value="monthly">月1回</option>
                                    <option value="quarterly">2-3か月に1回</option>
                                    <option value="none">設定なし</option>
                                </select>
                            </div>
                        </div>

                        {/* Memo */}
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">自分流メモ</label>
                            <textarea
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                                rows={3}
                                placeholder="例：にんじんを入れると美味しい / 味が薄いので醤油多め"
                                className="w-full p-2 bg-yellow-50/50 border border-yellow-200 rounded focus:border-orange-400 outline-none text-sm leading-relaxed resize-none"
                            />
                        </div>

                        {/* Arrangements (History) */}
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">アレンジ履歴</label>

                            {/* Existing Arrangements */}
                            {recipe.arrangements && recipe.arrangements.length > 0 && (
                                <div className="mb-2 space-y-2">
                                    {recipe.arrangements.map((item, index) => (
                                        <div key={index} className="bg-yellow-50/50 p-2 rounded border border-yellow-100 text-sm">
                                            <div className="text-xs text-gray-400 mb-1">{item.date}</div>
                                            <div className="text-gray-700 whitespace-pre-wrap">{item.text}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* New Arrangement Input */}
                            <textarea
                                value={newArrangement}
                                onChange={(e) => setNewArrangement(e.target.value)}
                                rows={2}
                                placeholder="今回のアレンジ：しいたけをエリンギに変更..."
                                className="w-full p-2 bg-white border border-gray-200 rounded focus:border-orange-400 outline-none text-sm transition-colors"
                            />
                        </div>

                        {/* URL */}
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">参考URL</label>
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full p-2 bg-white border border-gray-200 rounded text-sm text-gray-500 focus:text-ink focus:border-orange-400 outline-none"
                            />
                        </div>

                        {/* Ingredients & Steps Display */}
                        {((recipe?.ingredients?.length ?? 0) > 0 || (recipe?.steps?.length ?? 0) > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                                {recipe.ingredients && recipe.ingredients.length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-orange-800 mb-2">材料</h3>
                                        <ul className="list-disc list-inside text-sm text-gray-700 bg-orange-50/50 p-2 rounded max-h-40 overflow-y-auto">
                                            {recipe.ingredients.map((ing, i) => (
                                                <li key={i}>{ing}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {recipe.steps && recipe.steps.length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-orange-800 mb-2">作り方</h3>
                                        <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1 max-h-40 overflow-y-auto">
                                            {recipe.steps.map((step, i) => (
                                                <li key={i}>{step}</li>
                                            ))}
                                        </ol>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="pt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-md transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-3 bg-orange-500 text-white font-bold rounded-md shadow-md hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Save size={18} />
                                {loading ? '保存中...' : '保存する'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
};
