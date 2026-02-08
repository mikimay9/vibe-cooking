import { format, addDays } from 'date-fns';
import { DayColumn } from './DayColumn';

import type { WeeklyPlanItem, DaySetting } from '../types';

interface WeeklyBoardProps {
    startDate: Date;
    plans: WeeklyPlanItem[];
    daySettings: DaySetting[];
    onToggleDayType: (date: Date, currentType: 'work' | 'home') => void;
    onDeletePlan: (id: string) => void;
    onSoupGacha: (date: Date) => void;
}

export const WeeklyBoard = ({ startDate, plans, daySettings, onToggleDayType, onDeletePlan, onSoupGacha }: WeeklyBoardProps) => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

    return (
        <div className="flex-1 overflow-y-auto md:overflow-x-auto p-4 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] bg-gray-50 border-r border-gray-200 pb-24 md:pb-4">
            <div className="flex flex-col md:flex-row gap-4 md:min-w-max">
                {days.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayPlans = plans.filter(p => p.date === dateKey);

                    // Determine day type from settings, fallback to 'work'
                    const setting = daySettings.find(s => s.date === dateKey);
                    const dayType = setting?.day_type || 'work';

                    return (
                        <DayColumn
                            key={dateKey}
                            date={day}
                            dayType={dayType}
                            plans={dayPlans}
                            onToggleDayType={() => onToggleDayType(day, dayType)}
                            onDeletePlan={onDeletePlan}
                            onSoupGacha={() => onSoupGacha(day)}
                        />
                    );
                })}
            </div>
        </div>
    );
};
