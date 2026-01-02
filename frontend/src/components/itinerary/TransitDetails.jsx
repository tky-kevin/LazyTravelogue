import { Info, Footprints, MapPin, Clock } from 'lucide-react';

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

                    <div className="absolute left-[24px] top-[60px] bottom-[30px] w-[2px] border-l-2 border-dashed border-ink-border/40 z-0" />

                    {details.map((step, idx) => (
                        <div key={idx} className="flex gap-5 items-start relative z-10">
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

export default TransitDetails;
