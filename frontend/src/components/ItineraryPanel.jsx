import { useState, forwardRef, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Reorder, motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Clock, MoreVertical, GripVertical, Coffee, Hotel, Camera, Bus, Calendar as CalendarIcon, MapPin, Footprints, Train, Car, Trash2 } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { format, addDays, differenceInDays } from 'date-fns';
import { recalculateDayTimeline } from '../utils/timeUtils';

// ... (Keep existing helpers) ...
// Use GripVertical for drag handle icon in imports

// Helper for Icons
const getCategoryIcon = (category) => {
    switch (category) {
        case 'food': return <Coffee size={20} />;
        case 'hotel': return <Hotel size={20} />;
        case 'scenic': return <Camera size={20} />;
        case 'transport': return <Bus size={20} />;
        default: return <MapPin size={20} />;
    }
};

const getTransportIcon = (mode) => {
    switch (mode) {
        case 'DRIVING': return <Car size={14} />;
        case 'TRANSIT': return <Bus size={14} />;
        case 'WALKING': return <Footprints size={14} />;
        default: return <Car size={14} />;
    }
};

// Custom Input for DatePicker
const CustomDateInput = forwardRef(({ value, onClick }, ref) => (
    <button
        className="flex items-center gap-2 px-3 py-2 bg-white border border-ink-border rounded-xl text-ink text-sm shadow-sm transition-colors hover:bg-surface-alt font-sans"
        onClick={onClick}
        ref={ref}
    >
        <CalendarIcon size={16} className="text-primary" />
        <span>{value || '選擇日期'}</span>
    </button>
));

// New Component to handle Drag Controls individually
const DraggableItineraryItem = ({ item, index, localItemsLength, draggedId, setDraggedId, handleDragEnd, onLocationFocus, onUpdateStayDuration, activeDay, onUpdateTransportMode, onRemoveItem }) => {
    const dragControls = useDragControls();

    return (
        <Reorder.Item
            value={item}
            className="relative mb-4"
            dragListener={false} // Disable default drag on whole item
            dragControls={dragControls}
            onDragStart={() => setDraggedId(item.id)}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, scale: 1, zIndex: 0 }}
            whileDrag={{ scale: 1.05, zIndex: 999 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            <div className={draggedId === item.id ? 'cursor-grabbing' : 'cursor-grab'}>
                {/* Pass controls to card so it can render the handle */}
                <ItineraryCard
                    item={item}
                    isDragging={draggedId === item.id}
                    onClick={() => onLocationFocus && onLocationFocus(item)}
                    onUpdateStayDuration={(id, val) => onUpdateStayDuration(activeDay, id, val)}
                    dragControls={dragControls}
                    onRemove={() => onRemoveItem && onRemoveItem(activeDay, item.id)}
                />
            </div>

            {index < localItemsLength - 1 && (
                <div className={`transition-opacity duration-200 ${draggedId === item.id ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
                    <TransportConnector
                        fromItem={item}
                        onChangeMode={(newMode) => onUpdateTransportMode(activeDay, item.id, newMode)}
                    />
                </div>
            )}
        </Reorder.Item>
    );
};

// ... (Keep TransportConnector) ...

// Modify ItineraryCard to accept dragControls and render handle
const ItineraryCard = ({ item, onClick, onUpdateStayDuration, isDragging, dragControls, onRemove }) => {
    // Generate a stable random rotation for natural feel
    const rotation = useRef(Math.random() * 2 - 1).current;

    // Animation Variants
    const animateDragging = {
        scale: 1.05,
        opacity: 1,
        rotate: 2,
        zIndex: 999,
        boxShadow: "0 15px 30px rgba(0,0,0,0.2)"
    };

    const animateNormal = {
        scale: 1,
        opacity: 1,
        y: 0,
        rotate: rotation,
        zIndex: 0,
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
    };

    const whileHoverAnim = {
        scale: 1.02,
        rotate: rotation + 1
    };

    const whileTapAnim = {
        scale: 0.98,
        rotate: rotation - 2
    };

    return (
        <div className="flex gap-4 relative">
            {/* Timeline ... (Keep existing) */}
            <div
                className={`flex flex-col items-center min-w-[60px] transition-opacity duration-200 ${isDragging ? 'opacity-0' : 'opacity-100'}`}
            >
                <span className="text-sm font-bold text-ink">
                    {item.calculatedStartTime?.split(' ')[0] || '--:--'}
                </span>
                <div className="flex-1 w-[2px] bg-ink-border my-1 relative" />
                <span className="text-xs text-ink-muted">
                    {item.calculatedEndTime?.split(' ')[0] || '--:--'}
                </span>
            </div>

            {/* Card Content */}
            <motion.div
                className="relative flex gap-4 p-4 bg-surface rounded-[2px] border border-ink-border shadow-paper flex-1"
                initial={{ opacity: 0, y: 20 }}
                animate={isDragging ? animateDragging : animateNormal}
                whileHover={whileHoverAnim}
                whileTap={whileTapAnim}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={onClick}
            >
                {/* Icon */}
                <div className="w-10 h-10 rounded-full bg-surface-alt text-primary flex items-center justify-center shrink-0">
                    {getCategoryIcon(item.category)}
                </div>

                <div className="flex-1">
                    <div className="flex justify-between mb-2">
                        <h3 className="text-base font-semibold text-ink m-0 pr-6">{item.title}</h3>
                        {/* Drag Handle */}
                        <div className="flex items-center absolute right-3 top-3">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove && onRemove();
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors mr-1"
                                title="移除地點"
                            >
                                <Trash2 size={14} />
                            </button>
                            <div
                                className="p-1.5 text-ink-muted cursor-grab touch-none"
                                onPointerDown={(e) => dragControls.start(e)}
                            >
                                <GripVertical size={18} />
                            </div>
                        </div>
                    </div>
                    {/* ... Rest of content ... */}
                    <div className="flex justify-between items-center text-sm text-ink-muted">
                        <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-xl text-xs font-medium">
                            {item.category}
                        </span>
                        {/* Duration Input */}
                        <div
                            className="flex items-center gap-1 text-xs text-ink-muted cursor-default"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Clock size={12} />
                            <span>停留</span>
                            <input
                                type="number"
                                value={item.stayDuration || 60}
                                onChange={(e) => onUpdateStayDuration && onUpdateStayDuration(item.id, e.target.value)}
                                className="w-10 border border-ink-border rounded p-0.5 text-center text-xs bg-surface"
                            />
                            <span>分</span>
                        </div>
                    </div>
                </div>
                <div className="tape-strip"></div>
            </motion.div>
        </div>
    );
};


// Memoize to prevent re-render when other items are dragged
const MemoizedItineraryCard = memo(ItineraryCard);

const TransportConnector = ({ fromItem, onChangeMode }) => {
    const modes = ['DRIVING', 'TRANSIT', 'WALKING'];
    const currentMode = fromItem.transportMode || 'DRIVING';

    const cycleMode = (e) => {
        e.stopPropagation();
        const currentIndex = modes.indexOf(currentMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        onChangeMode(nextMode);
    };

    return (
        <div className="pl-7 py-2 flex flex-col items-center relative text-ink-muted z-0">
            <div className="w-[2px] h-5 border-l-2 border-dashed border-ink-border mb-1" />
            <div
                className="flex items-center gap-1 text-xs bg-surface-alt px-2.5 py-0.5 rounded-xl cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={cycleMode}
                title="點擊切換交通方式"
            >
                {getTransportIcon(currentMode)}
                <span className="text-[0.7rem]">
                    {currentMode === 'DRIVING' ? '開車' : currentMode === 'WALKING' ? '步行' : '大眾運輸'}
                </span>
                {fromItem.duration && (
                    <span className="text-[0.7rem] opacity-70 ml-1">
                        ({fromItem.duration})
                    </span>
                )}
            </div>
            <div className="w-[2px] h-5 border-l-2 border-dashed border-ink-border mt-1" />
        </div>
    );
};

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
    onRemoveItem
}) {
    // Removed local dateRange state in favor of props
    // BUT we need local state for the DatePicker to be responsive during selection (before end date is picked)
    const [tempStartDate, setTempStartDate] = useState(startDate);
    const [tempEndDate, setTempEndDate] = useState(endDate);

    useEffect(() => {
        setTempStartDate(startDate);
        setTempEndDate(endDate);
    }, [startDate, endDate]);

    const [days, setDays] = useState([]);

    // Local State for Drag & Drop Performance
    const [localItems, setLocalItems] = useState([]);
    const [draggedId, setDraggedId] = useState(null);

    // Sync props to local state
    useEffect(() => {
        if (!draggedId) {
            setLocalItems(itineraryData[activeDay] || []);
        }
    }, [itineraryData, activeDay, draggedId]);

    // Handle Local Reorder
    const handleReorder = useCallback((newItems) => {
        setLocalItems(newItems);
    }, []);

    // Handle Drag End
    const handleDragEnd = useCallback(() => {
        setDraggedId(null);
        const reCalculated = recalculateDayTimeline(localItems, startTime || '09:00');
        setLocalItems(reCalculated);
        onUpdateItinerary(activeDay, reCalculated);
    }, [localItems, startTime, onUpdateItinerary, activeDay]);

    const [isAtBottom, setIsAtBottom] = useState(false);
    const [daysAtStart, setDaysAtStart] = useState(true);
    const [daysAtEnd, setDaysAtEnd] = useState(false);

    // Smooth Scroll Refs
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

    // Smooth Scroll - Timeline
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

    // Check scroll position
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

    // Generate days
    // We need a stable list of keys ("Day 1", "Day 2"...) that can be reordered.
    // The visual LABEL (1, 2, 3...) comes from the index in the reordered list.
    const [orderedDayKeys, setOrderedDayKeys] = useState([]);

    useEffect(() => {
        if (startDate && endDate) {
            const dayCount = differenceInDays(endDate, startDate) + 1;
            // When date range changes, we want to regenerate the keys if count differs significantly
            // or if initialization.
            // For simplicity, we regenerate if length doesn't match, preserving existing keys order if possible?
            // Actually, simplest is to reset if length changes to match new structure.
            // If user just swaps days, length is same, this won't trigger if dates don't change.
            // But if dates change, we probably reset order.

            setOrderedDayKeys(prev => {
                if (prev.length === dayCount) return prev; // Keep order if same length (e.g. date shift but same duration? uncertain)
                // Actually safer to reset specific to current range size
                return Array.from({ length: dayCount }, (_, i) => `Day ${i + 1}`);
            });

            // We still need the 'days' array for metadata like dateStr BUT
            // 'days' array usually maps 1-to-1 with indices.
            // calculatedDate = startDate + index.
        }
    }, [startDate, endDate]);

    // Handle Day Reorder
    const onDayReorder = (newOrder) => {
        setOrderedDayKeys(newOrder);
    };

    // When drag ends, we commit the change
    const onDayDragEnd = () => {
        if (onReorderDays) {
            onReorderDays(orderedDayKeys);
            // After backend update, the data associated with "Day 1" key will change (swap).
            // We typically want to reset the keys to natural order "Day 1", "Day 2" 
            // because "Day 1" (Key) is now intellectually "Day 1" (Visual) again.
            // However, if we reset immediately, we might flicker. 
            // Let's assume onReorderDays triggers a data refresh that might eventually reset this via parent props?
            // No, parent props startDate/endDate might not change.
            // So we should reset orderedDayKeys effectively to ["Day 1", "Day 2"...] 
            // BUT only after we are sure the data has swapped? 
            // Actually, if we just fire-and-forget, the UI stays as ["Day 2", "Day 1"].
            // "Day 2" key is in pos 0. "Day 2" data is content of old Day 2.
            // If backend swaps content: "Day 2" key now has old Day 1 content? 
            // Wait, backend logic: "Day 2" object renamed to "Day 1".
            // So `itineraryData["Day 1"]` now holds the Yangmingshan content.
            // `itineraryData["Day 2"]` now holds Taipei 101.
            // Our local `orderedDayKeys` is `["Day 2", "Day 1"]`.
            // Pos 0 renders Key "Day 2". It pulls `itineraryData["Day 2"]` (Taipei 101).
            // Pos 1 renders Key "Day 1". It pulls `itineraryData["Day 1"]` (Yangmingshan).
            // VISUAL: Pos 0 = Taipei 101. Pos 1 = Yangmingshan.
            // BEFORE SWAP: Pos 0 (Day 1) was Taipei 101.
            // RESULT: NO CHANGE visible!

            // FIX: We MUST reset orderedDayKeys to natural order after swap.
            // Because we renamed the underlying keys in the DB.

            setTimeout(() => {
                setOrderedDayKeys(prev => [...prev].sort((a, b) => {
                    // Sort by number "Day X"
                    const numA = parseInt(a.split(' ')[1]);
                    const numB = parseInt(b.split(' ')[1]);
                    return numA - numB;
                }));
            }, 200); // Small delay to allow backend update to proprietary propagate or just optimistic reset
        }
    };

    // Check days scroll
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
    }, [days]);

    // Wheel Listeners
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
    }, [days, localItems, activeDay]);

    return (
        <div className="h-full flex flex-col bg-transparent overflow-hidden">
            {/* Header */}
            <div className="py-4 bg-transparent flex justify-between items-center">
                <div className="flex flex-col">
                    <h2 className="font-serif text-xl leading-none">行程表</h2>
                    <span className="text-xs text-ink-muted">
                        {days.length} 天旅程
                    </span>
                </div>
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
                    />
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
                            onDragEnd={onDayDragEnd}
                            whileDrag={{ scale: 1.1 }}
                            className="shrink-0"
                        >
                            <button
                                onClick={() => onDayChange(dayKey)}
                                className={`
                                    w-16 h-16 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-200
                                    ${activeDay === dayKey
                                        ? 'bg-teal-50 border-2 border-primary text-primary shadow-md transform scale-105'
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
                <div className="max-w-[400px] mx-auto">
                    <div className="flex items-center justify-center gap-4 mb-6 border-b-2 border-secondary pb-2">
                        <h2 className="font-serif text-3xl text-ink m-0">
                            {days.find(d => d.id === activeDay)?.label || activeDay}
                        </h2>

                        {/* Start Time Picker */}
                        <div className="flex items-center gap-1 bg-surface-alt px-2 py-1 rounded-lg">
                            <span className="text-xs text-ink-muted font-semibold">出發</span>
                            <input
                                type="time"
                                value={startTime || '09:00'}
                                onChange={(e) => onUpdateStartTime(e.target.value)}
                                className="border-none bg-transparent font-sans text-sm font-semibold text-ink outline-none cursor-pointer"
                            />
                        </div>
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

                    {localItems.length > 0 && (
                        <div className="mt-8 text-center font-hand text-2xl text-ink-muted -rotate-2">
                            本日行程結束 ~
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
