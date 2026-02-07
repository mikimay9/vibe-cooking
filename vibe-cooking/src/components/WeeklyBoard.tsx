import { format, addDays } from 'date-fns';
import { DayColumn } from './DayColumn';

interface WeeklyPlanItem {
    id: string; // plan id
    recipe: { id: string, name: string };
    slot_type: 'main' | 'side' | 'soup';
    date: string; // YYYY-MM-DD
    day_type: 'work' | 'home';
}

interface WeeklyBoardProps {
    startDate: Date;
    plans: WeeklyPlanItem[];
    onToggleDayType: (date: Date, currentType: 'work' | 'home') => void;
    onDeletePlan: (id: string) => void;
}

export const WeeklyBoard = ({ startDate, plans, onToggleDayType, onDeletePlan }: WeeklyBoardProps) => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

    return (
        <div className="flex-1 overflow-x-auto p-4 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] bg-gray-50 border-r border-gray-200">
            <div className="flex gap-4 min-w-max pb-4">
                {days.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayPlans = plans.filter(p => p.date === dateKey);
                    const dayType = dayPlans[0]?.day_type || 'work';

                    return (
                        <DayColumn
                            key={dateKey}
                            date={day}
                            dayType={dayType}
                            plans={dayPlans}
                            onToggleDayType={() => onToggleDayType(day, dayType)}
                            onDeletePlan={onDeletePlan}
                        />
                    );
                })}
            </div>
        </div>
    );
};
