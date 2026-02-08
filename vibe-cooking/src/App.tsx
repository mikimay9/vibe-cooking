import { useEffect, useState } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, MouseSensor, TouchSensor, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { addDays, isTuesday, previousTuesday, format } from 'date-fns';
import { supabase } from './lib/supabase';
import { RecipeForm } from './components/RecipeForm';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { WeeklyBoard } from './components/WeeklyBoard';
import { DraggableRecipe } from './components/DraggableRecipe';
import { PatrolView } from './components/PatrolView';
import { SoupGachaModal } from './components/SoupGachaModal';
import { FlyerAnalysisView } from './components/FlyerAnalysisView';

import type { Recipe, WeeklyPlanItem, DaySetting } from './types';

const SidebarDroppable = ({ children }: { children: React.ReactNode }) => {
  const { setNodeRef } = useDroppable({ id: 'sidebar-bookshelf' });
  return <div ref={setNodeRef} className="flex-1 flex flex-col h-full">{children}</div>;
};

function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [plans, setPlans] = useState<WeeklyPlanItem[]>([]);
  const [daySettings, setDaySettings] = useState<DaySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [activeTab, setActiveTab] = useState<'my_recipes' | 'coop' | 'buzz' | 'shopping'>('my_recipes');
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  // Gacha State
  const [gachaTargetDate, setGachaTargetDate] = useState<Date | null>(null);

  // RecipeForm Control
  const [isRecipeFormOpen, setIsRecipeFormOpen] = useState(false);
  const [recipeFormInitialUrl, setRecipeFormInitialUrl] = useState('');
  const [recipeFormInitialData, setRecipeFormInitialData] = useState<{
    name?: string;
    ingredients?: string[];
    category?: 'main' | 'side' | 'soup';
    memo?: string;
  } | undefined>(undefined);

  // Bookshelf Filter State
  const [filterCategory, setFilterCategory] = useState<'all' | 'main' | 'side' | 'soup'>('all');

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

    // Fetch Plans
    const { data: plansData, error: plansError } = await supabase
      .from('weekly_plan')
      .select(`
            id, date, slot_type, day_type, created_at,
            recipe:recipes (id, name)
        `)
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .lte('date', format(endDate, 'yyyy-MM-dd'))
      .order('created_at', { ascending: true });

    if (!plansError) setPlans((plansData as unknown) as WeeklyPlanItem[]);

    // Fetch Day Settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('day_settings')
      .select('*')
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .lte('date', format(endDate, 'yyyy-MM-dd'));

    if (!settingsError) setDaySettings(settingsData as DaySetting[] || []);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(String(active.id));
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
    };

    const currentDayType = daySettings.find(s => s.date === overIdStr.substring(0, 10))?.day_type || 'work';

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
            day_type: currentDayType // Use current setting
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

  const handleImportRecipe = (input: string | Partial<Recipe>) => {
    if (typeof input === 'string') {
      setRecipeFormInitialUrl(input);
      setRecipeFormInitialData(undefined);
    } else {
      setRecipeFormInitialUrl('');
      setRecipeFormInitialData({
        name: input.name,
        category: input.category as 'main' | 'side' | 'soup',
        ingredients: input.ingredients,
        memo: input.memo
      });
    }
    setActiveTab('my_recipes');
    setIsRecipeFormOpen(true);
  };

  const handleAddRecipeFromPatrolUrl = (url: string) => handleImportRecipe(url);
  const handleAddRecipeFromFlyerData = (recipe: Partial<Recipe>) => handleImportRecipe(recipe);

  const handleToggleDayType = async (date: Date, currentType: 'work' | 'home') => {
    if (!supabase) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const newType = currentType === 'work' ? 'home' : 'work';

    // Upsert to day_settings
    const { error } = await supabase
      .from('day_settings')
      .upsert({ date: dateStr, day_type: newType }, { onConflict: 'date' });

    if (!error) {
      // Also update existing plans for visual consistency (though they should rely on Settings now, legacy field might still exist)
      // In this new model, weekly_plan.day_type is redundant but kept for now.
      await supabase
        .from('weekly_plan')
        .update({ day_type: newType })
        .eq('date', dateStr);

      fetchWeeklyPlan();
    }
  };

  const handleSoupGacha = (date: Date) => {
    // Check if we have soup recipes
    const soups = recipes.filter(r => r.category === 'soup');
    if (soups.length === 0) {
      alert('スープのレシピがまだ登録されていません！');
      return;
    }
    setGachaTargetDate(date);
  };

  const handleGachaConfirm = async (recipe: Recipe) => {
    if (!supabase || !gachaTargetDate) return;

    const dateStr = format(gachaTargetDate, 'yyyy-MM-dd');
    const currentDayType = daySettings.find(s => s.date === dateStr)?.day_type || 'work';

    // Insert into plan
    const { error } = await supabase
      .from('weekly_plan')
      .insert({
        date: dateStr,
        recipe_id: recipe.id,
        slot_type: 'soup',
        day_type: currentDayType
      });

    if (!error) {
      fetchWeeklyPlan();
      setGachaTargetDate(null); // Close modal
    } else {
      console.error('Gacha failed:', error);
      alert('保存に失敗しました');
    }
  };

  // Mobile State
  const [activeMobileTab, setActiveMobileTab] = useState<'board' | 'shelf'>('board');

  const filteredRecipes = recipes.filter(recipe => {
    if (filterCategory === 'all') return true;
    return recipe.category === filterCategory;
  });

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-screen bg-paper text-ink font-hand overflow-hidden flex-col md:flex-row">
        {/* Sidebar: Recipe Bookshelf (Hidden on mobile by default, shown if activeMobileTab is 'shelf') */}
        <aside className={`
            fixed inset-0 z-40 bg-white/95 backdrop-blur-sm flex flex-col transition-opacity duration-200
            md:relative md:w-64 md:flex md:inset-auto md:border-r md:border-gray-200 md:shadow-lg md:opacity-100 md:pointer-events-auto md:bg-white/80
            ${activeMobileTab === 'shelf' ? (activeId ? 'opacity-0 pointer-events-none' : 'opacity-100') : 'hidden md:flex'}
        `}>
          <SidebarDroppable>
            <div className="p-4 border-b border-gray-200 bg-orange-50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-orange-800">レシピ本棚</h2>
              {/* Mobile Only Close Button */}
              <button
                onClick={() => setActiveMobileTab('board')}
                className="md:hidden p-1 bg-white rounded-full text-gray-500 shadow-sm"
              >
                ✖
              </button>
            </div>

            {/* Tabs Container */}
            <div className="px-4 pb-2 bg-orange-50 pt-2">
              <div className="flex gap-1 bg-white/50 p-1 rounded-md mb-2">
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
                <button
                  onClick={() => setActiveTab('shopping')}
                  className={`flex-1 py-1 text-xs rounded-sm transition-colors ${activeTab === 'shopping' ? 'bg-pink-100 text-pink-700 font-bold shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  チラシ
                </button>
              </div>

              {/* Category Filter Chips (Only for My Recipes) */}
              {activeTab === 'my_recipes' && (
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    onClick={() => setFilterCategory('all')}
                    className={`px-2 py-0.5 text-[10px] rounded-full border whitespace-nowrap transition-colors ${filterCategory === 'all' ? 'bg-gray-700 text-white border-gray-700' : 'bg-white border-gray-200 text-gray-500'}`}
                  >
                    すべて
                  </button>
                  <button
                    onClick={() => setFilterCategory('main')}
                    className={`px-2 py-0.5 text-[10px] rounded-full border whitespace-nowrap transition-colors ${filterCategory === 'main' ? 'bg-red-100 text-red-700 border-red-200 font-bold' : 'bg-white border-gray-200 text-gray-500'}`}
                  >
                    主菜
                  </button>
                  <button
                    onClick={() => setFilterCategory('side')}
                    className={`px-2 py-0.5 text-[10px] rounded-full border whitespace-nowrap transition-colors ${filterCategory === 'side' ? 'bg-green-100 text-green-700 border-green-200 font-bold' : 'bg-white border-gray-200 text-gray-500'}`}
                  >
                    副菜
                  </button>
                  <button
                    onClick={() => setFilterCategory('soup')}
                    className={`px-2 py-0.5 text-[10px] rounded-full border whitespace-nowrap transition-colors ${filterCategory === 'soup' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 font-bold' : 'bg-white border-gray-200 text-gray-500'}`}
                  >
                    汁物
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 pb-24 md:pb-4">
              {!supabase && <p className="text-xs text-red-500">DB未接続</p>}

              {activeTab === 'my_recipes' && (
                <>
                  {filteredRecipes.map(recipe => (
                    <DraggableRecipe
                      key={recipe.id}
                      id={`recipe-${recipe.id}`}
                      name={recipe.name}
                      category={recipe.category}
                      onEdit={() => setEditingRecipe(recipe)}
                    />
                  ))}
                  {filteredRecipes.length === 0 && !loading && (
                    <p className="text-center text-gray-400 text-sm mt-10">
                      {filterCategory === 'all' ? 'レシピを追加してね' : 'このカテゴリのレシピはありません'}
                    </p>
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
                <div className="h-full">
                  <PatrolView onAddRecipe={handleAddRecipeFromPatrolUrl} />
                </div>
              )}

              {activeTab === 'shopping' && (
                <div className="h-full">
                  <FlyerAnalysisView
                    onAddRecipe={(recipe: Partial<Recipe>) => handleAddRecipeFromFlyerData(recipe)}
                    existingRecipes={recipes}
                  />
                </div>
              )}
            </div>

            {activeTab === 'my_recipes' && (
              <div className="p-4 bg-gray-50 border-t border-gray-200 pb-24 md:pb-4">
                <RecipeForm
                  onRecipeAdded={fetchRecipes}
                  isOpen={isRecipeFormOpen}
                  onOpenChange={setIsRecipeFormOpen}
                  initialUrl={recipeFormInitialUrl}
                  initialData={recipeFormInitialData}
                />
              </div>
            )}
          </SidebarDroppable>
        </aside>

        {/* Main: Weekly Board (Always visible on mobile now to allow drop, sitting behind sidebar) */}
        <main className="flex-1 flex flex-col relative w-full overflow-hidden">
          <div className="p-4 flex justify-between items-center bg-white/50 border-b border-gray-200">
            <h1 className="text-xl md:text-2xl font-bold text-ink">週間パレット 🎨</h1>
            <div className="flex gap-2">
              <button onClick={() => setStartDate(d => addDays(d, -7))} className="px-2 py-1 md:px-3 border rounded hover:bg-gray-100 text-xs md:text-sm">← 先週</button>
              <button onClick={() => setStartDate(d => addDays(d, 7))} className="px-2 py-1 md:px-3 border rounded hover:bg-gray-100 text-xs md:text-sm">来週 →</button>
            </div>
          </div>
          <WeeklyBoard
            startDate={startDate}
            plans={plans}
            daySettings={daySettings}
            onToggleDayType={handleToggleDayType}
            onDeletePlan={handleDeletePlan}
            onSoupGacha={handleSoupGacha}
          />
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-50 safe-area-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          <button
            onClick={() => setActiveMobileTab('board')}
            className={`flex flex-col items-center p-2 rounded-lg flex-1 ${activeMobileTab === 'board' ? 'text-orange-600 bg-orange-50' : 'text-gray-400'}`}
          >
            <span className="text-2xl">📅</span>
            <span className="text-[10px] font-bold mt-1">献立パレット</span>
          </button>
          <button
            onClick={() => setActiveMobileTab('shelf')}
            className={`flex flex-col items-center p-2 rounded-lg flex-1 ${activeMobileTab === 'shelf' ? 'text-orange-600 bg-orange-50' : 'text-gray-400'}`}
          >
            <span className="text-2xl">📚</span>
            <span className="text-[10px] font-bold mt-1">レシピ本棚</span>
          </button>
        </div>

      </div>

      <RecipeDetailModal
        recipe={editingRecipe}
        isOpen={!!editingRecipe}
        onClose={() => setEditingRecipe(null)}
        onUpdate={fetchRecipes}
      />

      <SoupGachaModal
        isOpen={!!gachaTargetDate}
        onClose={() => setGachaTargetDate(null)}
        onConfirm={handleGachaConfirm}
        recipes={recipes.filter(r => r.category === 'soup')}
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
