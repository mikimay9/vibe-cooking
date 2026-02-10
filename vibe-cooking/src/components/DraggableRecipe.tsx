import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface DraggableRecipeProps {
    id: string;
    name: string;
    image_url?: string;
    category?: 'main' | 'side' | 'soup';
    onDelete?: () => void;
    onEdit?: () => void;
}

export const DraggableRecipe = ({ id, name, image_url, category, onDelete, onEdit }: DraggableRecipeProps) => {
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
            className={`group relative p-3 rounded-none bg-white border-2 border-black mb-2 cursor-grab active:cursor-grabbing hover:shadow-brutal hover:-translate-y-[2px] hover:-translate-x-[2px] transition-all select-none w-full`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-6 h-6 flex items-center justify-center text-[10px] font-black border-2 border-black flex-shrink-0 relative shadow-[2px_2px_0px_0px_#000]
                    ${category === 'main' ? 'bg-red-500 text-white' : ''}
                    ${category === 'side' ? 'bg-green-500 text-black' : ''}
                    ${category === 'soup' ? 'bg-yellow-400 text-black' : ''}
                    ${!category ? 'bg-gray-200 text-black' : ''}
                `}>
                    {name.slice(0, 1)}
                    {isQuick && (
                        <div className="absolute -top-2 -right-2 bg-neon-yellow text-black border-2 border-black w-5 h-5 flex items-center justify-center text-[10px] shadow-sm animate-pulse z-10">
                            ⚡
                        </div>
                    )}
                </div>
                <span className="text-sm font-bold font-body truncate flex-1 text-black">{name}</span>
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
        </div>
    );
};
