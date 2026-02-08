export interface Recipe {
    id: string;
    name: string;
    url: string;
    frequency: 'biweekly' | 'monthly' | 'quarterly' | 'none';
    child_rating: number;
    memo: string;
    category: 'main' | 'side' | 'soup';
    ingredients?: string[];
    work_duration?: number; // minutes
    arrangements?: { date: string; text: string }[];
}

export interface WeeklyPlanItem {
    id: string;
    recipe: { id: string, name: string };
    slot_type: 'main' | 'side' | 'soup';
    date: string;
    day_type: 'work' | 'home';
}

export interface DaySetting {
    date: string;
    day_type: 'work' | 'home';
}
