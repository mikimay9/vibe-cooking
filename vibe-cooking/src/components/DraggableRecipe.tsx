import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface DraggableRecipeProps {
    id: string;
    name: string;
    image_url?: string;
    category?: 'main' | 'side' | 'soup';
    rating?: number;
    has_cooked?: boolean;
    is_coop?: boolean;
    is_hibernating?: boolean;
    cooking_type?: 'renchin' | 'cook' | 'none';
    onDelete?: () => void;
    onEdit?: () => void;
}

export const DraggableRecipe = ({ id, name, image_url, category, rating, has_cooked, is_hibernating, is_coop, cooking_type, onDelete, onEdit }: DraggableRecipeProps) => {
    // ... hooks ...
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: id,
        data: { name, image_url, category },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
    };



    // Work Mode Logic: Quick recipes
    const isQuick = (name.includes('虚無') || name.includes('レンジ') || name.includes('爆速') || name.includes('早') || name.includes('一撃'));

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`group relative p-3 rounded-none bg-white border-2 ${is_coop ? 'border-dashed border-neon-cyan' : 'border-black'} mb-2 cursor-grab active:cursor-grabbing hover:shadow-brutal hover:-translate-y-[2px] hover:-translate-x-[2px] transition-all select-none w-full`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 flex flex-col items-center justify-center text-[8px] font-black border-2 border-black flex-shrink-0 relative shadow-[2px_2px_0px_0px_#000]
                    ${category === 'main' ? 'bg-red-500 text-white' : ''}
                    ${category === 'side' ? 'bg-green-500 text-black' : ''}
                    ${category === 'soup' ? 'bg-yellow-400 text-black' : ''}
                    ${(!category && !is_coop) ? 'bg-gray-200 text-black' : ''}
                    ${is_coop ? 'bg-white text-black' : ''}
                `}>
                    {is_coop ? (
                        <span className="text-lg leading-none">
                            {cooking_type === 'renchin' && '⚡'}
                            {cooking_type === 'cook' && '🔥'}
                            {!cooking_type && '📦'}
                        </span>
                    ) : (
                        <>
                            <span className="text-xs leading-none mb-[1px]">{name.slice(0, 1)}</span>
                            <div className="flex gap-[1px]">
                                {[...Array(rating || 1)].map((_, i) => (
                                    <span key={i} className="text-[6px] leading-none">★</span>
                                ))}
                            </div>
                        </>
                    )}

                    {isQuick && !is_coop && (
                        <div className="absolute -top-3 -right-3 bg-neon-yellow text-black border-2 border-black w-5 h-5 flex items-center justify-center text-[10px] shadow-sm animate-pulse z-10">
                            ⚡
                        </div>
                    )}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-body truncate text-black">{name}</span>
                        {/* Status Badges */}

                        {is_hibernating && (
                            <span className="bg-blue-200 text-blue-900 text-[8px] font-black px-1 border border-blue-900 uppercase tracking-tighter">ZZZ</span>
                        )}
                        {is_coop && (
                            <span className="bg-neon-cyan text-black text-[8px] font-black px-1 border border-black uppercase tracking-tighter">CO-OP</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                {onEdit && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit?.();
                        }}
                        className="bg-neon-cyan text-black border-2 border-black w-6 h-6 flex items-center justify-center hover:bg-white transition-colors"
                        title="EDIT"
                    >
                        ✎
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.();
                        }}
                        className="bg-neon-pink text-white border-2 border-black w-6 h-6 flex items-center justify-center hover:bg-white hover:text-black transition-colors"
                        title="DELETE"
                    >
                        ×
                    </button>
                )}
            </div>
            {/* NEW Ribbon Badge */}
            {!has_cooked && (
                <div className="absolute top-0 right-0 w-8 h-8 overflow-hidden pointer-events-none z-10">
                    <div className="absolute top-[4px] -right-[18px] rotate-45 bg-neon-pink text-white text-[6px] font-black py-[1px] w-[60px] flex justify-center items-center border-y border-black shadow-sm tracking-widest leading-tight">
                        NEW
                    </div>
                </div>
            )}
        </div>
    );
};
