const ItineraryPreview = ({ plan, onImport }) => {
    return (
        <div className="mt-2 p-3 bg-teal-50/50 rounded-xl border border-teal-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <h4 className="font-bold text-gray-800 text-sm mb-1">{plan.title}</h4>
            <p className="text-xs text-gray-500 mb-2">已為您規劃了 {plan.days.length} 天的行程，包含景點、美食等建議。</p>
            <div className="max-h-32 overflow-y-auto mb-3 space-y-1 pr-1">
                {plan.days.map((day, dIdx) => (
                    <div key={dIdx} className="text-[0.7rem] bg-white/50 p-1.5 rounded flex flex-col gap-0.5">
                        <span className="font-bold text-primary">{day.date}</span>
                        <div className="flex flex-wrap gap-1">
                            {day.activities.slice(0, 3).map((act, aIdx) => (
                                <span key={aIdx} className="bg-white px-1.5 rounded border border-gray-100 text-gray-600">
                                    {act.title}
                                </span>
                            ))}
                            {day.activities.length > 3 && <span className="text-gray-400">...</span>}
                        </div>
                    </div>
                ))}
            </div>
            <button
                onClick={onImport}
                className="w-full py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
                匯入此行程
            </button>
        </div>
    );
};

export default ItineraryPreview;
