import { motion } from 'framer-motion';
import { ExternalLink, Star } from 'lucide-react';

interface RecipeCardProps {
    name: string;
    url: string;
    frequency: 'biweekly' | 'monthly' | 'rare';
    child_rating: number;
    memo: string;
}

export const RecipeCard = ({ name, url, frequency, child_rating, memo }: RecipeCardProps) => {
    return (
        <motion.div
            whileHover={{ scale: 1.02, rotate: 1 }}
            whileTap={{ scale: 0.98 }}
            className="bg-white p-4 rounded-sm shadow-md border border-gray-200 relative transform rotate-[-1deg] font-hand"
            style={{
                backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px)',
                backgroundSize: '100% 24px' // Lined paper look
            }}
        >
            {/* Tape effect */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-yellow-100 opacity-80 rotate-2 shadow-sm"></div>

            <div className="mt-2">
                <h3 className="text-xl font-bold mb-1 text-ink">{name}</h3>

                <div className="flex items-center gap-1 mb-2">
                    {[...Array(3)].map((_, i) => (
                        <Star
                            key={i}
                            size={16}
                            className={`${i < child_rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                        />
                    ))}
                    <span className="text-xs text-gray-500 ml-2">({frequency})</span>
                </div>

                <p className="text-gray-600 text-sm mb-4 leading-6">
                    {memo}
                </p>

                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-500 hover:text-blue-600 text-sm font-bold no-underline hover:underline"
                >
                    <ExternalLink size={14} className="mr-1" />
                    レシピを見る
                </a>
            </div>
        </motion.div>
    );
};
