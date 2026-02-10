import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift } from 'lucide-react';

interface GachaButtonProps {
    onClick: () => void;
}

export const GachaButton = ({ onClick }: GachaButtonProps) => {
    const [isSpinning, setIsSpinning] = useState(false);

    const handleClick = () => {
        setIsSpinning(true);
        // Simulate slot machine spin duration
        setTimeout(() => {
            setIsSpinning(false);
            onClick();
        }, 800);
    };

    return (
        <button
            onClick={handleClick}
            disabled={isSpinning}
            className={`relative w-full h-full min-h-[40px] flex items-center justify-center border-2 border-dashed transition-all overflow-hidden
                ${isSpinning ? 'border-neon-pink bg-neon-pink text-white border-solid' : 'border-gray-300 text-gray-400 hover:border-neon-pink hover:text-neon-pink'}
            `}
            title="GACHA"
        >
            <AnimatePresence mode='wait'>
                {!isSpinning && (
                    <motion.div
                        key="idle"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="flex items-center font-bold tracking-widest text-xs"
                    >
                        <Gift size={18} className="mr-2" /> GACHA
                    </motion.div>
                )}
                {isSpinning && (
                    <motion.div
                        key="spinning"
                        className="flex flex-col items-center justify-center absolute inset-0"
                    >
                        <motion.div
                            animate={{ y: [0, -100] }}
                            transition={{ repeat: Infinity, duration: 0.1, ease: "linear" }}
                            className="flex flex-col items-center text-xs font-black"
                        >
                            <span>SOUP</span>
                            <span>★</span>
                            <span>???</span>
                            <span>HIT</span>
                            <span>SOUP</span>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Flash Effect */}
            {isSpinning && (
                <motion.div
                    className="absolute inset-0 bg-white"
                    animate={{ opacity: [0, 0.5, 0] }}
                    transition={{ repeat: Infinity, duration: 0.2 }}
                />
            )}
        </button>
    );
};
