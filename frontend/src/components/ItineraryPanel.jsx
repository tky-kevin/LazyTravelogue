import { useState, forwardRef, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Reorder, motion, AnimatePresence } from 'framer-motion';
import { Clock, MoreVertical, Coffee, Hotel, Camera, Bus, Calendar as CalendarIcon, MapPin, Footprints, Train, Car } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { format, addDays, differenceInDays } from 'date-fns';
import { recalculateDayTimeline } from '../utils/timeUtils';

// Helper: Get Icon by Category
const getCategoryIcon = (category) => {
    switch (category) {
        case 'Transport':
        case '交通': return <Bus size={18} />;

        case 'Sightseeing':
        case '觀光': return <Camera size={18} />;

        case 'Shopping':
        case '購物': return <Coffee size={18} />;

        case 'Dining':
        case '餐飲': return <Hotel size={18} />;

        default: return <MapPin size={18} />;
    }
};

// Helper: Get Icon by Mode
const getTransportIcon = (mode, size = 14) => {
    switch (mode) {
        case 'WALKING': return <Footprints size={size} />;
        case 'TRANSIT': return <Train size={size} />;
        case 'DRIVING': default: return <Car size={size} />;
    }
};


// Mock Transport Calculator
const getTransport = (from, to) => {
    if (!from || !to) return null;
    const isLongDistance = from.id === 'loc-1' && to.id === 'loc-3';
    return {
        mode: isLongDistance ? 'Subway' : 'Walk',
        duration: isLongDistance ? '25 mins' : '10 mins'
    };
};

// Custom Input for DatePicker
const CustomDateInput = forwardRef(({ value, onClick }, ref) => (
    <button className="date-picker-custom-input" onClick={onClick} ref={ref}>
        <CalendarIcon size={16} className="text-primary" />
        <span>{value || '選擇日期'}</span>
    </button>
));

const ItineraryCard = ({ item, onClick, onUpdateStayDuration, isDragging }) => {
    const rotation = useRef(Math.random() * 2 - 1).current;

    // Memoize animation objects to prevent recreation on every render
    const animateDragging = useMemo(() => ({
        scale: 1.05,
        opacity: 1,
        rotate: 2,
        boxShadow: "0 15px 30px rgba(0,0,0,0.2)",
    }), []);

    const animateNormal = useMemo(() => ({
        scale: 1,
        opacity: 1,
        y: 0,
        rotate: rotation,
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    }), [rotation]);

    const whileHoverAnim = useMemo(() => ({
        scale: 1.03,
        rotate: rotation + 1
    }), [rotation]);

    const whileTapAnim = useMemo(() => ({
        scale: 0.98,
        rotate: rotation - 2
    }), [rotation]);

    return (
        <div style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
            {/* Timeline Left - Hide when dragging */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: '60px',
                opacity: isDragging ? 0 : 1,
                transition: 'opacity 0.2s'
            }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--pk-text-main)' }}>
                    {item.calculatedStartTime?.split(' ')[0] || '--:--'}
                </span>

                {/* Vertical Line */}
                <div style={{ flex: 1, width: '2px', background: 'var(--pk-border)', margin: '4px 0', position: 'relative' }}>
                    {/* Optional: Add dot or marker */}
                </div>

                <span style={{ fontSize: '0.75rem', color: 'var(--pk-text-muted)' }}>
                    {item.calculatedEndTime?.split(' ')[0] || '--:--'}
                </span>
            </div>

            {/* Card Content */}
            <motion.div
                className="itinerary-card"
                initial={{ opacity: 0, y: 20 }}
                animate={isDragging ? animateDragging : animateNormal}
                whileHover={whileHoverAnim}
                whileTap={whileTapAnim}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                style={{
                    cursor: isDragging ? 'grabbing' : 'grab',
                    flex: 1,
                    background: 'var(--pk-surface)',
                    transition: 'box-shadow 0.2s ease'
                }}
                onClick={onClick}
            >
                <div className="card-icon-wrapper">
                    {getCategoryIcon(item.category)}
                </div>

                <div className="card-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--pk-text-main)', margin: 0 }}>{item.title}</h3>
                        <MoreVertical size={16} color="var(--pk-text-muted)" style={{ cursor: 'pointer' }} />
                    </div>

                    {/* Meta & Duration Control */}
                    <div className="card-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="card-tag">
                            {item.category}
                        </span>

                        {/* Stay Duration Input */}
                        <div
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--pk-text-muted)' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Clock size={12} />
                            <span>停留</span>
                            <input
                                type="number"
                                value={item.stayDuration || 60}
                                onChange={(e) => onUpdateStayDuration && onUpdateStayDuration(item.id, e.target.value)}
                                style={{
                                    width: '40px',
                                    border: '1px solid var(--pk-border)',
                                    borderRadius: '4px',
                                    padding: '2px',
                                    textAlign: 'center',
                                    fontSize: '0.8rem',
                                    background: 'var(--pk-surface)'
                                }}
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
        <div className="transport-connector" style={{ paddingLeft: '28px' }}> {/* Indent to align with card content */}
            <div className="connector-line" style={{ marginBottom: '4px' }} />
            <div
                className="connector-badge"
                onClick={cycleMode}
                style={{ cursor: 'pointer' }}
                title="點擊切換交通方式"
            >
                {getTransportIcon(currentMode)}
                <span style={{ fontSize: '0.7rem' }}>
                    {currentMode === 'DRIVING' ? '開車' : currentMode === 'WALKING' ? '步行' : '大眾運輸'}
                </span>
                {fromItem.duration && (
                    <span style={{ fontSize: '0.7rem', opacity: 0.7, marginLeft: '4px' }}>
                        ({fromItem.duration})
                    </span>
                )}
            </div>
            <div className="connector-line" style={{ marginTop: '4px' }} />
        </div>
    );
};

export default function ItineraryPanel({ activeDay, onDayChange, itineraryData, onUpdateItinerary, onLocationFocus, onUpdateTransportMode, startTime, onUpdateStartTime, onUpdateStayDuration }) {
    const [dateRange, setDateRange] = useState([new Date(), addDays(new Date(), 4)]);
    const [startDate, endDate] = dateRange;
    const [days, setDays] = useState([]);

    // Local State for Drag & Drop Performance
    // We initialize it from props, but update it locally during interaction
    const [localItems, setLocalItems] = useState([]);
    const [draggedId, setDraggedId] = useState(null);

    // Sync props to local state (only when not dragging to avoid conflict)
    useEffect(() => {
        if (!draggedId) {
            setLocalItems(itineraryData[activeDay] || []);
        }
    }, [itineraryData, activeDay, draggedId]);

    // Handle Local Reorder (Fast Update) - Memoized for stable reference
    const handleReorder = useCallback((newItems) => {
        // During drag: ONLY update order, do NOT recalculate timeline
        // This prevents re-render conflicts that cause jump effect
        setLocalItems(newItems);
    }, []);

    // Handle Drag End (Commit to Parent/Map) - Memoized for stable reference
    const handleDragEnd = useCallback(() => {
        setDraggedId(null);
        // NOW recalculate timeline after drag is complete
        const reCalculated = recalculateDayTimeline(localItems, startTime || '09:00');
        setLocalItems(reCalculated);
        // Commit the final order and calculated state to parent
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
            container.scrollLeft = current + (target - current) * 0.3; // Reduced inertia
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
            container.scrollTop = current + (target - current) * 0.3; // Reduced inertia
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
    useEffect(() => {
        if (startDate && endDate) {
            const dayCount = differenceInDays(endDate, startDate) + 1;
            const newDays = Array.from({ length: dayCount }, (_, i) => {
                const date = addDays(startDate, i);
                return {
                    id: `Day ${i + 1}`,
                    label: `${i + 1}`,
                    dateStr: format(date, 'M/d')
                };
            });
            setDays(newDays);
            // We don't reset activeDay here to avoid jumping if props update
        }
    }, [startDate, endDate]);

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
        <div className="itinerary-panel">
            {/* Header */}
            <div className="itinerary-header">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h2 className="font-serif" style={{ fontSize: '1.25rem', lineHeight: 1 }}>行程表</h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--pk-text-muted)' }}>
                        {days.length} 天旅程
                    </span>
                </div>
                <div style={{ position: 'relative', zIndex: 20 }}>
                    <DatePicker
                        selectsRange={true}
                        startDate={startDate}
                        endDate={endDate}
                        onChange={(update) => setDateRange(update)}
                        customInput={<CustomDateInput />}
                        dateFormat="M/d"
                    />
                </div>
            </div>

            {/* Days List */}
            <div
                ref={daysListRef}
                className="days-list no-scrollbar"
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
                {days.map(day => (
                    <button
                        key={day.id}
                        onClick={() => onDayChange(day.id)}
                        className={`day-button ${activeDay === day.id ? 'active' : 'inactive'}`}
                    >
                        <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{day.label}</span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>{day.dateStr}</span>
                    </button>
                ))}
            </div>

            {/* Timeline */}
            <div
                ref={timelineRef}
                className="itinerary-timeline"
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
                <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--pk-secondary)', paddingBottom: '0.5rem' }}>
                        <h2 className="font-serif" style={{
                            fontSize: '1.75rem',
                            color: 'var(--pk-text-main)',
                            margin: 0
                        }}>
                            {days.find(d => d.id === activeDay)?.label || activeDay}
                        </h2>

                        {/* Start Time Picker */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--pk-surface-alt)', padding: '4px 8px', borderRadius: '8px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--pk-text-muted)', fontWeight: 600 }}>出發</span>
                            <input
                                type="time"
                                value={startTime || '09:00'}
                                onChange={(e) => onUpdateStartTime(e.target.value)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontFamily: 'var(--font-sans)',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    color: 'var(--pk-text-main)',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
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
                                style={{ listStyle: 'none', padding: 0 }}
                            >
                                {localItems.map((item, index) => (
                                    <Reorder.Item
                                        key={item.id}
                                        value={item}
                                        style={{ position: 'relative', marginBottom: '1rem' }}
                                        onDragStart={() => setDraggedId(item.id)}
                                        onDragEnd={handleDragEnd}
                                        // No 'layout' prop - prevents jump effect during drag
                                        // Reorder.Group handles reordering animations internally
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1, scale: 1, zIndex: 0 }}
                                        whileDrag={{ scale: 1.05, zIndex: 999 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div
                                            style={{ cursor: draggedId === item.id ? 'grabbing' : 'grab' }}
                                        >
                                            <MemoizedItineraryCard
                                                item={item}
                                                isDragging={draggedId === item.id}
                                                onClick={() => onLocationFocus && onLocationFocus(item)}
                                                onUpdateStayDuration={(id, val) => onUpdateStayDuration(activeDay, id, val)}
                                            />
                                        </div>

                                        {index < localItems.length - 1 && (
                                            <div style={{
                                                pointerEvents: draggedId ? 'none' : 'auto',
                                                opacity: draggedId === item.id ? 0 : 1,
                                                transition: 'opacity 0.2s'
                                            }}>
                                                <TransportConnector
                                                    fromItem={item}
                                                    onChangeMode={(newMode) => onUpdateTransportMode(activeDay, item.id, newMode)}
                                                />
                                            </div>
                                        )}
                                    </Reorder.Item>
                                ))}
                            </Reorder.Group>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                style={{
                                    textAlign: 'center',
                                    padding: '2rem',
                                    color: 'var(--pk-text-muted)',
                                    fontStyle: 'italic'
                                }}
                            >
                                這一天還沒有計畫。<br />
                                <span style={{ fontSize: '0.8rem' }}>點擊地圖添加景點！</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {localItems.length > 0 && (
                        <div style={{
                            marginTop: '2rem',
                            textAlign: 'center',
                            fontFamily: 'var(--font-hand)',
                            fontSize: '1.5rem',
                            color: 'var(--pk-text-muted)',
                            transform: 'rotate(-2deg)'
                        }}>
                            本日行程結束 ~
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
