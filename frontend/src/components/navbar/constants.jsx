import { Coffee, Hotel, Camera, MapPin } from 'lucide-react';

export const getCategoryIcon = (category) => {
    switch (category) {
        case 'food': return <Coffee size={18} />;
        case 'hotel': return <Hotel size={18} />;
        case 'scenic': return <Camera size={18} />;
        default: return <MapPin size={18} />;
    }
};

export const LIBRARIES = ['places', 'marker'];
