import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface DraggableRecipeProps {
    id: string;
    name: string;
    image_url?: string;
    category?: 'main' | 'side' | 'soup';
    onDelete?: () => void;
}

export const DraggableRecipe = ({ id, name, image_url, category, onDelete }: DraggableRecipeProps) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: id,
        data: { name, image_url, category }, // Pass data for drag overlay
    });

    const style = {
        transform: CSS.Translate.toString(transform),
    };

    // Category Styles
    const getCategoryStyle = () => {
        switch (category) {
            case 'main': return 'border-l-4 border-l-red-400 bg-red-50/50';
            case 'side': return 'border-l-4 border-l-green-400 bg-green-50/50';
            case 'soup': return 'border-l-4 border-l-yellow-400 bg-yellow-50/50';
            default: return 'border-l-4 border-gray-200';
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`group relative p-3 rounded-sm shadow-sm border border-gray-200 mb-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none ${getCategoryStyle()}`}
        >
            <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                    ${category === 'main' ? 'bg-red-100 text-red-600' : ''}
                    ${category === 'side' ? 'bg-green-100 text-green-600' : ''}
                    ${category === 'soup' ? 'bg-yellow-100 text-yellow-600' : ''}
                    ${!category ? 'bg-gray-100 text-gray-600' : ''}
                `}>
                    {name.slice(0, 1)}
                </div>
                <span className="text-sm font-hand truncate flex-1">{name}</span>
            </div>

            {onDelete && (
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Stop drag start
                        onDelete();
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                    title="削除"
                >
                    ×
                </button>
            )}
        </div>
    );
};
