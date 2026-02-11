import { useState } from 'react';
import { ShoppingCart, Upload, X } from 'lucide-react';

interface CoopImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (text: string) => void;
}

export const CoopImportModal = ({ isOpen, onClose, onImport }: CoopImportModalProps) => {
    const [text, setText] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (text.trim()) {
            onImport(text);
            setText('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white border-4 border-black shadow-brutal w-full max-w-lg relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute -top-4 -right-4 bg-neon-pink text-white border-2 border-black w-10 h-10 flex items-center justify-center hover:bg-black transition-colors shadow-brutal z-10"
                >
                    <X size={24} strokeWidth={3} />
                </button>

                <div className="bg-neon-cyan p-4 border-b-4 border-black flex items-center gap-3">
                    <ShoppingCart size={32} strokeWidth={3} />
                    <h2 className="text-2xl font-black italic tracking-tighter">CO-OP IMPORT</h2>
                </div>

                <div className="p-6 space-y-4">
                    <p className="font-bold text-sm">CO-OPの注文履歴を貼り付けてください。<br />品名と調理方法（レンチン/要調理）を自動抽出します。</p>

                    <textarea
                        className="w-full h-40 p-4 border-2 border-black font-mono text-sm resize-none focus:outline-none focus:shadow-[4px_4px_0px_0px_#000] transition-shadow bg-gray-50"
                        placeholder={`例：\n骨取りさばの味噌煮（レンジ）\n豚肉と野菜のスタミナ炒め（要調理）`}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 border-2 border-black font-bold hover:bg-gray-100 transition-colors"
                        >
                            CANCEL
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-6 py-2 bg-black text-white border-2 border-black font-bold hover:bg-neon-green hover:text-black transition-all shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center gap-2"
                        >
                            <Upload size={18} />
                            IMPORT
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
