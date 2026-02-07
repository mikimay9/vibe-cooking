import { useEffect, useState } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, MouseSensor, TouchSensor, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { addDays, isTuesday, previousTuesday, format } from 'date-fns';
import { supabase } from './lib/supabase';
import { RecipeForm } from './components/RecipeForm';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { WeeklyBoard } from './components/WeeklyBoard';
import { DraggableRecipe } from './components/DraggableRecipe';

export interface Recipe {
  id: string;
  name: string;
  url: string;
  frequency: 'biweekly' | 'monthly' | 'quarterly' | 'none';
  child_rating: number;
  memo: string;
  category: 'main' | 'side' | 'soup';
}

interface WeeklyPlanItem {
  id: string;
  recipe: { id: string, name: string };
  slot_type: 'main' | 'side' | 'soup';
  date: string;
  day_type: 'work' | 'home';
}

const SidebarDroppable = ({ children }: { children: React.ReactNode }) => {
  const { setNodeRef } = useDroppable({ id: 'sidebar-bookshelf' });
  return <div ref={setNodeRef} className="flex-1 flex flex-col h-full">{children}</div>;
};

function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [plans, setPlans] = useState<WeeklyPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [activeTab, setActiveTab] = useState<'my_recipes' | 'coop' | 'buzz'>('my_recipes');
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return isTuesday(today) ? today : previousTuesday(today);
  });

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const fetchRecipes = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setRecipes(data || []);
    setLoading(false);
  };

  const fetchWeeklyPlan = async () => {
    if (!supabase) return;
    const endDate = addDays(startDate, 6);
    const { data, error } = await supabase
      .from('weekly_plan')
      .select(`
            id, date, slot_type, day_type, created_at,
            recipe:recipes (id, name)
        `)
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .lte('date', format(endDate, 'yyyy-MM-dd'))
      .order('created_at', { ascending: true }); // Ensure stable order

    if (!error) setPlans(data as any);
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  useEffect(() => {
    fetchWeeklyPlan();
  }, [startDate]);

  const handleDeletePlan = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('weekly_plan').delete().eq('id', id);
    if (!error) fetchWeeklyPlan();
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    setActiveId(active.id);
    const idStr = String(active.id);
    if (idStr.startsWith('recipe-')) {
      const rId = idStr.replace('recipe-', '');
      const r = recipes.find(r => r.id === rId);
      if (r) setActiveRecipe(r);
    } else if (idStr.startsWith('plan-')) {
      const pId = idStr.replace('plan-', '');
      const plan = plans.find(p => p.id === pId);
      if (plan) setActiveRecipe({ ...plan.recipe, url: '', frequency: 'monthly', child_rating: 3, memo: '' } as Recipe);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveRecipe(null);

    if (!over) return;
    if (!supabase) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // Identify Drop Target
    const isSidebarDrop = overIdStr === 'sidebar-bookshelf';
    const isSlotDrop = overIdStr.includes('-') && !isSidebarDrop;

    // Helper: Find existing item in target slot to overwrite
    const findVictim = (dateStr: string, slotType: string, index: number) => {
      const candidates = plans.filter(p => p.date === dateStr && p.slot_type === slotType);
      return candidates[index];
      // Note: Sort order assumed from fetchWeeklyPlan
    };

    // Case 1: Sidebar -> Board Slot (Create/Overwrite)
    if (activeIdStr.startsWith('recipe-') && isSlotDrop) {
      const recipeId = activeIdStr.replace('recipe-', '');
      const dateStr = overIdStr.substring(0, 10);
      const remainder = overIdStr.substring(11);

      let slotType = remainder;
      let targetIndex = 0;
      if (remainder.startsWith('side')) {
        slotType = 'side';
        if (remainder === 'side-2') targetIndex = 1;
      }
      if (remainder.startsWith('main')) slotType = 'main';
      if (remainder.startsWith('soup')) slotType = 'soup';

      const victim = findVictim(dateStr, slotType, targetIndex);

      if (victim) {
        // Overwrite existing
        const { error } = await supabase
          .from('weekly_plan')
          .update({ recipe_id: recipeId })
          .eq('id', victim.id);
        if (!error) fetchWeeklyPlan();
      } else {
        // Create new
        const { error } = await supabase
          .from('weekly_plan')
          .insert({
            date: dateStr,
            recipe_id: recipeId,
            slot_type: slotType,
            day_type: 'work'
          });
        if (!error) fetchWeeklyPlan();
      }
    }

    // Case 2: Board Slot -> Sidebar (Delete)
    if (activeIdStr.startsWith('plan-') && isSidebarDrop) {
      const planId = activeIdStr.replace('plan-', '');
      const { error } = await supabase
        .from('weekly_plan')
        .delete()
        .eq('id', planId);

      if (!error) fetchWeeklyPlan();
    }

    // Case 3: Board Slot -> Board Slot (Move/Overwrite)
    if (activeIdStr.startsWith('plan-') && isSlotDrop) {
      const planId = activeIdStr.replace('plan-', '');

      const dateStr = overIdStr.substring(0, 10);
      const remainder = overIdStr.substring(11);

      let slotType = remainder;
      let targetIndex = 0;
      if (remainder.startsWith('side')) {
        slotType = 'side';
        if (remainder === 'side-2') targetIndex = 1;
      }
      if (remainder.startsWith('main')) slotType = 'main';
      if (remainder.startsWith('soup')) slotType = 'soup';

      const victim = findVictim(dateStr, slotType, targetIndex);

      // Don't overwrite self
      if (victim && victim.id === planId) return;

      if (victim) {
        // Delete victim
        await supabase.from('weekly_plan').delete().eq('id', victim.id);
      }

      const { error } = await supabase
        .from('weekly_plan')
        .update({
          date: dateStr,
          slot_type: slotType
        })
        .eq('id', planId);

      if (!error) fetchWeeklyPlan();
    }
  };

  const handleToggleDayType = async (date: Date, currentType: 'work' | 'home') => {
    if (!supabase) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const newType = currentType === 'work' ? 'home' : 'work';

    // Update logic: update all plans for this date? 
    // Supabase update based on date check.
    // Ideally we should have a `days` table. 
    // Current hack: Update all plan items for that day.
    const { error } = await supabase
      .from('weekly_plan')
      .update({ day_type: newType })
      .eq('date', dateStr);

    if (!error) fetchWeeklyPlan();
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-screen bg-paper text-ink font-hand overflow-hidden">
        {/* Sidebar: Recipe Bookshelf */}
        <aside className="w-64 flex-shrink-0 flex flex-col border-r border-gray-200 bg-white/80 backdrop-blur-sm relative z-10 shadow-lg">
          <SidebarDroppable>
            <div className="p-4 border-b border-gray-200 bg-orange-50">
              <h2 className="text-xl font-bold text-orange-800 mb-2">レシピ本棚</h2>

              {/* Tabs */}
              <div className="flex gap-1 bg-white/50 p-1 rounded-md">
                <button
                  onClick={() => setActiveTab('my_recipes')}
                  className={`flex-1 py-1 text-xs rounded-sm transition-colors ${activeTab === 'my_recipes' ? 'bg-orange-100 text-orange-700 font-bold shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  My
                </button>
                <button
                  onClick={() => setActiveTab('coop')}
                  className={`flex-1 py-1 text-xs rounded-sm transition-colors ${activeTab === 'coop' ? 'bg-green-100 text-green-700 font-bold shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  Co-op
                </button>
                <button
                  onClick={() => setActiveTab('buzz')}
                  className={`flex-1 py-1 text-xs rounded-sm transition-colors ${activeTab === 'buzz' ? 'bg-purple-100 text-purple-700 font-bold shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  Buzz
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {!supabase && <p className="text-xs text-red-500">DB未接続</p>}

              {activeTab === 'my_recipes' && (
                <>
                  {recipes.map(recipe => (
                    <DraggableRecipe
                      key={recipe.id}
                      id={`recipe-${recipe.id}`}
                      name={recipe.name}
                      category={recipe.category}
                      onEdit={() => setEditingRecipe(recipe)}
                    />
                  ))}
                  {recipes.length === 0 && !loading && (
                    <p className="text-center text-gray-400 text-sm mt-10">レシピを追加してね</p>
                  )}
                </>
              )}

              {activeTab === 'coop' && (
                <div className="text-center text-gray-400 text-sm mt-10 p-4 border-2 border-dashed border-gray-200 rounded-md">
                  <p className="mb-2">🚚</p>
                  <p>コープデリ連携機能</p>
                  <p className="text-xs mt-1">購入履歴から自動で食材リスト・レシピを表示予定</p>
                </div>
              )}

              {activeTab === 'buzz' && (
                <div className="text-center text-gray-400 text-sm mt-10 p-4 border-2 border-dashed border-gray-200 rounded-md">
                  <p className="mb-2">🐝</p>
                  <p>バズレシピ巡回</p>
                  <p className="text-xs mt-1">AIがSNSで話題のレシピを提案予定</p>
                </div>
              )}
            </div>

            {activeTab === 'my_recipes' && (
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <RecipeForm onRecipeAdded={fetchRecipes} />
              </div>
            )}
          </SidebarDroppable>
        </aside>

        {/* Main: Weekly Board */}
        <main className="flex-1 flex flex-col relative w-full">
          <div className="p-4 flex justify-between items-center bg-white/50 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-ink">週間献立パレット 🎨</h1>
            <div className="flex gap-2">
              <button onClick={() => setStartDate(d => addDays(d, -7))} className="px-3 py-1 border rounded hover:bg-gray-100">← 先週</button>
              <button onClick={() => setStartDate(d => addDays(d, 7))} className="px-3 py-1 border rounded hover:bg-gray-100">来週 →</button>
            </div>
          </div>
          <WeeklyBoard
            startDate={startDate}
            plans={plans}
            onToggleDayType={handleToggleDayType}
            onDeletePlan={handleDeletePlan}
          />
        </main>
      </div>

      <RecipeDetailModal
        recipe={editingRecipe}
        isOpen={!!editingRecipe}
        onClose={() => setEditingRecipe(null)}
        onUpdate={fetchRecipes}
      />

      <DragOverlay>
        {activeId && activeRecipe ? (
          <div className="opacity-80 rotate-3 cursor-grabbing pointer-events-none">
            <div className="bg-white p-3 rounded-sm shadow-xl border-2 border-orange-200 w-64">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-xs font-bold text-orange-600">
                  {activeRecipe.name.slice(0, 1)}
                </div>
                <span className="text-sm font-bold">{activeRecipe.name}</span>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default App;
