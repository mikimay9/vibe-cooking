
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Plus, Loader2, Siren, WifiOff, RefreshCw } from 'lucide-react';

interface PatrolRecipe {
    id: string;
    title: string;
    url: string;
    image: string;
    date: string;
    sourceName: string;
}

interface PatrolViewProps {
    onAddRecipe: (url: string) => void;
}

export const PatrolView = ({ onAddRecipe }: PatrolViewProps) => {
    const [recipes, setRecipes] = useState<PatrolRecipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastVisit, setLastVisit] = useState<Date | null>(null);

    // Load last visit time on mount
    useEffect(() => {
        const stored = localStorage.getItem('lastPatrolVisit');
        if (stored) {
            setLastVisit(new Date(stored));
        } else {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            setLastVisit(oneWeekAgo);
        }
        localStorage.setItem('lastPatrolVisit', new Date().toISOString());
    }, []);

    const API_URL = import.meta.env.DEV
        ? 'https://vibe-cooking-xi.vercel.app/api/patrol'
        : '/api/patrol';

    const fetchPatrolRecipes = async () => {
        setLoading(true);
        setError('');
        try {
            // Set a client-side timeout of 9.5 seconds (slightly more than server's 9s race)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 9500);

            const res = await fetch(API_URL, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!res.ok) throw new Error('レシピの取得に失敗しました。');
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setRecipes(data.recipes || []);
        } catch (err) {
            console.error('Patrol API Error:', err);
            // Fallback to mock data if API fails
            setRecipes([
                {
                    id: 'mock1',
                    title: '【シン・無限キャベツ】キャベツが無限に食える禁断のレシピ',
                    url: 'https://www.youtube.com/watch?v=k-a2u_bS4eQ',
                    image: 'https://i.ytimg.com/vi/k-a2u_bS4eQ/hqdefault.jpg',
                    date: new Date().toISOString(),
                    sourceName: 'リュウジのバズレシピ (Sample)',
                },
                {
                    id: 'mock2',
                    title: '【極 豚の角煮】とろとろすぎてホロホロすぎる',
                    url: 'https://www.youtube.com/watch?v=x260zQfG4mQ',
                    image: 'https://i.ytimg.com/vi/x260zQfG4mQ/hqdefault.jpg',
                    date: new Date().toISOString(),
                    sourceName: 'だれウマ (Sample)',
                }
            ]);
            setError('最新の取得に失敗したため、サンプルを表示しています。');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatrolRecipes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatDate = (isoString: string) => {
        const d = new Date(isoString);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    };

    return (
        <div className="h-full overflow-y-auto p-4 scrollbar-hide">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-black italic tracking-tighter text-black uppercase transform -skew-x-12 border-b-4 border-neon-cyan pb-2 w-max">
                        <Siren size={28} strokeWidth={3} className="mr-2 inline-block" /> SNS PATROL
                    </h2>
                    <p className="text-sm text-gray-500 font-hand">人気シェフの最新レシピをチェック！</p>
                </div>
                <button
                    onClick={fetchPatrolRecipes}
                    disabled={loading}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <RefreshCw size={20} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm mb-4 font-hand">
                    {error}
                </div>
            )}

            {loading && recipes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                    <span className="font-hand">パトロール中...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recipes.map((recipe, index) => (
                        <motion.div
                            key={recipe.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
                        >
                            {/* Image Area */}
                            <div className="relative h-32 bg-gray-100 overflow-hidden">
                                {recipe.image ? (
                                    <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                                        <span className="text-xs">No Image</span>
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 bg-white/90 px-2 py-0.5 rounded-full text-[10px] font-bold text-gray-600 shadow-sm border border-gray-200">
                                    {recipe.sourceName}
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                                    <span className="text-white text-xs font-bold">{formatDate(recipe.date)}</span>
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="p-3 flex-1 flex flex-col justify-between">
                                <h3 className="font-bold text-gray-800 text-sm mb-2 line-clamp-2 leading-tight">
                                    {lastVisit && new Date(recipe.date) > lastVisit && (
                                        <span className="inline-block bg-red-500 text-white text-[10px] px-1.5 rounded-sm mr-1 align-text-top animate-pulse font-sans">
                                            NEW
                                        </span>
                                    )}
                                    <a href={recipe.url} target="_blank" rel="noopener noreferrer" className="hover:text-orange-600 transition-colors">
                                        {recipe.title}
                                    </a>
                                </h3>

                                <div className="flex gap-2 mt-auto">
                                    <button
                                        onClick={() => onAddRecipe(recipe.url)}
                                        className="flex-1 bg-orange-100 text-orange-700 py-1.5 rounded text-xs font-bold hover:bg-orange-200 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Plus size={14} />
                                        本棚へ
                                    </button>
                                    <a
                                        href={recipe.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-xs font-bold hover:bg-gray-200 transition-colors flex items-center justify-center"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {!loading && recipes.length === 0 && !error && (
                <div className="text-center py-12 text-gray-400 font-hand">
                    NO RECIPES DETECTED... <WifiOff size={20} className="inline ml-1" />
                </div>
            )}
        </div>
    );
};
