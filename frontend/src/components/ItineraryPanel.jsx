import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Reorder, motion, AnimatePresence } from 'framer-motion';
import { Clock, Sparkles } from 'lucide-react';
import DatePicker from 'react-datepicker';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import { useItinerary } from '../context/ItineraryContext';
import { recalculateDayTimeline } from '../utils/timeUtils';
import { optimizeRoute } from '../utils/optimizationUtils';

// Sub-components
import { CustomDateInput } from './itinerary/constants';
import TimeSelector from './itinerary/TimeSelector';
import { DraggableItineraryItem } from './itinerary/ItineraryCard';


export default function ItineraryPanel({
    activeDay,
    onDayChange,
    itineraryData,
    startDate,
    endDate,
    onUpdateDateRange,
    onUpdateItinerary,
    onLocationFocus,
    onUpdateTransportMode,
    startTime,
    onUpdateStartTime,
    onUpdateStayDuration,
    onReorderDays,
    onRemoveItem,
    currentItineraryTitle,
    onUpdateItineraryTitle,
    days = [],
    activeDayLabel,
    pocketList = [],
    onMoveFromPocket,
    onAddLocation, // reuse or add a special one for pocket?
    itineraryId,
    readOnly = false
}) {
    const { showPocket, setShowPocket } = useItinerary();
    const [tempStartDate, setTempStartDate] = useState(startDate);
    const [tempEndDate, setTempEndDate] = useState(endDate);
    const [localTitle, setLocalTitle] = useState(currentItineraryTitle || "");

    useEffect(() => {
        setTempStartDate(startDate);
        setTempEndDate(endDate);
    }, [startDate, endDate]);

    useEffect(() => {
        setLocalTitle(currentItineraryTitle || "");
    }, [currentItineraryTitle]);

    // Local state for smooth drag & drop
    const [localItems, setLocalItems] = useState([]);
    const [draggedId, setDraggedId] = useState(null);

    useEffect(() => {
        if (!draggedId) {
            setLocalItems(itineraryData[activeDay] || []);
        }
    }, [itineraryData, activeDay, draggedId]);

    const handleReorder = useCallback((newItems) => {
        setLocalItems(newItems);
    }, []);

    const [isAtBottom, setIsAtBottom] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [daysAtStart, setDaysAtStart] = useState(true);
    const [daysAtEnd, setDaysAtEnd] = useState(false);

    // Scroll state management
    const daysListRef = useRef(null);
    const scrollTarget = useRef(0);
    const isAnimating = useRef(false);

    const smoothScroll = () => {
        if (!daysListRef.current) return;
        const container = daysListRef.current;
        const current = container.scrollLeft;
        const target = scrollTarget.current;

        if (Math.abs(target - current) > 1) {
            container.scrollLeft = current + (target - current) * 0.3;
            requestAnimationFrame(smoothScroll);
        } else {
            isAnimating.current = false;
        }
    };

    const timelineRef = useRef(null);
    const timelineScrollTarget = useRef(0);
    const isTimelineAnimating = useRef(false);

    const smoothTimelineScroll = () => {
        if (!timelineRef.current) return;
        const container = timelineRef.current;
        const current = container.scrollTop;
        const target = timelineScrollTarget.current;

        if (Math.abs(target - current) > 1) {
            container.scrollTop = current + (target - current) * 0.3;
            requestAnimationFrame(smoothTimelineScroll);
        } else {
            isTimelineAnimating.current = false;
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (timelineRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = timelineRef.current;
                const isBottom = scrollHeight <= clientHeight || (scrollHeight - clientHeight - scrollTop) <= 5;
                setIsAtBottom(isBottom);
            }
        }, 50);
        return () => clearTimeout(timer);
    }, [localItems, activeDay]);

    // Day management logic
    const [orderedDayKeys, setOrderedDayKeys] = useState([]);

    useEffect(() => {
        if (days && days.length > 0) {
            const dayIds = days.map(d => d.id);
            const isSame = dayIds.length === orderedDayKeys.length &&
                dayIds.every((id, idx) => id === orderedDayKeys[idx]);

            if (!isSame) {
                setOrderedDayKeys(dayIds);
            }
        }
    }, [days]);

    const onDayReorder = (newOrder) => {
        setOrderedDayKeys(newOrder);
    };

    const onDayDragEnd = () => {
        if (onReorderDays) {
            onReorderDays(orderedDayKeys);
        }
    };

    useEffect(() => {
        const checkDaysScroll = () => {
            if (daysListRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = daysListRef.current;
                setDaysAtStart(scrollLeft <= 5);
                setDaysAtEnd((scrollWidth - clientWidth - scrollLeft) <= 5);
            }
        };
        const timer = setTimeout(checkDaysScroll, 50);
        return () => clearTimeout(timer);
    }, [orderedDayKeys]);

    const activeDayIndex = orderedDayKeys.indexOf(activeDay);
    const currentDayDate = activeDayIndex >= 0 ? addDays(startDate, activeDayIndex) : startDate;
    const currentDayDateStr = useMemo(() => format(currentDayDate, 'yyyy-MM-dd'), [currentDayDate]);

    const handleDragEnd = useCallback(() => {
        setDraggedId(null);
        const reCalculated = recalculateDayTimeline(localItems, startTime || '09:00', currentDayDateStr);
        setLocalItems(reCalculated);
        onUpdateItinerary(activeDay, reCalculated);
    }, [localItems, startTime, onUpdateItinerary, activeDay, currentDayDateStr]);

    useEffect(() => {
        if (!draggedId) {
            const rawItems = itineraryData[activeDay] || [];
            const corrected = recalculateDayTimeline(rawItems, startTime || '09:00', currentDayDateStr);
            setLocalItems(corrected);
        }
    }, [itineraryData, activeDay, draggedId, startTime, currentDayDateStr]);

    // Custom wheel scroll handling
    useEffect(() => {
        const daysContainer = daysListRef.current;
        const timelineContainer = timelineRef.current;

        const handleDaysWheel = (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                if (!isAnimating.current) scrollTarget.current = daysContainer.scrollLeft;
                scrollTarget.current += e.deltaY;
                const maxScroll = daysContainer.scrollWidth - daysContainer.clientWidth;
                scrollTarget.current = Math.max(0, Math.min(scrollTarget.current, maxScroll));
                if (!isAnimating.current) {
                    isAnimating.current = true;
                    requestAnimationFrame(smoothScroll);
                }
            }
        };

        const handleTimelineWheel = (e) => {
            if (e.target.closest('[data-time-selector]')) return;
            if (e.deltaY !== 0) {
                e.preventDefault();
                if (!isTimelineAnimating.current) timelineScrollTarget.current = timelineContainer.scrollTop;
                timelineScrollTarget.current += e.deltaY;
                const maxScroll = timelineContainer.scrollHeight - timelineContainer.clientHeight;
                timelineScrollTarget.current = Math.max(0, Math.min(timelineScrollTarget.current, maxScroll));
                if (!isTimelineAnimating.current) {
                    isTimelineAnimating.current = true;
                    requestAnimationFrame(smoothTimelineScroll);
                }
            }
        };

        if (daysContainer) daysContainer.addEventListener('wheel', handleDaysWheel, { passive: false });
        if (timelineContainer) timelineContainer.addEventListener('wheel', handleTimelineWheel, { passive: false });

        return () => {
            if (daysContainer) daysContainer.removeEventListener('wheel', handleDaysWheel);
            if (timelineContainer) timelineContainer.removeEventListener('wheel', handleTimelineWheel);
        };
    }, [orderedDayKeys, localItems, activeDay]);

    const handleOptimize = async () => {
        if (localItems.length <= 2) {
            toast('景點太少，無需排序', { icon: '🤔' });
            return;
        }

        const promise = optimizeRoute(localItems);

        toast.promise(promise, {
            loading: '正在計算最佳路徑 (Google Maps)...',
            success: (newOrder) => {
                const reCalculated = recalculateDayTimeline(newOrder, startTime || '09:00', currentDayDateStr);
                setLocalItems(reCalculated);
                onUpdateItinerary(activeDay, reCalculated);
                return '行程已依交通時間最佳化！';
            },
            error: (err) => `無法最佳化: ${err.message}`
        });
    };

    const handleUpdateItemContent = (itemId, updates) => {
        const newItems = localItems.map(item =>
            item.id === itemId ? { ...item, ...updates } : item
        );
        const reCalculated = recalculateDayTimeline(newItems, startTime || '09:00', currentDayDateStr);
        setLocalItems(reCalculated);
        onUpdateItinerary(activeDay, reCalculated);
    };

    return (
        <div className="h-full flex flex-col bg-transparent overflow-hidden">
            {/* Header */}
            <div className="py-4 px-4 sm:px-6 bg-transparent flex justify-between items-center">
                <div className="flex flex-col flex-1 mr-4">
                    <input
                        className="font-sans text-xl leading-none bg-transparent border-b border-transparent focus:border-ink-border focus:bg-surface-alt/50 transition-all outline-none text-ink placeholder-ink-muted/50 w-full px-1 -ml-1 rounded"
                        value={localTitle}
                        onChange={(e) => {
                            setLocalTitle(e.target.value);
                            onUpdateItineraryTitle(e.target.value);
                        }}
                        placeholder="點擊輸入行程名稱..."
                        readOnly={readOnly}
                    />
                    <span className="text-xs text-ink-muted">
                        {orderedDayKeys.length} 天旅程 • {pocketList.length} 個收藏
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative z-20">
                        <DatePicker
                            selectsRange={true}
                            startDate={tempStartDate}
                            endDate={tempEndDate}
                            onChange={(update) => {
                                const [start, end] = update;
                                setTempStartDate(start);
                                setTempEndDate(end);

                                if (start && end) {
                                    onUpdateDateRange(start, end);
                                }
                            }}
                            customInput={<CustomDateInput />}
                            dateFormat="M/d"
                            portalId="root"
                            popperPlacement="bottom-end"
                            popperClassName="datepicker-portal"
                            readOnly={readOnly}
                        />
                    </div>
                    <button
                        onClick={handleOptimize}
                        className="p-2 text-amber-500 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors border border-amber-200 shadow-sm"
                        title="根據交通時間自動排序"
                    >
                        <Sparkles size={16} />
                    </button>
                </div>
            </div>

            {/* Days List */}
            <Reorder.Group
                axis="x"
                values={orderedDayKeys}
                onReorder={onDayReorder}
                ref={daysListRef}
                className="flex gap-3 px-4 py-3 bg-transparent overflow-x-auto no-scrollbar list-none"
                style={{
                    maskImage: `linear-gradient(to right, ${daysAtStart ? 'black' : 'transparent'}, black 20px, black calc(100% - 20px), ${daysAtEnd ? 'black' : 'transparent'})`,
                    WebkitMaskImage: `linear-gradient(to right, ${daysAtStart ? 'black' : 'transparent'}, black 20px, black calc(100% - 20px), ${daysAtEnd ? 'black' : 'transparent'})`,
                }}
                onScroll={(e) => {
                    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
                    setDaysAtStart(scrollLeft <= 5);
                    setDaysAtEnd((scrollWidth - clientWidth - scrollLeft) <= 5);
                }}
            >
                {orderedDayKeys.map((dayKey, index) => {
                    // Display Label is purely based on Current Index
                    const label = `${index + 1}`;
                    const date = addDays(startDate, index);
                    const dateStr = format(date, 'M/d');

                    return (
                        <Reorder.Item
                            key={dayKey}
                            value={dayKey}
                            layout
                            onDragEnd={onDayDragEnd}
                            whileDrag={{
                                scale: 1.15,
                                zIndex: 50
                            }}
                            animate={{
                                scale: activeDay === dayKey ? 1.05 : 1,
                                zIndex: activeDay === dayKey ? 10 : 1
                            }}
                            transition={{ type: "spring", stiffness: 500, damping: 30, mass: 1 }}
                            className="shrink-0 list-none rounded-full"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            <button
                                onClick={() => onDayChange(dayKey)}
                                onPointerDown={() => onDayChange(dayKey)} // Set focus immediately on touch/click
                                className={`
                                    w-16 h-16 rounded-full flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 outline-none select-none touch-none
                                    ${activeDay === dayKey
                                        ? 'bg-teal-50 border-2 border-primary text-primary shadow-md'
                                        : 'bg-slate-100 border-2 border-transparent text-ink-muted hover:bg-slate-200'}
                                `}
                            >
                                <span className="text-xl font-bold">{label}</span>
                                <span className="text-xs opacity-80">{dateStr}</span>
                            </button>
                        </Reorder.Item>
                    );
                })}
            </Reorder.Group>

            {/* Timeline */}
            <div
                ref={timelineRef}
                className="flex-1 overflow-y-auto py-6 bg-transparent"
                style={{
                    maskImage: isAtBottom
                        ? 'linear-gradient(to bottom, transparent, black 40px, black 100%)'
                        : 'linear-gradient(to bottom, transparent, black 40px, black calc(100% - 40px), transparent)',
                    WebkitMaskImage: isAtBottom
                        ? 'linear-gradient(to bottom, transparent, black 40px, black 100%)'
                        : 'linear-gradient(to bottom, transparent, black 40px, black calc(100% - 40px), transparent)',
                }}
                onScroll={(e) => {
                    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                    setIsAtBottom((scrollHeight - clientHeight - scrollTop) <= 5);
                }}
            >
                <div className="max-w-[400px] mx-auto px-4 sm:px-0">
                    {/* Start Time Picker - Custom UI */}
                    <div className="flex justify-center mb-6 relative z-30">
                        {/* Trigger Button */}
                        <div
                            className={`relative flex items-center gap-2 bg-white border shadow-sm px-4 py-2 rounded-full transition-all cursor-pointer group w-fit ${showTimePicker ? 'border-primary ring-2 ring-primary/10' : 'border-gray-200 hover:border-primary/30'}`}
                            onClick={() => setShowTimePicker(!showTimePicker)}
                        >
                            <Clock size={16} className={`transition-colors group-hover:scale-110 duration-300 ${showTimePicker ? 'text-primary' : 'text-primary/70'}`} />
                            <span className="text-sm text-gray-500 font-medium">出發時間</span>
                            <div className="w-[1px] h-3 bg-gray-200 mx-1"></div>
                            <span className="font-sans text-sm font-bold text-gray-800 w-[45px] text-center">
                                {startTime || '09:00'}
                            </span>
                        </div>

                        {/* Custom Time Picker Popover */}
                        <AnimatePresence>
                            {showTimePicker && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowTimePicker(false)} />
                                    <TimeSelector
                                        value={startTime}
                                        onChange={(val) => onUpdateStartTime(val)}
                                        onClose={() => setShowTimePicker(false)}
                                    />
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    <AnimatePresence mode='wait'>
                        {localItems.length > 0 ? (
                            <Reorder.Group
                                axis="y"
                                values={localItems}
                                onReorder={handleReorder}
                                layoutScroll
                                className="list-none p-0"
                            >
                                {localItems.map((item, index) => (
                                    <DraggableItineraryItem
                                        key={item.id}
                                        item={item}
                                        nextItem={localItems[index + 1]}
                                        index={index}
                                        localItemsLength={localItems.length}
                                        draggedId={draggedId}
                                        setDraggedId={setDraggedId}
                                        handleDragEnd={handleDragEnd}
                                        onLocationFocus={onLocationFocus}
                                        onUpdateStayDuration={onUpdateStayDuration}
                                        activeDay={activeDay}
                                        onUpdateTransportMode={onUpdateTransportMode}
                                        onRemoveItem={onRemoveItem}
                                        onUpdateItemContent={handleUpdateItemContent}
                                        readOnly={readOnly}
                                    />
                                ))}
                            </Reorder.Group>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center p-8 text-ink-muted italic"
                            >
                                這一天還沒有計畫。<br />
                                <span className="text-xs">點擊地圖添加景點！</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

        </div>
    );
}
