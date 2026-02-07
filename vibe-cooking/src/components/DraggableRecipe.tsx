import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface DraggableRecipeProps {
    id: string;
    name: string;
    image_url?: string;
}

export const DraggableRecipe = ({ id, name, image_url }: DraggableRecipeProps) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: id,
        data: { name, image_url }, // Pass data for drag overlay
    });

    const style = {
        transform: CSS.Translate.toString(transform),
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="bg-white p-3 rounded-sm shadow-sm border border-gray-200 mb-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
        >
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-xs font-bold text-orange-600 flex-shrink-0">
                    {name.slice(0, 1)}
                </div>
                <span className="text-sm font-hand truncate">{name}</span>
            </div>
        </div>
    );
};
