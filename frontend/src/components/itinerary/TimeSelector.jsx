import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const TimeSelector = ({ value, onChange, onClose }) => {
    const [selectedHours, setSelectedHours] = useState(() => (value || '09:00').split(':')[0]);
    const [selectedMinutes, setSelectedMinutes] = useState(() => (value || '09:00').split(':')[1]);
    const hoursRef = useRef(null);
    const minutesRef = useRef(null);
    const scrollTimeoutRef = useRef(null);

    const hrs = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const mins = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    useEffect(() => {
        if (hoursRef.current) {
            const el = hoursRef.current.querySelector(`[data-value="${selectedHours}"]`);
            if (el) el.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
        if (minutesRef.current) {
            const el = minutesRef.current.querySelector(`[data-value="${selectedMinutes}"]`);
            if (el) el.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
    }, [selectedHours, selectedMinutes]);

    const ITEM_HEIGHT = 32;

    const handleHoursScroll = () => {
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            if (!hoursRef.current) return;

            const scrollTop = hoursRef.current.scrollTop;
            const nearestIndex = Math.round(scrollTop / ITEM_HEIGHT);
            const clampedIndex = Math.max(0, Math.min(hrs.length - 1, nearestIndex));
            const nearestHour = hrs[clampedIndex];
            const targetScrollTop = clampedIndex * ITEM_HEIGHT;

            if (Math.abs(scrollTop - targetScrollTop) > 1) {
                hoursRef.current.scrollTop = targetScrollTop;
            }

            if (nearestHour !== selectedHours) {
                setSelectedHours(nearestHour);
                onChange(`${nearestHour}:${selectedMinutes}`);
            }
        }, 100);
    };

    const handleMinutesScroll = () => {
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            if (!minutesRef.current) return;

            const scrollTop = minutesRef.current.scrollTop;
            const nearestIndex = Math.round(scrollTop / ITEM_HEIGHT);
            const clampedIndex = Math.max(0, Math.min(mins.length - 1, nearestIndex));
            const nearestMinute = mins[clampedIndex];
            const targetScrollTop = clampedIndex * ITEM_HEIGHT;

            if (Math.abs(scrollTop - targetScrollTop) > 1) {
                minutesRef.current.scrollTop = targetScrollTop;
            }

            if (nearestMinute !== selectedMinutes) {
                setSelectedMinutes(nearestMinute);
                onChange(`${selectedHours}:${nearestMinute}`);
            }
        }, 100);
    };

    const handleHoursWheel = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (hoursRef.current) {
            const direction = Math.sign(e.deltaY);
            const currentIndex = hrs.indexOf(selectedHours);
            const newIndex = Math.max(0, Math.min(hrs.length - 1, currentIndex + direction));
            const newHour = hrs[newIndex];

            hoursRef.current.scrollTop = newIndex * ITEM_HEIGHT;

            if (newHour !== selectedHours) {
                setSelectedHours(newHour);
                onChange(`${newHour}:${selectedMinutes}`);
            }
        }
    };

    const handleMinutesWheel = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (minutesRef.current) {
            const direction = Math.sign(e.deltaY);
            const currentIndex = mins.indexOf(selectedMinutes);
            const newIndex = Math.max(0, Math.min(mins.length - 1, currentIndex + direction));
            const newMinute = mins[newIndex];

            minutesRef.current.scrollTop = newIndex * ITEM_HEIGHT;

            if (newMinute !== selectedMinutes) {
                setSelectedMinutes(newMinute);
                onChange(`${selectedHours}:${newMinute}`);
            }
        }
    };

    const handleContainerWheel = (e) => {
        e.stopPropagation();
    };

    const handleHourClick = (h) => {
        setSelectedHours(h);
        onChange(`${h}:${selectedMinutes}`);
        const el = hoursRef.current?.querySelector(`[data-value="${h}"]`);
        if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };

    const handleMinuteClick = (m) => {
        setSelectedMinutes(m);
        onChange(`${selectedHours}:${m}`);
        const el = minutesRef.current?.querySelector(`[data-value="${m}"]`);
        if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: 10, x: '-50%' }}
            className="absolute top-full mt-2 left-1/2 bg-white border border-gray-100 shadow-2xl rounded-2xl p-4 z-50 w-64 flex flex-col gap-3 select-none"
            onWheel={handleContainerWheel}
            data-time-selector="true"
        >
            <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                <span className="text-xs font-bold text-gray-400">設定時間</span>
                <span className="text-sm font-black text-primary">{selectedHours}:{selectedMinutes}</span>
            </div>

            <div className="flex h-48 gap-2 relative">
                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-8 bg-surface-alt rounded-lg -z-10 pointer-events-none" />

                <div
                    className="flex-1 overflow-y-scroll no-scrollbar text-center"
                    ref={hoursRef}
                    onScroll={handleHoursScroll}
                    onWheel={handleHoursWheel}
                    style={{ paddingTop: 80, paddingBottom: 80 }}
                >
                    {hrs.map(h => (
                        <div
                            key={h}
                            data-value={h}
                            onClick={() => handleHourClick(h)}
                            className={`h-8 flex items-center justify-center cursor-pointer transition-colors ${h === selectedHours ? 'text-lg font-bold text-primary' : 'text-sm text-gray-300 hover:text-gray-500'}`}
                        >
                            {h}
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-center font-bold text-gray-300">:</div>

                <div
                    className="flex-1 overflow-y-scroll no-scrollbar text-center"
                    ref={minutesRef}
                    onScroll={handleMinutesScroll}
                    onWheel={handleMinutesWheel}
                    style={{ paddingTop: 80, paddingBottom: 80 }}
                >
                    {mins.map(m => (
                        <div
                            key={m}
                            data-value={m}
                            onClick={() => handleMinuteClick(m)}
                            className={`h-8 flex items-center justify-center cursor-pointer transition-colors ${m === selectedMinutes ? 'text-lg font-bold text-primary' : 'text-sm text-gray-300 hover:text-gray-500'}`}
                        >
                            {m}
                        </div>
                    ))}
                </div>
            </div>

            <button
                onClick={onClose}
                className="w-full py-2 bg-primary/10 text-primary font-bold rounded-xl text-xs hover:bg-primary/20 transition-colors"
            >
                完成
            </button>
        </motion.div>
    );
};

export default TimeSelector;
