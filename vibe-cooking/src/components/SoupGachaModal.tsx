import { useState, useEffect } from 'react';
import { Dices, Sparkles, RefreshCw, Check } from 'lucide-react';
import type { Recipe } from '../types';

interface SoupGachaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (recipe: Recipe) => void;
    recipes: Recipe[];
}

export const SoupGachaModal = ({ isOpen, onClose, onConfirm, recipes }: SoupGachaModalProps) => {
    const [step, setStep] = useState<'ready' | 'spinning' | 'result'>('ready');
    const [displayRecipe, setDisplayRecipe] = useState<Recipe | null>(null);
    const [resultRecipe, setResultRecipe] = useState<Recipe | null>(null);
    const [isMisoMode, setIsMisoMode] = useState(false);
    const [activePool, setActivePool] = useState<Recipe[]>([]);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setStep('ready');
            setDisplayRecipe(null);
            setResultRecipe(null);
            setIsMisoMode(false);
        }
    }, [isOpen]);

    const handleStartGacha = () => {
        let candidates = recipes;
        if (isMisoMode) {
            candidates = recipes.filter(r =>
                r.name.includes('味噌') ||
                r.name.includes('みそ') ||
                r.name.includes('豚汁')
            );
        }

        if (candidates.length === 0) {
            alert(isMisoMode
                ? '「味噌」や「豚汁」のレシピが見つかりません！\nまずはレシピを追加してください。'
                : 'スープのレシピがありません！'
            );
            return;
        }

        setActivePool(candidates);
        setStep('spinning');
    };

    // Spinning Logic
    useEffect(() => {
        if (step === 'spinning' && activePool.length > 0) {
            const interval = setInterval(() => {
                const random = activePool[Math.floor(Math.random() * activePool.length)];
                setDisplayRecipe(random);
            }, 100);

            const timeout = setTimeout(() => {
                clearInterval(interval);
                // Final pick
                const final = activePool[Math.floor(Math.random() * activePool.length)];
                setResultRecipe(final);
                setDisplayRecipe(final);
                setStep('result');
            }, 2000); // multiple seconds of suspense

            return () => {
                clearInterval(interval);
                clearTimeout(timeout);
            };
        }
    }, [step, activePool]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden relative border-4 border-orange-200">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 z-10"
                >
                    ✖
                </button>

                <div className="p-8 flex flex-col items-center text-center">

                    {/* Header Image / Icon */}
                    <div className="mb-6 relative">
                        <div className={`
                            w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl shadow-lg
                            ${step === 'ready' ? (isMisoMode ? 'bg-amber-600' : 'bg-orange-400') : ''}
                            ${step === 'spinning' ? 'bg-orange-500 animate-spin' : ''}
                            ${step === 'result' ? 'bg-yellow-400 animate-bounce' : ''}
                        `}>
                            {step === 'ready' && <Dices size={48} />}
                            {step === 'spinning' && <Dices size={48} />}
                            {step === 'result' && <Sparkles size={48} />}
                        </div>
                    </div>

                    {/* Content based on Step */}
                    {step === 'ready' && (
                        <>
                            <h2 className="text-2xl font-bold text-orange-800 mb-2 font-hand">
                                {isMisoMode ? '味噌汁モードON！' : '今日はどのスープ？'}
                            </h2>
                            <p className="text-gray-500 mb-6">
                                {isMisoMode ? '温かいお味噌汁はいかが？' : 'ボタンを押してガチャを回そう！'}
                            </p>

                            {/* Miso Mode Toggle */}
                            <div className="mb-6 flex items-center justify-center gap-2 bg-orange-50 p-2 rounded-lg cursor-pointer" onClick={() => setIsMisoMode(!isMisoMode)}>
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${isMisoMode ? 'bg-amber-600' : 'bg-gray-300'}`}>
                                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${isMisoMode ? 'translate-x-4' : ''}`}></div>
                                </div>
                                <span className={`text-sm font-bold ${isMisoMode ? 'text-amber-800' : 'text-gray-500'}`}>
                                    味噌汁モード（みそ・豚汁限定）
                                </span>
                            </div>

                            <button
                                onClick={handleStartGacha}
                                className={`w-full text-white font-bold py-4 px-6 rounded-full shadow-lg transform transition active:scale-95 text-xl flex items-center justify-center gap-2
                                    ${isMisoMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-orange-500 hover:bg-orange-600'}
                                `}
                            >
                                <Dices /> ガチャを回す
                            </button>
                        </>
                    )}

                    {step === 'spinning' && (
                        <>
                            <h2 className="text-2xl font-bold text-orange-600 mb-2 font-hand animate-pulse">
                                抽選中...
                            </h2>
                            <div className="h-16 flex items-center justify-center">
                                <span className="text-xl font-bold text-gray-700">
                                    {displayRecipe?.name || "..."}
                                </span>
                            </div>
                        </>
                    )}

                    {step === 'result' && resultRecipe && (
                        <>
                            <p className="text-orange-500 font-bold mb-1">決定！今日のスープは...</p>
                            <h2 className="text-3xl font-bold text-ink mb-6 font-hand leading-tight">
                                {resultRecipe.name}
                            </h2>

                            <div className="flex flex-col gap-3 w-full">
                                <button
                                    onClick={() => onConfirm(resultRecipe)}
                                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl shadow-md transform transition active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Check /> これにする！
                                </button>
                                <button
                                    onClick={() => setStep('ready')}
                                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={18} /> もう一回
                                </button>
                            </div>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
};
