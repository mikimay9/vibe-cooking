import { useState } from 'react';
import { ShoppingCart, X, Check, ArrowRight, AlertCircle, Zap, Flame, Package } from 'lucide-react';
import type { Recipe } from '../types';

interface CoopImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (recipes: Recipe[]) => void;
}

type ImportStep = 'input' | 'verify';

interface ParsedItem {
    id: string;
    name: string;
    cooking_type: 'renchin' | 'cook' | 'none';
    quantity: number;
    category: 'main' | 'side' | 'soup';
}

export const CoopImportModal = ({ isOpen, onClose, onImport }: CoopImportModalProps) => {
    const [step, setStep] = useState<ImportStep>('input');
    const [text, setText] = useState('');
    const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);

    if (!isOpen) return null;

    const parseText = (inputText: string) => {
        const lines = inputText.split('\n');
        const items: ParsedItem[] = [];

        let currentName = '';
        let currentQuantity = 1;

        // Simple state machine or just iterating blocks?
        // Let's assume standard format block:
        // 商品名：xxx
        // ...
        // 数量：x点

        // Actually, regex across lines might be hard with line-by-line.
        // Let's try block parsing or just keeping state.

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const nameMatch = line.match(/^商品名[:：]\s*(.*)/);
            if (nameMatch) {
                currentName = nameMatch[1].trim();
                currentQuantity = 1; // reset default

                // Look ahead for quantity in next few lines? 
                // Or just continue parsing and push when next Item starts?
                // Complication: Email format might be variable.
                // Let's try to find quantity in the *same block*.
                // We'll scan forward until next "商品名" or end of text.

                for (let j = i + 1; j < lines.length; j++) {
                    const subLine = lines[j].trim();
                    if (subLine.match(/^商品名[:：]/)) break; // Next item started

                    const qtyMatch = subLine.match(/^数量[:：]\s*(\d+)/);
                    if (qtyMatch) {
                        currentQuantity = parseInt(qtyMatch[1], 10);
                        break;
                    }
                }

                let type: 'renchin' | 'cook' | 'none' = 'none';
                if (currentName.includes('レンジ') || currentName.includes('チン') || currentName.includes('即食')) {
                    type = 'renchin';
                } else if (currentName.includes('フライ') || currentName.includes('カツ') || currentName.includes('焼') || currentName.includes('炒め') || currentName.includes('煮')) {
                    type = 'cook';
                }

                items.push({
                    id: crypto.randomUUID(),
                    name: currentName,
                    cooking_type: type,
                    quantity: currentQuantity,
                    category: 'main' // Default to main
                });
            }
        }
        return items;
    };

    const handleNext = () => {
        if (!text.trim()) return;
        const items = parseText(text);
        if (items.length === 0) {
            alert('商品名が見つかりませんでした。\n「商品名：」で始まる行が含まれているか確認してください。');
            return;
        }
        setParsedItems(items);
        setStep('verify');
    };

    const handleTypeChange = (id: string, type: 'renchin' | 'cook' | 'none') => {
        setParsedItems(prev => prev.map(item =>
            item.id === id ? { ...item, cooking_type: type } : item
        ));
    };

    const handleQuantityChange = (id: string, delta: number) => {
        setParsedItems(prev => prev.map(item =>
            item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
        ));
    };

    const handleCategoryChange = (id: string, cat: 'main' | 'side' | 'soup') => {
        setParsedItems(prev => prev.map(item =>
            item.id === id ? { ...item, category: cat } : item
        ));
    };

    const handleConfirmImport = () => {
        const recipes: Recipe[] = parsedItems.map(item => ({
            id: item.id,
            name: item.name,
            url: '',
            frequency: 'none',
            child_rating: 3,
            memo: 'CO-OP Import',
            category: item.category,
            ingredients: [],
            work_duration: item.cooking_type === 'renchin' ? 5 : 20,
            arrangements: [],
            rating: 1,
            has_cooked: false,
            is_hibernating: false,
            is_coop: true,
            cooking_type: item.cooking_type === 'none' ? 'cook' : item.cooking_type,
            quantity: item.quantity
        }));
        onImport(recipes);

        setText('');
        setParsedItems([]);
        setStep('input');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white border-4 border-black shadow-brutal w-full max-w-2xl relative animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <button
                    onClick={onClose}
                    className="absolute -top-4 -right-4 bg-neon-pink text-white border-2 border-black w-10 h-10 flex items-center justify-center hover:bg-black transition-colors shadow-brutal z-10"
                >
                    <X size={24} strokeWidth={3} />
                </button>

                <div className="bg-neon-cyan p-4 border-b-4 border-black flex items-center gap-3 shrink-0">
                    <ShoppingCart size={32} strokeWidth={3} />
                    <h2 className="text-2xl font-black italic tracking-tighter">CO-OP IMPORT</h2>
                    <div className="ml-auto flex items-center gap-2 text-xs font-bold">
                        <span className={`px-2 py-1 border-2 border-black ${step === 'input' ? 'bg-black text-white' : 'bg-white opacity-50'}`}>1. PASTE</span>
                        <ArrowRight size={16} />
                        <span className={`px-2 py-1 border-2 border-black ${step === 'verify' ? 'bg-black text-white' : 'bg-white opacity-50'}`}>2. VERIFY</span>
                    </div>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {step === 'input' ? (
                        <div className="space-y-4">
                            <p className="font-bold text-sm">CO-OPの注文確認メール全文を貼り付けてください。<br />「商品名：」と「数量：」を自動検出します。</p>
                            <textarea
                                className="w-full h-64 p-4 border-2 border-black font-mono text-xs resize-none focus:outline-none focus:shadow-[4px_4px_0px_0px_#000] transition-shadow bg-gray-50"
                                placeholder={`注文番号：000209\n商品名：骨取りさばの味噌煮（レンジ）\n数量：2点\n...`}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="font-bold text-sm flex items-center gap-2">
                                <AlertCircle size={16} />
                                {parsedItems.length} 件検出しました。数量と調理タイプを確認してください。
                            </p>
                            <div className="space-y-2">
                                {parsedItems.map(item => (
                                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 border-2 border-dashed border-gray-300 bg-gray-50">
                                        <div className="flex-1 min-w-0">
                                            <span className="font-bold text-sm break-words">{item.name}</span>
                                            {/* Category Selector */}
                                            <div className="flex gap-1 mt-1">
                                                <button
                                                    onClick={() => handleCategoryChange(item.id, 'main')}
                                                    className={`px-2 py-0.5 text-[10px] font-bold border border-black ${item.category === 'main' ? 'bg-red-500 text-white' : 'bg-white text-gray-400'}`}
                                                >
                                                    MAIN
                                                </button>
                                                <button
                                                    onClick={() => handleCategoryChange(item.id, 'side')}
                                                    className={`px-2 py-0.5 text-[10px] font-bold border border-black ${item.category === 'side' ? 'bg-green-500 text-black' : 'bg-white text-gray-400'}`}
                                                >
                                                    SIDE
                                                </button>
                                                <button
                                                    onClick={() => handleCategoryChange(item.id, 'soup')}
                                                    className={`px-2 py-0.5 text-[10px] font-bold border border-black ${item.category === 'soup' ? 'bg-yellow-400 text-black' : 'bg-white text-gray-400'}`}
                                                >
                                                    SOUP
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 shrink-0">
                                            {/* Quantity Control */}
                                            <div className="flex items-center border-2 border-black bg-white">
                                                <button
                                                    onClick={() => handleQuantityChange(item.id, -1)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 font-bold border-r-2 border-black"
                                                >
                                                    -
                                                </button>
                                                <span className="w-8 text-center font-black text-sm">{item.quantity}</span>
                                                <button
                                                    onClick={() => handleQuantityChange(item.id, 1)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 font-bold border-l-2 border-black"
                                                >
                                                    +
                                                </button>
                                            </div>

                                            {/* Type Control */}
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleTypeChange(item.id, 'renchin')}
                                                    className={`px-3 py-1 flex items-center justify-center border-2 border-black transition-colors ${item.cooking_type === 'renchin' ? 'bg-yellow-400 text-black' : 'bg-white text-gray-400'}`}
                                                    title="RANGE"
                                                >
                                                    <Zap size={16} fill={item.cooking_type === 'renchin' ? "currentColor" : "none"} />
                                                </button>
                                                <button
                                                    onClick={() => handleTypeChange(item.id, 'cook')}
                                                    className={`px-3 py-1 flex items-center justify-center border-2 border-black transition-colors ${item.cooking_type === 'cook' ? 'bg-red-500 text-white' : 'bg-white text-gray-400'}`}
                                                    title="COOK"
                                                >
                                                    <Flame size={16} fill={item.cooking_type === 'cook' ? "currentColor" : "none"} />
                                                </button>
                                                <button
                                                    onClick={() => handleTypeChange(item.id, 'none')}
                                                    className={`px-3 py-1 flex items-center justify-center border-2 border-black transition-colors ${item.cooking_type === 'none' ? 'bg-gray-500 text-white' : 'bg-white text-gray-400'}`}
                                                    title="OTHER"
                                                >
                                                    <Package size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t-4 border-black bg-gray-100 flex justify-end gap-2 shrink-0">
                    {step === 'input' ? (
                        <>
                            <button onClick={onClose} className="px-6 py-2 border-2 border-black font-bold hover:bg-white transition-colors">CANCEL</button>
                            <button onClick={handleNext} className="px-6 py-2 bg-black text-white border-2 border-black font-bold hover:bg-neon-green hover:text-black transition-all shadow-brutal flex items-center gap-2">
                                NEXT <ArrowRight size={16} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setStep('input')} className="px-6 py-2 border-2 border-black font-bold hover:bg-white transition-colors">BACK</button>
                            <button onClick={handleConfirmImport} className="px-6 py-2 bg-neon-yellow text-black border-2 border-black font-bold hover:bg-white transition-all shadow-brutal flex items-center gap-2">
                                <Check size={16} />
                                CONFIRM & IMPORT
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
