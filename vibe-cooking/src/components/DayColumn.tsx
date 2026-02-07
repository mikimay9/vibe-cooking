import { useDroppable } from '@dnd-kit/core';
import { format, isSaturday, isFriday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Briefcase, Home, Sparkles } from 'lucide-react';
import { DraggableRecipe } from './DraggableRecipe';

interface Recipe {
    id: string;
    name: string;
}

interface WeeklyPlanItem {
    id: string; // plan id
    recipe: Recipe;
    slot_type: 'main' | 'side' | 'soup';
}

interface DayColumnProps {
    date: Date;
    dayType: 'work' | 'home';
    plans: WeeklyPlanItem[];
    onToggleDayType: () => void;
    onDeletePlan: (id: string) => void;
}

const DroppableSlot = ({ id, label, children, isOver }: { id: string, label: string, children?: React.ReactNode, isOver: boolean }) => {
    const { setNodeRef } = useDroppable({ id });

    return (
        <div ref={setNodeRef} className={`p-2 rounded-sm border-2 border-dashed transition-colors min-h-[60px] ${isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white/50'}`}>
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            {children}
        </div>
    );
};

export const DayColumn = ({ date, dayType, plans, onToggleDayType, onDeletePlan }: DayColumnProps) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayStr = format(date, 'E', { locale: ja });
    const isWeekendParty = (isFriday(date) || isSaturday(date));

    // Filter plans for this day
    const main = plans.find(p => p.slot_type === 'main');
    const sides = plans.filter(p => p.slot_type === 'side');
    const soup = plans.find(p => p.slot_type === 'soup');

    return (
        <div className={`flex-shrink-0 w-64 p-4 rounded-md border-2 relative flex flex-col gap-3 transition-colors
      ${isWeekendParty ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300 bg-white'}
    `}>
            {/* Header */}
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-bold font-hand ${isWeekendParty ? 'text-orange-600' : 'text-ink'}`}>
                        {dayStr}
                    </span>
                    <span className="text-sm text-gray-500">{format(date, 'M/d')}</span>
                    {isWeekendParty && <Sparkles size={16} className="text-yellow-500 animate-pulse" />}
                </div>

                <button
                    onClick={onToggleDayType}
                    className={`p-1 rounded-full border ${dayType === 'work' ? 'bg-gray-100 text-gray-500 border-gray-300' : 'bg-green-100 text-green-600 border-green-300'}`}
                >
                    {dayType === 'work' ? <Briefcase size={16} /> : <Home size={16} />}
                </button>
            </div>

            {/* Slots */}
            <DroppableSlot id={`${dateKey}-main`} label="主菜" isOver={false}>
                {main && <DraggableRecipe id={`plan-${main.id}`} name={main.recipe.name} onDelete={() => onDeletePlan(main.id)} />}
            </DroppableSlot>

            <div className="space-y-2">
                <DroppableSlot id={`${dateKey}-side-1`} label="副菜" isOver={false}>
                    {sides[0] && <DraggableRecipe id={`plan-${sides[0].id}`} name={sides[0].recipe.name} onDelete={() => onDeletePlan(sides[0].id)} />}
                </DroppableSlot>
                <DroppableSlot id={`${dateKey}-side-2`} label="副菜" isOver={false}>
                    {sides[1] && <DraggableRecipe id={`plan-${sides[1].id}`} name={sides[1].recipe.name} onDelete={() => onDeletePlan(sides[1].id)} />}
                </DroppableSlot>
            </div>

            <DroppableSlot id={`${dateKey}-soup`} label="汁物" isOver={false}>
                {soup && <DraggableRecipe id={`plan-${soup.id}`} name={soup.recipe.name} onDelete={() => onDeletePlan(soup.id)} />}
            </DroppableSlot>

        </div>
    );
};
