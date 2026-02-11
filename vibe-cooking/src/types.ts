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
    rating?: 1 | 2 | 3;
    has_cooked?: boolean;
    is_hibernating?: boolean;
    is_coop?: boolean;
    cooking_type?: 'renchin' | 'cook' | 'none';
    quantity?: number; // New: For Digital Twin inventory tracking
}

export interface WeeklyPlanItem {
    id: string;
    recipe: {
        id: string;
        name: string;
        is_coop?: boolean;
        cooking_type?: 'renchin' | 'cook' | 'none';
        quantity?: number;
    };
    slot_type: 'main' | 'side' | 'soup';
    date: string;
    day_type: 'work' | 'home';
}

export interface DaySetting {
    date: string;
    day_type: 'work' | 'home';
}
