import { Plus, Check, Trash2 } from 'lucide-react';

const TripList = ({ itineraries, currentItinerary, onSelect, onCreate, onDelete }) => {
    return (
        <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-4 py-2 border-b border-gray-50 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">最近行程</span>
                <button
                    onClick={onCreate}
                    className="p-1 hover:bg-primary/10 rounded-full text-primary transition-colors"
                    title="新增行程"
                >
                    <Plus size={16} />
                </button>
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
                {itineraries.map((it) => (
                    <div
                        key={it._id || it.id}
                        className={`group w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${(currentItinerary?._id || currentItinerary?.id) === (it._id || it.id) ? 'bg-primary/5' : ''}`}
                        onClick={() => onSelect(it)}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${(currentItinerary?._id || currentItinerary?.id) === (it._id || it.id) ? 'bg-primary' : 'bg-transparent'}`} />
                            <div className="flex flex-col gap-0.5 min-w-0">
                                <span className={`text-sm font-medium truncate ${(currentItinerary?._id || currentItinerary?.id) === (it._id || it.id) ? 'text-primary' : 'text-gray-700'}`}>
                                    {it.title || "未命名行程"}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                    {it.days?.length || 0} 天之旅
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {(currentItinerary?._id || currentItinerary?.id) === (it._id || it.id) && (
                                <Check size={14} className="text-primary" />
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(it._id || it.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TripList;
