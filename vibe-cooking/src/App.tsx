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
import { CoopImportModal } from './components/CoopImportModal';
import { SoupGachaModal } from './components/SoupGachaModal';
import { ShoppingCart } from 'lucide-react';


import type { Recipe, WeeklyPlanItem, DaySetting } from './types';

const SidebarDroppable = ({ children }: { children: React.ReactNode }) => {
  const { setNodeRef } = useDroppable({ id: 'sidebar-bookshelf' });
  return <div ref={setNodeRef} className="flex-1 flex flex-col h-full">{children}</div>;
};

function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [plans, setPlans] = useState<WeeklyPlanItem[]>([]);
  const [daySettings, setDaySettings] = useState<DaySetting[]>([]);
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

  const [isCoopImportOpen, setIsCoopImportOpen] = useState(false);

  // Load recipes from Supabase
  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('recipes')
      .select('*');
    if (error) console.error('Error fetching recipes:', error);
    else setRecipes(data || []);
  };

  const handleCoopImport = async (newRecipes: Recipe[]) => {
    if (newRecipes.length > 0) {
      if (!supabase) return;
      const { error } = await supabase.from('recipes').insert(newRecipes);
      if (error) {
        console.error('Error importing recipes:', error);
        alert(`Import failed! ${error.message}`);
      } else {
        setRecipes(prev => [...prev, ...newRecipes]);
        alert(`${newRecipes.length} items imported!`);
      }
    }
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

  const handleToday = () => {
    const today = new Date();
    setStartDate(isTuesday(today) ? today : previousTuesday(today));
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
      <div className="flex h-screen bg-white text-ink font-body overflow-hidden flex-col md:flex-row">
        {/* Sidebar: Recipe Bookshelf (Hidden on mobile by default, shown if activeMobileTab is 'shelf') */}
        <aside className={`
            fixed inset-0 z-40 bg-black/95 backdrop-blur-sm flex flex-col transition-opacity duration-200
            md:relative md:w-72 md:flex md:inset-auto md:border-r-4 md:border-black md:shadow-none md:opacity-100 md:pointer-events-auto md:bg-black text-white
            ${activeMobileTab === 'shelf' ? (activeId ? 'opacity-0 pointer-events-none' : 'opacity-100') : 'hidden md:flex'}
        `}>
          <SidebarDroppable>
            <div className="p-4 border-b-4 border-white/20 bg-black flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black italic tracking-tighter text-neon-yellow uppercase">Stock</h2>
                <button
                  onClick={() => setIsCoopImportOpen(true)}
                  className="p-1.5 bg-white text-black border-2 border-transparent hover:border-black hover:bg-neon-cyan transition-colors shadow-sm"
                  title="IMPORT CO-OP"
                >
                  <ShoppingCart size={16} strokeWidth={3} />
                </button>
              </div>
              {/* Mobile Only Close Button */}
              <button
                onClick={() => setActiveMobileTab('board')}
                className="md:hidden p-1 bg-white rounded-full text-black shadow-sm"
              >
                ✖
              </button>
            </div>

            {/* Tabs Container */}
            <div className="px-4 pb-4 bg-black pt-4">
              <div className="flex gap-2 bg-white/10 p-1 mb-4 border-2 border-white/20">
                <button
                  onClick={() => setActiveTab('my_recipes')}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'my_recipes' ? 'bg-neon-yellow text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  My
                </button>
                <button
                  onClick={() => setActiveTab('coop')}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'coop' ? 'bg-green-400 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  Co-op
                </button>
                <button
                  onClick={() => setActiveTab('buzz')}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'buzz' ? 'bg-purple-400 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  Buzz
                </button>

              </div>

              {/* Category Filter Chips (Only for My Recipes) */}
              {activeTab === 'my_recipes' && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    onClick={() => setFilterCategory('all')}
                    className={`px-3 py-1 text-[10px] font-bold border-2 whitespace-nowrap transition-colors ${filterCategory === 'all' ? 'bg-white text-black border-white' : 'bg-black border-white/30 text-gray-400'}`}
                  >
                    ALL
                  </button>
                  <button
                    onClick={() => setFilterCategory('main')}
                    className={`px-3 py-1 text-[10px] font-bold border-2 whitespace-nowrap transition-colors ${filterCategory === 'main' ? 'bg-red-500 text-white border-red-500' : 'bg-black border-red-900/50 text-red-900'}`}
                  >
                    MAIN
                  </button>
                  <button
                    onClick={() => setFilterCategory('side')}
                    className={`px-3 py-1 text-[10px] font-bold border-2 whitespace-nowrap transition-colors ${filterCategory === 'side' ? 'bg-green-500 text-black border-green-500' : 'bg-black border-green-900/50 text-green-900'}`}
                  >
                    SIDE
                  </button>
                  <button
                    onClick={() => setFilterCategory('soup')}
                    className={`px-3 py-1 text-[10px] font-bold border-2 whitespace-nowrap transition-colors ${filterCategory === 'soup' ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-black border-yellow-900/50 text-yellow-900'}`}
                  >
                    SOUP
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-600 pb-24 md:pb-4 bg-black">
              {!supabase && <p className="text-xs text-red-500 font-mono">DB DISCONNECTED</p>}

              {activeTab === 'my_recipes' && (
                <>
                  {filteredRecipes.map(recipe => (
                    <DraggableRecipe
                      key={recipe.id}
                      id={`recipe-${recipe.id}`}
                      name={recipe.name}
                      category={recipe.category}
                      rating={recipe.rating}
                      has_cooked={recipe.has_cooked}
                      is_hibernating={recipe.is_hibernating}
                      is_coop={recipe.is_coop}
                      cooking_type={recipe.cooking_type}
                      onEdit={() => setEditingRecipe(recipe)}
                    />
                  ))}
                  {filteredRecipes.length === 0 && (
                    <div className="text-center mt-10 p-8 border-4 border-dashed border-gray-800">
                      <p className="text-gray-600 font-black uppercase text-xl">NO DATA</p>
                      <p className="text-gray-700 text-xs mt-2">ADD NEW PROJECT</p>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'coop' && (
                <div className="text-center text-gray-500 mt-10 p-8 border-4 border-dashed border-gray-800">
                  <p className="text-4xl mb-4">🚚</p>
                  <p className="font-bold uppercase">CO-OP SYSTEM</p>
                  <button
                    onClick={() => setIsCoopImportOpen(true)}
                    className="mt-4 px-4 py-2 bg-neon-cyan text-black font-bold border-2 border-black shadow-brutal hover:bg-white hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all flex items-center gap-2 mx-auto"
                  >
                    <ShoppingCart size={16} />
                    IMPORT ORDER
                  </button>
                </div>
              )}

              {activeTab === 'buzz' && (
                <div className="h-full">
                  <PatrolView onAddRecipe={handleAddRecipeFromPatrolUrl} />
                </div>
              )}


            </div>

            {activeTab === 'my_recipes' && (
              <div className="p-4 bg-black border-t-4 border-white/10 pb-24 md:pb-4">
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
        <main className="flex-1 flex flex-col relative w-full overflow-hidden bg-white">
          <div className="p-4 flex justify-between items-center bg-neon-yellow border-b-4 border-black">
            <h1 className="text-3xl font-black italic tracking-tighter text-black uppercase transform -skew-x-12">WEEKLY PROJECT</h1>
            <div className="flex gap-2">
              <button onClick={() => setStartDate(d => addDays(d, -7))} className="px-3 py-1 border-2 border-black bg-white hover:bg-black hover:text-white font-bold transition-all shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">PREV</button>
              <button onClick={handleToday} className="px-3 py-1 border-2 border-black bg-white hover:bg-black hover:text-white font-bold transition-all shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">TODAY</button>
              <button onClick={() => setStartDate(d => addDays(d, 7))} className="px-3 py-1 border-2 border-black bg-white hover:bg-black hover:text-white font-bold transition-all shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">NEXT</button>
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
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t-4 border-neon-yellow flex justify-around p-2 z-50 safe-area-bottom">
          <button
            onClick={() => setActiveMobileTab('board')}
            className={`flex flex-col items-center p-2 rounded-none flex-1 ${activeMobileTab === 'board' ? 'text-neon-yellow bg-white/10' : 'text-gray-500'}`}
          >
            <span className="text-xl font-black">BOARD</span>
          </button>
          <button
            onClick={() => setActiveMobileTab('shelf')}
            className={`flex flex-col items-center p-2 rounded-none flex-1 ${activeMobileTab === 'shelf' ? 'text-neon-cyan bg-white/10' : 'text-gray-500'}`}
          >
            <span className="text-xl font-black">SHELF</span>
          </button>
        </div>

      </div>

      <RecipeDetailModal
        isOpen={!!editingRecipe}
        onClose={() => setEditingRecipe(null)}
        recipe={editingRecipe}
        onUpdate={fetchRecipes}
      />

      <CoopImportModal
        isOpen={isCoopImportOpen}
        onClose={() => setIsCoopImportOpen(false)}
        onImport={handleCoopImport}
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
