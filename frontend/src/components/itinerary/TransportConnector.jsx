import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronUp, Info, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import { getTransportIcon } from './constants';
import TransitDetails from './TransitDetails';

const TransportConnector = ({ fromItem, toItem, onChangeMode }) => {
    const [showDetails, setShowDetails] = useState(false);
    const modes = ['DRIVING', 'TRANSIT', 'WALKING'];
    const currentMode = fromItem.transportMode || 'DRIVING';
    const hasTransitData = currentMode === 'TRANSIT' && fromItem.transitDetails && fromItem.transitDetails.length > 0;

    const cycleMode = (e) => {
        e.stopPropagation();
        const currentIndex = modes.indexOf(currentMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        onChangeMode(nextMode);
    };

    const handleNavigate = (e) => {
        e.stopPropagation();
        if (!toItem) return;

        const origin = `${fromItem.lat},${fromItem.lng}`;
        const destination = `${toItem.lat},${toItem.lng}`;
        const mode = currentMode.toLowerCase();

        let departureTime = '';
        if (fromItem.endDate) {
            const dateObj = new Date(fromItem.endDate);
            if (!isNaN(dateObj.getTime())) {
                const timestamp = Math.floor(dateObj.getTime() / 1000);
                const now = Math.floor(Date.now() / 1000);

                // Avoid past timestamps for driving mode as Google Maps defaults to current time
                if (mode === 'driving' && timestamp < now) {
                    toast('行程時間已過，將使用「現在出發」導航', { icon: '🚗' });
                } else {
                    departureTime = timestamp.toString();
                }
            }
        }

        let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${mode}`;

        if (departureTime) {
            url += `&departure_time=${departureTime}`;
        }

        window.open(url, '_blank');
    };

    return (
        <div className="pl-7 py-0 flex flex-col items-center relative text-ink-muted z-0">
            <div className="w-[2px] h-3 border-l-2 border-dashed border-ink-border mb-0.5" />
            <div className="flex flex-col items-center w-full">
                <div
                    className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-xl cursor-pointer transition-all shadow-sm ${currentMode === 'TRANSIT' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-surface-alt text-ink hover:bg-gray-200'}`}
                    onClick={cycleMode}
                    title="點擊切換交通方式"
                >
                    {getTransportIcon(currentMode)}
                    <span className="font-bold">
                        {currentMode === 'DRIVING' ? '開車' : currentMode === 'WALKING' ? '步行' : '大眾運輸'}
                    </span>
                    {fromItem.duration && (
                        <span className="text-[0.7rem] opacity-70">
                            ({fromItem.duration})
                        </span>
                    )}
                    {currentMode === 'TRANSIT' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowDetails(!showDetails);
                                if (!hasTransitData) {
                                    toast.error("正在獲取詳細乘車資訊或該路線不支援...");
                                }
                            }}
                            className={`ml-1 p-0.5 rounded-full transition-colors ${hasTransitData ? 'hover:bg-white/50 text-sky-600' : 'text-gray-300'}`}
                        >
                            {showDetails ? <ChevronUp size={14} /> : <Info size={14} />}
                        </button>
                    )}

                    {/* Navigation Button */}
                    <button
                        onClick={handleNavigate}
                        className="ml-1 p-0.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                        title="開啟 Google Maps 導航"
                    >
                        <Navigation size={12} fill="currentColor" className="opacity-80" />
                    </button>
                </div>

                <AnimatePresence>
                    {showDetails && currentMode === 'TRANSIT' && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden w-full flex flex-col items-center"
                        >
                            <TransitDetails
                                details={fromItem.transitDetails}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <div className="w-[2px] h-3 border-l-2 border-dashed border-ink-border mt-0.5" />
        </div>
    );
};

export default TransportConnector;
