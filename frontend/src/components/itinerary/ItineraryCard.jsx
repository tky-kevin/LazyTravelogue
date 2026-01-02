import { useState, useRef, useEffect, memo } from 'react';
import { motion, Reorder, useDragControls } from 'framer-motion';
import { Clock, Navigation, Pencil, Trash2, Check, X, GripVertical } from 'lucide-react';
import { getCategoryConfig, CATEGORY_OPTIONS } from './constants';
import TransportConnector from './TransportConnector';

export const ItineraryCard = ({
    item,
    onClick,
    onUpdateStayDuration,
    isDragging,
    dragControls,
    onRemove,
    onUpdateContent,
    readOnly
}) => {
    // Generate a stable random rotation for a natural aesthetic
    const rotation = useRef(Math.random() * 2 - 1).current;

    const [isEditing, setIsEditing] = useState(false);
    const [editValues, setEditValues] = useState({
        title: item.title,
        description: item.description || '',
        category: item.category
    });

    const [localStayDuration, setLocalStayDuration] = useState(item.stayDuration ?? 60);

    useEffect(() => {
        setLocalStayDuration(item.stayDuration ?? 60);
    }, [item.stayDuration]);

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
            {/* Timeline sidebar */}
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

            <motion.div
                className="relative flex gap-3 p-3 sm:p-4 bg-surface rounded-lg border border-ink-border shadow-paper flex-1 group"
                initial={{ opacity: 0, y: 20 }}
                animate={isDragging ? animateDragging : animateNormal}
                whileHover={!isEditing && !readOnly ? whileHoverAnim : {}}
                whileTap={!isEditing && !readOnly ? whileTapAnim : {}}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={!isEditing && !readOnly ? onClick : undefined}
            >
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
                            <h3 className="text-base font-semibold text-ink m-0 pr-0 truncate max-w-[110px] sm:max-w-[160px]" title={item.title}>
                                {item.title}
                            </h3>
                        )}

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

                    <div className="space-y-3">
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
                                        min="0"
                                        value={localStayDuration}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setLocalStayDuration(val);
                                            if (val !== '' && !isNaN(parseInt(val))) {
                                                onUpdateStayDuration(item.id, parseInt(val));
                                            }
                                        }}
                                        onBlur={() => {
                                            if (localStayDuration === '' || isNaN(parseInt(localStayDuration))) {
                                                setLocalStayDuration(60);
                                                onUpdateStayDuration(item.id, 60);
                                            }
                                        }}
                                        className="w-10 border border-ink-border rounded p-0.5 text-center text-xs bg-surface focus:border-primary outline-none"
                                    />
                                )}
                                <span>分</span>
                            </div>
                        </div>

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

export const MemoizedItineraryCard = memo(ItineraryCard);

// DraggableItineraryItem Component
export const DraggableItineraryItem = ({
    item,
    nextItem,
    index,
    localItemsLength,
    draggedId,
    setDraggedId,
    handleDragEnd,
    onLocationFocus,
    onUpdateStayDuration,
    activeDay,
    onUpdateTransportMode,
    onRemoveItem,
    onUpdateItemContent,
    readOnly
}) => {
    const dragControls = useDragControls();

    return (
        <Reorder.Item
            value={item}
            className="relative mb-1"
            dragListener={false}
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
                <MemoizedItineraryCard
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
                <div className={`transition-opacity duration-200 ${draggedId === item.id ? 'opacity-0' : 'opacity-100'}`}>
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
