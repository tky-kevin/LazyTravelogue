import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, InfoWindow } from '@react-google-maps/api';
import { Plus, Bookmark } from 'lucide-react';
import { CANVAS_MAP_STYLE } from './mapStyles';
import { useRouteCalculator } from '../hooks/useRouteCalculator';
import { categorizePlace } from '../utils/placeUtils';

// Sub-components & Helpers
import { DAILY_COLORS, getColorForDay, getStepOptions, parseTransitDetails } from './map/constants';
import { AdvancedMarker } from './map/AdvancedMarker';
import { ManualPolyline } from './map/ManualPolyline';

const LIBRARIES = ['places', 'marker'];

const containerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '12px',
};
const center = { lat: 25.0478, lng: 121.5170 };
const defaultOptions = {
    disableDefaultUI: true,
    zoomControl: false,
    mapTypeControl: false,
    streetViewControl: false,
};

export default function MapPanel({ selectedLocation, focusedLocation, itineraryData, days = [], activeDay, activeDayLabel, onLocationSelect, onAddLocation, onAddToPocket, onDirectionsFetched, onDirectionsError }) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: LIBRARIES,
        language: 'zh-TW'
    });

    const [map, setMap] = useState(null);
    const mapRef = useRef(null);
    const [infoWindowOpen, setInfoWindowOpen] = useState(null);
    const [renderedRoutes, setRenderedRoutes] = useState({});
    const [selectedDays, setSelectedDays] = useState(new Set());
    const { getRoute } = useRouteCalculator();

    useEffect(() => {
        if (activeDay) {
            setSelectedDays(prev => {
                const next = new Set(prev);
                next.add(activeDay);
                return next;
            });
        }
    }, [activeDay]);

    useEffect(() => {
        if (selectedDays.size === 0 && activeDay) {
            setSelectedDays(new Set([activeDay]));
        }
    }, [days, activeDay]);

    const toggleDaySelection = (dayId) => {
        setSelectedDays(prev => {
            const next = new Set(prev);
            if (next.has(dayId)) {
                next.delete(dayId);
            } else {
                next.add(dayId);
            }
            return next;
        });
    };

    const selectAllDays = () => setSelectedDays(new Set(days.map(d => d.id)));
    const deselectAllDays = () => setSelectedDays(new Set());

    const [mapCenter, setMapCenter] = useState(center);
    const [mapZoom, setMapZoom] = useState(13);

    const [layers, setLayers] = useState({
        poi: false,
        business: false,
        transit: false,
        park: false
    });

    const toggleLayer = (layer) => {
        setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
    };

    const dynamicStyles = useMemo(() => {
        return CANVAS_MAP_STYLE.map(style => {
            if (style.featureType === 'poi' || (style.featureType === 'all' && style.elementType === 'labels.icon')) {
                if (style.featureType === 'poi' && !layers.poi) return { ...style, stylers: [{ visibility: 'off' }] };
                if (style.elementType === 'labels.icon' && !layers.poi && !layers.business) return { ...style, stylers: [{ visibility: 'off' }] };
            }
            if (style.featureType === 'poi.business' && !layers.business) return { ...style, stylers: [{ visibility: 'off' }] };
            if (style.featureType?.startsWith('transit') && !layers.transit) return { ...style, stylers: [{ visibility: 'off' }] };
            if (style.featureType === 'poi.park' && !layers.park) return { ...style, stylers: [{ visibility: 'off' }] };

            return style;
        }).concat([
            { featureType: 'poi.business', elementType: 'labels', stylers: [{ visibility: layers.business ? 'on' : 'off' }] },
            { featureType: 'poi.business', elementType: 'labels.icon', stylers: [{ visibility: layers.business ? 'on' : 'off' }] },
            { featureType: 'poi.attraction', elementType: 'labels', stylers: [{ visibility: layers.poi ? 'on' : 'off' }] },
            { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: layers.park ? 'on' : 'off' }] },
            { featureType: 'transit.station', elementType: 'labels', stylers: [{ visibility: layers.transit ? 'on' : 'off' }] },
            { featureType: 'transit.station', elementType: 'labels.icon', stylers: [{ visibility: layers.transit ? 'on' : 'off' }] },
        ]);
    }, [layers]);

    const activeOptions = useMemo(() => ({
        ...defaultOptions,
        styles: dynamicStyles
    }), [dynamicStyles]);

    const mapData = useMemo(() => {
        if (!days || days.length === 0) return [];
        return days.map((day, index) => {
            const activities = itineraryData[day.id] || itineraryData[day.date] || day.activities || [];
            const isVisible = selectedDays.has(day.id);
            return {
                day: day.id,
                label: day.date,
                color: getColorForDay(index),
                isVisible: isVisible,
                locations: activities.map(item => ({
                    ...item,
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lng)
                }))
            };
        });
    }, [days, itineraryData, selectedDays]);

    const onLoad = useCallback((mapInstance) => {
        setMap(mapInstance);
        mapRef.current = mapInstance;
    }, []);

    const onUnmount = useCallback(() => {
        setMap(null);
        mapRef.current = null;
    }, []);

    const onMapClick = useCallback((e) => {
        if (e.placeId && onLocationSelect) {
            e.stop?.(); // Prevent default Google POI info window
            if (!mapRef.current) return;
            const service = new window.google.maps.places.PlacesService(mapRef.current);
            service.getDetails({
                placeId: e.placeId,
                fields: ['name', 'geometry', 'formatted_address', 'place_id', 'rating', 'user_ratings_total', 'types']
            }, (place, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && place.geometry?.location) {
                    onLocationSelect({
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                        name: place.name,
                        fullAddress: place.formatted_address,
                        placeId: place.place_id,
                        rating: place.rating,
                        user_ratings_total: place.user_ratings_total,
                        category: categorizePlace(place.types)
                    });
                }
            });
        }
    }, [onLocationSelect]);

    useEffect(() => {
        if (!isLoaded) return;

        mapData.forEach(dayData => {
            dayData.locations.forEach((loc, i) => {
                if (i >= dayData.locations.length - 1) return;
                const nextLoc = dayData.locations[i + 1];
                const transportMode = loc.transportMode || 'DRIVING';
                const cacheKey = `${loc.lat},${loc.lng}-${nextLoc.lat},${nextLoc.lng}-${transportMode}`;
                const departureTime = (dayData.day === activeDay && loc.endDate) ? new Date(loc.endDate) : null;

                getRoute(loc, nextLoc, transportMode, departureTime)
                    .then(result => {
                        let selectedRouteIndex = 0;
                        if (transportMode === 'TRANSIT' && result.routes?.length > 0) {
                            const candidates = result.routes.map((r, idx) => ({
                                index: idx,
                                durationValue: r.legs[0].duration.value,
                                hasTransit: r.legs[0].steps.some(s => s.travel_mode === 'TRANSIT')
                            }));

                            const transitCandidates = candidates.filter(c => c.hasTransit);
                            if (transitCandidates.length > 0) {
                                transitCandidates.sort((a, b) => a.durationValue - b.durationValue);
                                selectedRouteIndex = transitCandidates[0].index;
                            }
                        }

                        setRenderedRoutes(prev => {
                            if (prev[cacheKey]) return prev;
                            return { ...prev, [cacheKey]: { ...result, selectedRouteIndex } };
                        });

                        if (onDirectionsFetched) {
                            const leg = result.routes[selectedRouteIndex].legs[0];
                            const transitDetails = transportMode === 'TRANSIT' ? parseTransitDetails(leg) : null;

                            onDirectionsFetched(dayData.day, loc.id, {
                                duration: leg.duration || {},
                                distance: leg.distance || {},
                                transitDetails,
                                transportMode
                            });
                        }
                    })
                    .catch(err => {
                        console.error(`Route error: ${loc.name} -> ${nextLoc.name}:`, err);
                        if (onDirectionsError) onDirectionsError(dayData.day, loc.id, err);
                    });
            });
        });
    }, [isLoaded, mapData, getRoute, onDirectionsFetched, onDirectionsError]);

    useEffect(() => {
        if (isLoaded && map) {
            if (selectedLocation) {
                const target = { lat: parseFloat(selectedLocation.lat), lng: parseFloat(selectedLocation.lng) };
                setInfoWindowOpen('search-result');
                map.panTo(target);
                if (map.getZoom() < 15) map.setZoom(15);
            } else if (focusedLocation) {
                const target = { lat: parseFloat(focusedLocation.lat), lng: parseFloat(focusedLocation.lng) };
                setInfoWindowOpen(`existing-${focusedLocation.id}`);
                map.panTo(target);
                if (map.getZoom() < 16) map.setZoom(16);
            }
        }
    }, [isLoaded, map, selectedLocation?.lat, selectedLocation?.lng, selectedLocation?._ts, focusedLocation?.id, focusedLocation?._ts]);

    if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
        return <div className="p-8 text-center text-gray-500">Missing API Key</div>;
    }

    if (!isLoaded) return <div className="h-full w-full bg-gray-100 animate-pulse rounded-xl" />;

    return (
        <div className="h-full w-full md:rounded-xl shadow-inner md:border border-gray-200 overflow-hidden">
            {/* Day Selection UI */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 max-w-[80%]">
                <div className="flex flex-wrap gap-2">
                    {mapData.map((dayData, idx) => (
                        <button
                            key={dayData.day}
                            onClick={() => toggleDaySelection(dayData.day)}
                            className={`
                                    px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-md border-2
                                    flex items-center gap-2
                                    ${dayData.isVisible
                                    ? 'bg-white border-transparent'
                                    : 'bg-white/60 border-transparent text-gray-400 opacity-60 hover:opacity-100'}
                                `}
                            style={dayData.isVisible ? { borderTopColor: dayData.color, borderBottomColor: dayData.color, borderLeftColor: dayData.color, borderRightColor: dayData.color, color: dayData.color } : {}}
                        >
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: dayData.color }}
                            />
                            {dayData.label}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={selectAllDays}
                        className="px-2 py-1 bg-white/80 backdrop-blur-sm rounded-md text-[10px] font-bold text-gray-500 hover:bg-white transition-colors border border-gray-100 uppercase tracking-tight"
                    >
                        全選
                    </button>
                    <button
                        onClick={deselectAllDays}
                        className="px-2 py-1 bg-white/80 backdrop-blur-sm rounded-md text-[10px] font-bold text-gray-500 hover:bg-white transition-colors border border-gray-100 uppercase tracking-tight"
                    >
                        清除
                    </button>
                </div>
            </div>

            <GoogleMap
                mapContainerStyle={containerStyle}
                center={mapCenter}
                zoom={mapZoom}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={activeOptions}
                onClick={onMapClick}
                onIdle={() => {
                    if (mapRef.current) {
                        const newCenter = {
                            lat: mapRef.current.getCenter().lat(),
                            lng: mapRef.current.getCenter().lng()
                        };
                        setMapCenter(newCenter);
                        setMapZoom(mapRef.current.getZoom());
                    }
                }}
            >
                {/* Layer Toggles UI */}
                <div className="absolute bottom-4 left-4 z-10 grid grid-cols-2 gap-2 w-fit">
                    {[
                        { id: 'poi', label: '景點', icon: '🏛️' },
                        { id: 'business', label: '商店', icon: '🛍️' },
                        { id: 'transit', label: '交通', icon: '🚇' },
                        { id: 'park', label: '公園', icon: '🌳' },
                    ].map(layer => (
                        <button
                            key={layer.id}
                            onClick={() => toggleLayer(layer.id)}
                            className={`
                                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm border
                                ${layers[layer.id]
                                    ? 'bg-white border-primary text-primary shadow-md transform scale-105'
                                    : 'bg-white/90 border-gray-100 text-gray-500 opacity-80 hover:opacity-100'}
                            `}
                        >
                            <span>{layer.icon}</span>
                            <span>{layer.label}</span>
                        </button>
                    ))}
                </div>
                {/* Render Routes */}
                {mapData.filter(d => d.isVisible).map(dayData => (
                    <React.Fragment key={dayData.day}>
                        {dayData.locations.map((loc, i) => {
                            if (i >= dayData.locations.length - 1) return null;
                            const nextLoc = dayData.locations[i + 1];
                            const transportMode = loc.transportMode || 'DRIVING';
                            const cacheKey = `${loc.lat},${loc.lng}-${nextLoc.lat},${nextLoc.lng}-${transportMode}`;
                            const route = renderedRoutes[cacheKey];

                            if (route && route.status === 'OK') {
                                // Use the selected route index (optimized for transit)
                                const routeIndex = route.selectedRouteIndex || 0;
                                return (
                                    <ManualPolyline
                                        key={cacheKey}
                                        path={route.routes[routeIndex].overview_path}
                                        options={getStepOptions(transportMode, dayData.color)}
                                    />
                                );
                            }
                            return null;
                        })}

                        {/* Markers */}
                        {dayData.locations.map((loc, idx) => (
                            <AdvancedMarker
                                key={loc.id}
                                position={{ lat: loc.lat, lng: loc.lng }}
                                label={idx + 1}
                                color={dayData.color}
                                onClick={() => setInfoWindowOpen(`existing-${loc.id}`)}
                            >
                                {infoWindowOpen === `existing-${loc.id}` && (
                                    <InfoWindow onCloseClick={() => setInfoWindowOpen(null)}>
                                        <div className="p-1 text-center font-sans">
                                            <h3 className="font-semibold text-sm mb-1">{loc.title}</h3>
                                            <span className="text-xs text-gray-500">{dayData.label} - {loc.category}</span>
                                        </div>
                                    </InfoWindow>
                                )}
                            </AdvancedMarker>
                        ))}
                    </React.Fragment>
                ))}

                {/* Search Selection Marker */}
                {selectedLocation && (
                    <AdvancedMarker
                        position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                        color="#ef4444"
                        onClick={() => setInfoWindowOpen('search-result')}
                    >
                        {(infoWindowOpen === 'search-result') && (
                            <InfoWindow
                                onCloseClick={() => setInfoWindowOpen(null)}
                                position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                            >
                                <div className="font-sans text-center max-w-[200px]">
                                    <h3 className="font-semibold text-sm mb-1">{selectedLocation.name}</h3>
                                    <p className="text-xs text-gray-500 mb-2">{selectedLocation.fullAddress}</p>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={onAddLocation}
                                            className="w-full flex items-center justify-center gap-1 bg-primary text-white py-1.5 rounded text-xs font-medium hover:bg-primary/90 transition-colors"
                                        >
                                            <Plus size={14} />
                                            加入 {activeDayLabel || activeDay}
                                        </button>
                                        <button
                                            onClick={onAddToPocket}
                                            className="w-full flex items-center justify-center gap-1 bg-ink text-white py-1.5 rounded text-xs font-medium hover:bg-ink/90 transition-colors"
                                        >
                                            <Bookmark size={14} />
                                            加入口袋名單
                                        </button>
                                    </div>
                                </div>
                            </InfoWindow>
                        )}
                    </AdvancedMarker>
                )}
            </GoogleMap>
        </div>
    );
}
