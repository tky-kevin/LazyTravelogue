import { Car, Bus, Footprints, Utensils, Camera, Hotel, ShoppingBag, MapPin, Calendar as CalendarIcon } from 'lucide-react';
import { forwardRef } from 'react';

export const getTransportIcon = (mode) => {
    switch (mode) {
        case 'DRIVING': return <Car size={14} />;
        case 'TRANSIT': return <Bus size={14} />;
        case 'WALKING': return <Footprints size={14} />;
        default: return <Car size={14} />;
    }
};

export const CATEGORY_OPTIONS = [
    { id: 'food', label: '美食', icon: Utensils, bg: 'bg-rose-50', text: 'text-rose-600/80', border: 'border-rose-100' },
    { id: 'scenic', label: '景點', icon: Camera, bg: 'bg-sky-50', text: 'text-sky-600/80', border: 'border-sky-100' },
    { id: 'hotel', label: '住宿', icon: Hotel, bg: 'bg-indigo-50', text: 'text-indigo-600/80', border: 'border-indigo-100' },
    { id: 'shopping', label: '購物', icon: ShoppingBag, bg: 'bg-emerald-50', text: 'text-emerald-600/80', border: 'border-emerald-100' },
    { id: 'other', label: '其他', icon: MapPin, bg: 'bg-slate-50', text: 'text-slate-600/80', border: 'border-slate-100' },
];

export const getCategoryConfig = (catId) => CATEGORY_OPTIONS.find(c => c.id === catId) || CATEGORY_OPTIONS[4];

export const CustomDateInput = forwardRef(({ value, onClick }, ref) => (
    <button
        className="group flex items-center gap-2.5 px-4 py-2 bg-white/50 backdrop-blur-sm border border-ink-border rounded-2xl text-ink text-sm shadow-sm transition-all hover:bg-white hover:border-primary/30 hover:shadow-md active:scale-95 font-sans"
        onClick={onClick}
        ref={ref}
    >
        <CalendarIcon size={16} className="text-primary transition-transform group-hover:scale-110" />
        <span className="font-medium">{value || '選擇日期'}</span>
    </button>
));
