import { useState, forwardRef, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Reorder, motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Clock, MoreVertical, GripVertical, Coffee, Hotel, Camera, Bus, Calendar as CalendarIcon, MapPin, Footprints, Train, Car, Trash2, Bookmark, X, Plus, Info, ChevronDown, ChevronUp, Sparkles, Navigation, Pencil, Check, Palmtree, ShoppingBag, Utensils, Share2 } from 'lucide-react';
import DatePicker from 'react-datepicker';
import toast from 'react-hot-toast';
import { format, addDays, differenceInDays } from 'date-fns';
import { useItinerary } from '../context/ItineraryContext';
import { recalculateDayTimeline } from '../utils/timeUtils';
import { optimizeRoute } from '../utils/optimizationUtils';
import client from '../api/client';


const getTransportIcon = (mode) => {
    switch (mode) {
        case 'DRIVING': return <Car size={14} />;
        case 'TRANSIT': return <Bus size={14} />;
        case 'WALKING': return <Footprints size={14} />;
        default: return <Car size={14} />;
    }
};

const CATEGORY_OPTIONS = [
    { id: 'food', label: '美食', icon: Utensils, bg: 'bg-rose-50', text: 'text-rose-600/80', border: 'border-rose-100' },
    { id: 'scenic', label: '景點', icon: Camera, bg: 'bg-sky-50', text: 'text-sky-600/80', border: 'border-sky-100' },
    { id: 'hotel', label: '住宿', icon: Hotel, bg: 'bg-indigo-50', text: 'text-indigo-600/80', border: 'border-indigo-100' },
    { id: 'shopping', label: '購物', icon: ShoppingBag, bg: 'bg-emerald-50', text: 'text-emerald-600/80', border: 'border-emerald-100' },
    { id: 'other', label: '其他', icon: MapPin, bg: 'bg-slate-50', text: 'text-slate-600/80', border: 'border-slate-100' },
];

const getCategoryConfig = (catId) => CATEGORY_OPTIONS.find(c => c.id === catId) || CATEGORY_OPTIONS[4]; // Default to Other

// Custom Input for DatePicker
const CustomDateInput = forwardRef(({ value, onClick }, ref) => (
    <button
        className="group flex items-center gap-2.5 px-4 py-2 bg-white/50 backdrop-blur-sm border border-ink-border rounded-2xl text-ink text-sm shadow-sm transition-all hover:bg-white hover:border-primary/30 hover:shadow-md active:scale-95 font-sans"
        onClick={onClick}
        ref={ref}
    >
        <CalendarIcon size={16} className="text-primary transition-transform group-hover:scale-110" />
        <span className="font-medium">{value || '選擇日期'}</span>
    </button>
));

// New Component to handle Drag Controls individually
const DraggableItineraryItem = ({ item, nextItem, index, localItemsLength, draggedId, setDraggedId, handleDragEnd, onLocationFocus, onUpdateStayDuration, activeDay, onUpdateTransportMode, onRemoveItem, onUpdateItemContent, readOnly }) => {
    const dragControls = useDragControls();

    return (
        <Reorder.Item
            value={item}
            className="relative mb-1"
            dragListener={!readOnly} // Disable default drag on whole item
            dragControls={dragControls}
            onDragStart={() => !readOnly && setDraggedId(item.id)}
            onDragEnd={() => !readOnly && handleDragEnd()}
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
                    onUpdateContent={(updates) => onUpdateItemContent(item.id, updates)}
                    readOnly={readOnly}
                />
            </div>

            {index < localItemsLength - 1 && (
                <div className={`transition-opacity duration-200 ${draggedId === item.id ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
                    <TransportConnector
                        fromItem={item}
                        toItem={nextItem}
                        onChangeMode={(newMode) => onUpdateTransportMode(activeDay, item.id, newMode)}
                    />
                </div>
            )}
        </Reorder.Item>
    );
};



// Modify ItineraryCard to accept dragControls and render handle
const ItineraryCard = ({ item, onClick, onUpdateStayDuration, isDragging, dragControls, onRemove, onUpdateContent, readOnly }) => {
    // Generate a stable random rotation for natural feel
    const rotation = useRef(Math.random() * 2 - 1).current;

    // State
    const [isEditing, setIsEditing] = useState(false);
    const [editValues, setEditValues] = useState({
        title: item.title,
        description: item.description || '',
        category: item.category
    });

    useEffect(() => {
        setEditValues({
            title: item.title,
            description: item.description || '',
            category: item.category
        });
    }, [item.title, item.description, item.category]);

    const handleSave = (e) => {
        e.stopPropagation();
        onUpdateContent(editValues);
        setIsEditing(false);
    };

    const handleCancel = (e) => {
        e.stopPropagation();
        setEditValues({
            title: item.title,
            description: item.description || '',
            category: item.category
        });
        setIsEditing(false);
    };

    const handleGoogleNav = (e) => {
        e.stopPropagation();
        const url = `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}&query_place_id=${item.placeId}`;
        window.open(url, '_blank');
    };

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

    const catConfig = getCategoryConfig(isEditing ? editValues.category : item.category);
    const CatIcon = catConfig.icon;

    return (
        <div className="flex gap-2 relative">
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
                className="relative flex gap-3 p-3 bg-surface rounded-[2px] border border-ink-border shadow-paper flex-1 group"
                initial={{ opacity: 0, y: 20 }}
                animate={isDragging ? animateDragging : animateNormal}
                whileHover={!isEditing && !readOnly ? whileHoverAnim : {}}
                whileTap={!isEditing && !readOnly ? whileTapAnim : {}}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={!isEditing && !readOnly ? onClick : undefined}
            >
                {/* Icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${catConfig.bg} ${catConfig.text} ${catConfig.border}`}>
                    <CatIcon size={16} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                        {isEditing ? (
                            <input
                                value={editValues.title}
                                onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                className="font-semibold text-base text-ink bg-white border border-primary rounded px-2 py-0.5 w-full mr-12 focus:ring-2 ring-primary/20 outline-none"
                                placeholder="景點名稱"
                                autoFocus
                            />
                        ) : (
                            <h3 className="text-base font-semibold text-ink m-0 pr-0 truncate max-w-[160px] sm:max-w-[180px]" title={item.title}>
                                {item.title}
                            </h3>
                        )}

                        {/* Actions */}
                        <div className="flex items-center absolute right-3 top-3 gap-1">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={handleSave}
                                        className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-full transition-colors"
                                        title="儲存"
                                    >
                                        <Check size={14} strokeWidth={3} />
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                                        title="取消"
                                    >
                                        <X size={14} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={handleGoogleNav}
                                        className="hidden group-hover:block p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                                        title="Google Map 查看"
                                    >
                                        <Navigation size={14} />
                                    </button>
                                    {!readOnly && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                                                className="hidden group-hover:block p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-full transition-colors"
                                                title="編輯資訊"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRemove && onRemove();
                                                }}
                                                className="hidden group-hover:block p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
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
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Meta & Controls */}
                    <div className="space-y-3">
                        {/* Category & Duration Row */}
                        <div className="flex items-center gap-3 text-sm text-ink-muted">
                            {isEditing ? (
                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                    {CATEGORY_OPTIONS.map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setEditValues({ ...editValues, category: opt.id })}
                                            className={`p-1.5 rounded-lg border transition-all ${editValues.category === opt.id ? `${opt.bg} ${opt.text} border-current` : 'bg-white border-transparent hover:bg-gray-50'}`}
                                            title={opt.label}
                                        >
                                            <opt.icon size={14} />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <span className={`px-2 py-0.5 rounded-xl text-xs font-medium ${catConfig.bg} ${catConfig.text}`}>
                                    {catConfig.label}
                                </span>
                            )}

                            {/* Duration Input */}
                            <div
                                className="flex items-center gap-1 text-xs text-ink-muted cursor-default ml-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Clock size={12} />
                                <span>停留</span>
                                {readOnly ? (
                                    <span className="w-10 text-center text-xs font-medium px-0.5">{item.stayDuration || 60}</span>
                                ) : (
                                    <input
                                        type="number"
                                        value={item.stayDuration || 60}
                                        onChange={(e) => onUpdateStayDuration && onUpdateStayDuration(item.id, e.target.value)}
                                        className="w-10 border border-ink-border rounded p-0.5 text-center text-xs bg-surface focus:border-primary outline-none"
                                    />
                                )}
                                <span>分</span>
                            </div>
                        </div>

                        {/* Description / Notes */}
                        {(isEditing || item.description) && (
                            <div onClick={e => e.stopPropagation()} className="w-full">
                                {isEditing ? (
                                    <textarea
                                        value={editValues.description}
                                        onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                                        className="w-full text-xs p-2 rounded border border-ink-border bg-white focus:ring-1 focus:ring-primary outline-none resize-none min-h-[60px]"
                                        placeholder="添加筆記或備註..."
                                    />
                                ) : (
                                    <p className="text-xs text-ink-muted/80 leading-relaxed bg-surface-alt/50 p-2 rounded border border-transparent">
                                        {item.description}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="tape-strip"></div>
            </motion.div>
        </div>
    );
};


// Memoize to prevent re-render when other items are dragged
const MemoizedItineraryCard = memo(ItineraryCard);

const TransitDetails = ({ details }) => {
    const hasData = details && details.length > 0;

    if (!hasData) {
        return (
            <div className="mt-2 w-full max-w-[360px] bg-white/95 backdrop-blur-md border border-ink-border rounded-xl p-6 shadow-xl text-center">
                <p className="text-[14px] text-ink-muted italic font-medium">正在獲取或查無大眾運輸詳細資訊。</p>
            </div>
        );
    }

    return (
        <div className="mt-2 w-full max-w-[400px] bg-white/95 backdrop-blur-md border border-ink-border rounded-xl p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500 overflow-hidden">
            {details && details.length > 0 && (
                <div className="space-y-6 relative">
                    <p className="text-[13px] font-black text-primary mb-5 uppercase tracking-[0.15em] border-b-2 border-primary/10 pb-2 flex justify-between items-center">
                        <span>目前建議路線</span>
                        <Info size={16} className="text-primary/70" />
                    </p>

                    {/* Visual Timeline Path - carefully constrained */}
                    <div className="absolute left-[24px] top-[60px] bottom-[30px] w-[2px] border-l-2 border-dashed border-ink-border/40 z-0" />

                    {details.map((step, idx) => (
                        <div key={idx} className="flex gap-5 items-start relative z-10">
                            {/* Icon Indicator */}
                            <div className="shrink-0">
                                {step.type === 'TRANSIT' ? (
                                    <div
                                        className="w-12 h-12 rounded-[18px] flex items-center justify-center text-white font-black text-[14px] shadow-lg ring-4 ring-white"
                                        style={{ backgroundColor: step.color || '#3b82f6' }}
                                    >
                                        {step.line}
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 rounded-[18px] bg-surface-alt border border-ink-border/50 flex items-center justify-center text-ink-muted shadow-md ring-4 ring-white">
                                        <Footprints size={24} />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0 pt-0.5">
                                {step.type === 'TRANSIT' ? (
                                    <>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col">
                                                <span className="text-[16px] font-black text-ink leading-tight">{step.vehicle} {step.line}</span>
                                                <span className="text-[12px] text-ink-muted font-black mt-1">往 {step.arrivalStop}</span>
                                            </div>
                                            <div className="flex flex-col items-end shrink-0">
                                                <span className="text-[16px] text-primary font-black">{step.departureTime}</span>
                                                <span className="text-[10px] text-primary/70 font-black uppercase">發車</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[12px] text-ink-muted bg-surface-alt p-2.5 rounded-xl border border-ink-border/20 shadow-sm">
                                            <MapPin size={14} className="text-primary/60" />
                                            <span className="truncate font-bold">{step.departureStop}</span>
                                        </div>
                                        {step.numStops > 0 && (
                                            <div className="text-[11px] text-primary font-black mt-2.5 flex items-center gap-2 bg-primary/5 px-3.5 py-1.5 rounded-full w-fit border border-primary/10">
                                                <Clock size={12} />
                                                <span>途經 {step.numStops} 站 • {step.arrivalTime} 抵達</span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="py-2.5">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-[15px] font-black text-ink">步行 {step.duration}</span>
                                            <span className="text-[12px] text-ink-muted font-bold">({step.distance})</span>
                                        </div>
                                        <p className="text-[13px] text-ink-muted italic leading-relaxed font-bold opacity-80" dangerouslySetInnerHTML={{ __html: step.instruction }} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}


        </div>
    );
};

const TimeSelector = ({ value, onChange, onClose }) => {
    // Use local state to make UI reactive
    const [selectedHours, setSelectedHours] = useState(() => (value || '09:00').split(':')[0]);
    const [selectedMinutes, setSelectedMinutes] = useState(() => (value || '09:00').split(':')[1]);
    const hoursRef = useRef(null);
    const minutesRef = useRef(null);
    const scrollTimeoutRef = useRef(null);

    const hrs = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const mins = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    // Scroll to selected time on mount
    useEffect(() => {
        if (hoursRef.current) {
            const el = hoursRef.current.querySelector(`[data-value="${selectedHours}"]`);
            if (el) el.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
        if (minutesRef.current) {
            const el = minutesRef.current.querySelector(`[data-value="${selectedMinutes}"]`);
            if (el) el.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
    }, []);

    // Get centered item from scroll container
    const getCenteredItem = (container, items) => {
        if (!container) return null;
        const containerRect = container.getBoundingClientRect();
        const centerY = containerRect.top + containerRect.height / 2;

        let closestItem = null;
        let closestDistance = Infinity;

        items.forEach(item => {
            const el = container.querySelector(`[data-value="${item}"]`);
            if (el) {
                const rect = el.getBoundingClientRect();
                const itemCenterY = rect.top + rect.height / 2;
                const distance = Math.abs(centerY - itemCenterY);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestItem = item;
                }
            }
        });
        return closestItem;
    };

    // Snap to position constants
    const ITEM_HEIGHT = 32;

    // Handle scroll with debounce - snap to nearest item when scrolling stops (for touch/drag)
    const handleHoursScroll = () => {
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            if (!hoursRef.current) return;

            // Calculate which item is centered based on scroll position
            const scrollTop = hoursRef.current.scrollTop;
            const nearestIndex = Math.round(scrollTop / ITEM_HEIGHT);
            const clampedIndex = Math.max(0, Math.min(hrs.length - 1, nearestIndex));
            const nearestHour = hrs[clampedIndex];
            const targetScrollTop = clampedIndex * ITEM_HEIGHT;

            // Snap to position if not already aligned
            if (Math.abs(scrollTop - targetScrollTop) > 1) {
                hoursRef.current.scrollTop = targetScrollTop;
            }

            // Update state if changed
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

            // Calculate which item is centered based on scroll position
            const scrollTop = minutesRef.current.scrollTop;
            const nearestIndex = Math.round(scrollTop / ITEM_HEIGHT);
            const clampedIndex = Math.max(0, Math.min(mins.length - 1, nearestIndex));
            const nearestMinute = mins[clampedIndex];
            const targetScrollTop = clampedIndex * ITEM_HEIGHT;

            // Snap to position if not already aligned
            if (Math.abs(scrollTop - targetScrollTop) > 1) {
                minutesRef.current.scrollTop = targetScrollTop;
            }

            // Update state if changed
            if (nearestMinute !== selectedMinutes) {
                setSelectedMinutes(nearestMinute);
                onChange(`${selectedHours}:${nearestMinute}`);
            }
        }, 100);
    };

    // Wheel handlers - direct control for immediate response
    const handleHoursWheel = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (hoursRef.current) {
            const direction = Math.sign(e.deltaY);
            const currentIndex = hrs.indexOf(selectedHours);
            const newIndex = Math.max(0, Math.min(hrs.length - 1, currentIndex + direction));
            const newHour = hrs[newIndex];

            // Immediate scroll position update
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

            // Immediate scroll position update
            minutesRef.current.scrollTop = newIndex * ITEM_HEIGHT;

            if (newMinute !== selectedMinutes) {
                setSelectedMinutes(newMinute);
                onChange(`${selectedHours}:${newMinute}`);
            }
        }
    };

    // Block all wheel events from the container from propagating
    const handleContainerWheel = (e) => {
        e.stopPropagation();
    };

    const handleHourClick = (h) => {
        setSelectedHours(h);
        onChange(`${h}:${selectedMinutes}`);
        // Scroll to clicked item
        const el = hoursRef.current?.querySelector(`[data-value="${h}"]`);
        if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };

    const handleMinuteClick = (m) => {
        setSelectedMinutes(m);
        onChange(`${selectedHours}:${m}`);
        // Scroll to clicked item
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
                {/* Selection Highlight Bar */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-8 bg-surface-alt rounded-lg -z-10 pointer-events-none" />

                {/* Hours */}
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

                {/* Separator */}
                <div className="flex items-center justify-center font-bold text-gray-300">:</div>

                {/* Minutes */}
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

                // Google Maps Driving direction doesn't support past time.
                // We leave it empty to default to "Depart Now" if it's in the past for driving.
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
    // Removed local dateRange state in favor of props
    // BUT we need local state for the DatePicker to be responsive during selection (before end date is picked)
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






    const [isAtBottom, setIsAtBottom] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const handlePocketToDay = (item) => {
        if (!onMoveFromPocket) return;
        onMoveFromPocket(activeDay, item);
        toast.success(`已將 ${item.title} 加入 ${activeDayLabel || activeDay}`);
    };
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
        if (days && days.length > 0) {
            const dayIds = days.map(d => d.id);
            // Frequency of backend updates can cause jitter.
            // We only sync if the set or order of IDs actually changed.
            const isSame = dayIds.length === orderedDayKeys.length &&
                dayIds.every((id, idx) => id === orderedDayKeys[idx]);

            if (!isSame) {
                setOrderedDayKeys(dayIds);
            }
        }
    }, [days]);

    // Handle Day Reorder
    const onDayReorder = (newOrder) => {
        setOrderedDayKeys(newOrder);

        // If the active day moved, ensuring focus follows it is handled
        // by the fact that activeDay is a stable ID.
    };

    // When drag ends, we commit the change
    const onDayDragEnd = () => {
        if (onReorderDays) {
            onReorderDays(orderedDayKeys);
            // No more setTimeout/sort! The button stays where the user dropped it.
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
    }, [orderedDayKeys]);

    // Calculate actual date for the current day (Moved here to be after orderedDayKeys is defined)
    const activeDayIndex = orderedDayKeys.indexOf(activeDay);
    const currentDayDate = activeDayIndex >= 0 ? addDays(startDate, activeDayIndex) : startDate;
    const currentDayDateStr = useMemo(() => format(currentDayDate, 'yyyy-MM-dd'), [currentDayDate]);

    // Handle Drag End (Moved here to be after currentDayDateStr)
    const handleDragEnd = useCallback(() => {
        setDraggedId(null);
        const reCalculated = recalculateDayTimeline(localItems, startTime || '09:00', currentDayDateStr);
        setLocalItems(reCalculated);
        onUpdateItinerary(activeDay, reCalculated);
    }, [localItems, startTime, onUpdateItinerary, activeDay, currentDayDateStr]);

    // Force sync with correct date when itineraryData or date changes (Moved here)
    useEffect(() => {
        if (!draggedId) {
            const rawItems = itineraryData[activeDay] || [];
            // Recalculate with correctly resolved date (overriding App.jsx's potential fallback)
            const corrected = recalculateDayTimeline(rawItems, startTime || '09:00', currentDayDateStr);
            setLocalItems(corrected);
        }
    }, [itineraryData, activeDay, draggedId, startTime, currentDayDateStr]);


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
            // Skip if event is from TimeSelector (identified by data-time-selector attribute)
            if (e.target.closest('[data-time-selector]')) {
                return;
            }
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


    // Optimization Handler
    const handleOptimize = async () => {
        if (localItems.length <= 2) {
            toast('景點太少，無需排序', { icon: '🤔' });
            return;
        }

        // Use toast.promise for better UX
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



    // Handle Item Content Update (Title, Category, Desc)
    const handleUpdateItemContent = (itemId, updates) => {
        const newItems = localItems.map(item =>
            item.id === itemId ? { ...item, ...updates } : item
        );
        // Note: Changing Title/Desc doesn't affect timeline, but we recalculate for consistency state
        const reCalculated = recalculateDayTimeline(newItems, startTime || '09:00', currentDayDateStr);
        setLocalItems(reCalculated);
        onUpdateItinerary(activeDay, reCalculated);
    };

    return (
        <div className="h-full flex flex-col bg-transparent overflow-hidden">
            {/* Header */}
            <div className="py-4 bg-transparent flex justify-between items-center">
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
                <div className="max-w-[400px] mx-auto">
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
