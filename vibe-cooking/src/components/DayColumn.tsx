import { useDroppable } from '@dnd-kit/core';
import { format, isSaturday, isFriday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Briefcase, Home } from 'lucide-react';
import { DraggableRecipe } from './DraggableRecipe';
import { GachaButton } from './GachaButton';

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
    onSoupGacha: () => void;
}

const DroppableSlot = ({ id, label, children, isOver }: { id: string, label: string, children?: React.ReactNode, isOver: boolean }) => {
    const { setNodeRef } = useDroppable({ id });

    return (
        <div ref={setNodeRef} className={`p-2 rounded-none border-2 border-dashed transition-colors min-h-[60px] ${isOver ? 'border-neon-cyan bg-cyan-50' : 'border-gray-300 bg-white/80'}`}>
            <div className="text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest">{label}</div>
            {children}
        </div>
    );
};

export const DayColumn = ({ date, dayType, plans, onToggleDayType, onDeletePlan, onSoupGacha }: DayColumnProps) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayStr = format(date, 'E', { locale: ja });
    const isWeekendParty = (isFriday(date) || isSaturday(date));

    // Filter plans for this day
    const main = plans.find(p => p.slot_type === 'main');
    const sides = plans.filter(p => p.slot_type === 'side');
    const soup = plans.find(p => p.slot_type === 'soup');

    const isWorkDay = dayType === 'work';

    return (
        <div className={`flex-shrink-0 w-72 min-h-[500px] p-0 relative flex flex-col transition-colors border-4 border-black bg-white overflow-hidden group`}>

            {/* Huge Watermark */}
            <div className="absolute top-20 -right-4 font-director font-black text-9xl text-gray-100/50 -rotate-12 select-none pointer-events-none z-0 transform transition-transform group-hover:scale-110 duration-500">
                {format(date, 'EEE').toUpperCase()}
            </div>

            {/* Header */}
            <div className={`relative flex justify-between items-center p-3 border-b-4 border-black z-10 ${isWeekendParty ? 'bg-neon-yellow' : 'bg-black'} overflow-hidden`}>
                {/* Layered Typography: Bold English Day behind Japanese */}
                <span className={`absolute -bottom-4 -left-2 text-6xl font-black font-director italic tracking-tighter opacity-20 select-none pointer-events-none ${isWeekendParty ? 'text-black' : 'text-white'}`}>
                    {format(date, 'EEE').toUpperCase()}
                </span>

                <div className="flex flex-col relative z-20">
                    <span className={`text-4xl font-black font-director leading-none tracking-tighter ${isWeekendParty ? 'text-black' : 'text-neon-yellow'}`}>
                        {dayStr}
                    </span>
                    <span className={`text-xs font-bold tracking-widest ${isWeekendParty ? 'text-black' : 'text-gray-400'}`}>{format(date, 'MM.dd')}</span>
                </div>

                <button
                    onClick={onToggleDayType}
                    className={`p-2 border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all ${isWorkDay ? 'bg-white text-black' : 'bg-neon-pink text-white'}`}
                >
                    {isWorkDay ? <Briefcase size={16} strokeWidth={3} /> : <Home size={16} strokeWidth={3} />}
                </button>
            </div>

            {/* Slots Container */}
            <div className="p-4 flex flex-col gap-3 z-10 flex-1">
                <DroppableSlot id={`${dateKey}-main`} label="MAIN PROJECT" isOver={false}>
                    {main && <DraggableRecipe id={`plan-${main.id}`} name={main.recipe.name} onDelete={() => onDeletePlan(main.id)} />}
                </DroppableSlot>

                <div className="space-y-3">
                    <DroppableSlot id={`${dateKey}-side-1`} label="SIDE TASK 01" isOver={false}>
                        {sides[0] && <DraggableRecipe id={`plan-${sides[0].id}`} name={sides[0].recipe.name} onDelete={() => onDeletePlan(sides[0].id)} />}
                    </DroppableSlot>
                    <DroppableSlot id={`${dateKey}-side-2`} label="SIDE TASK 02" isOver={false}>
                        {sides[1] && <DraggableRecipe id={`plan-${sides[1].id}`} name={sides[1].recipe.name} onDelete={() => onDeletePlan(sides[1].id)} />}
                    </DroppableSlot>
                </div>

                <DroppableSlot id={`${dateKey}-soup`} label="SOUP / OPTION" isOver={false}>
                    <div className="flex justify-between items-start w-full">
                        {soup && <DraggableRecipe id={`plan-${soup.id}`} name={soup.recipe.name} onDelete={() => onDeletePlan(soup.id)} />}
                        {!soup && (
                            <div className="w-full h-full min-h-[40px]">
                                <GachaButton onClick={onSoupGacha} />
                            </div>
                        )}
                    </div>
                </DroppableSlot>
            </div>

        </div>
    );
};
