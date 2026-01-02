import { Bookmark, Plus, Trash2 } from 'lucide-react';
import { getCategoryIcon } from './constants';

const PocketList = ({ pocketList, onMoveToDay, onRemove, activeDay, activeDayLabel }) => {
    return (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col max-h-[450px]">
            <div className="px-5 py-2 border-b border-gray-50">
                <h3 className="text-sm font-bold text-gray-800">口袋名單</h3>
                <p className="text-[10px] text-gray-400">目前收藏的地點</p>
            </div>
            <div className="overflow-y-auto px-2 py-2 flex-1">
                {pocketList.length > 0 ? (
                    pocketList.map((item) => (
                        <div
                            key={item.id}
                            className="group p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-50 last:border-0"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-gray-100 rounded-md text-gray-500 shrink-0">
                                    {getCategoryIcon(item.category)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold text-gray-700 truncate">{item.title}</h4>
                                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.description}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => onMoveToDay(activeDay, item)}
                                        className="p-1.5 text-primary hover:bg-primary/10 rounded-full transition-all"
                                        title={`加入 ${activeDayLabel || activeDay}`}
                                    >
                                        <Plus size={16} />
                                    </button>
                                    <button
                                        onClick={() => onRemove('pocket', item.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                        title="從口袋移除"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-8 text-center opacity-30">
                        <Bookmark size={32} className="mx-auto mb-2" />
                        <p className="text-xs italic">口袋裡目前沒有景點</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PocketList;
