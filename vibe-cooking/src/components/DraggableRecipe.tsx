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

    // ... getCategoryStyle ...
    const getCategoryStyle = () => {
        switch (category) {
            case 'main': return 'border-l-4 border-l-red-400 bg-red-50/50';
            case 'side': return 'border-l-4 border-l-green-400 bg-green-50/50';
            case 'soup': return 'border-l-4 border-l-yellow-400 bg-yellow-50/50';
            default: return 'border-l-4 border-gray-200';
        }
    };

    // Work Mode Logic: Quick recipes
    const isQuick = (name.includes('虚無') || name.includes('レンジ') || name.includes('爆速') || name.includes('早') || name.includes('一撃'));

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`group relative p-3 rounded-sm shadow-sm border border-gray-200 mb-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none ${getCategoryStyle()}`}
        >
            <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 relative
                    ${category === 'main' ? 'bg-red-100 text-red-600' : ''}
                    ${category === 'side' ? 'bg-green-100 text-green-600' : ''}
                    ${category === 'soup' ? 'bg-yellow-100 text-yellow-600' : ''}
                    ${!category ? 'bg-gray-100 text-gray-600' : ''}
                `}>
                    {name.slice(0, 1)}
                    {isQuick && (
                        <div className="absolute -top-1 -right-1 bg-yellow-400 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow-sm border border-white animate-pulse">
                            ⚡
                        </div>
                    )}
                </div>
                <span className="text-sm font-hand truncate flex-1">{name}</span>
            </div>

            {/* Action Buttons */}
            <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit();
                        }}
                        className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm hover:bg-blue-600"
                        title="編集"
                    >
                        ✎
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm hover:bg-red-600"
                        title="削除"
                    >
                        ×
                    </button>
                )}
            </div>
        </div>
    );
};
