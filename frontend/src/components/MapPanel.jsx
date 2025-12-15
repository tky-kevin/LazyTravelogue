import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, InfoWindow, useGoogleMap, Polyline } from '@react-google-maps/api';
import { Plus } from 'lucide-react';
import { CANVAS_MAP_STYLE } from './mapStyles';
import { useRouteCalculator } from '../hooks/useRouteCalculator';

// 1. Color Palette for Days
const DAILY_COLORS = [
    '#0ea5e9', // Day 1: Blue
    '#f59e0b', // Day 2: Amber
    '#10b981', // Day 3: Emerald
    '#8b5cf6', // Day 4: Violet
    '#f43f5e', // Day 5: Rose
];

const getColorForDay = (dayIndex) => DAILY_COLORS[dayIndex % DAILY_COLORS.length];

const LIBRARIES = ['places', 'marker'];

const containerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '12px',
};
const center = { lat: 25.0478, lng: 121.5170 };
const options = {
    styles: CANVAS_MAP_STYLE,
    disableDefaultUI: true,
    zoomControl: false,
    mapTypeControl: false,
    streetViewControl: false,
};

// Styles for different transport modes
const getStepOptions = (mode, color) => {
    const baseOptions = {
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 5,
        clickable: false,
        draggable: false,
        editable: false,
        geodesic: true,
        zIndex: 1
    };

    if (mode === 'WALKING') {
        return {
            ...baseOptions,
            strokeOpacity: 0,
            icons: [{
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    fillColor: color,
                    fillOpacity: 1,
                    scale: 3,
                    strokeOpacity: 0
                },
                offset: '0',
                repeat: '12px'
            }]
        };
    } else if (mode === 'TRANSIT') {
        return {
            ...baseOptions,
            strokeOpacity: 0,
            icons: [{
                icon: {
                    path: 'M 0,-1 0,1',
                    strokeOpacity: 1,
                    scale: 3,
                    strokeColor: color,
                    strokeWeight: 4
                },
                offset: '0',
                repeat: '12px'
            }],
            zIndex: 2
        };
    } else {
        return {
            ...baseOptions,
            strokeOpacity: 0.7,
            zIndex: 1
        };
    }
};

// Wrapper component for Standard Marker
const AdvancedMarker = ({ position, color, onClick, children }) => {
    const map = useGoogleMap();
    const markerRef = useRef(null);
    const clickRef = useRef(onClick);
    // State to trigger re-render of children when marker is ready
    const [markerReady, setMarkerReady] = useState(false);

    // Keep click handler fresh without re-binding listener
    useEffect(() => {
        clickRef.current = onClick;
    }, [onClick]);

    // Create Marker (Once)
    useEffect(() => {
        if (!map) return;

        const marker = new window.google.maps.Marker({
            map,
            position,
            clickable: true,
            icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: color || '#ef4444',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 2,
                scale: 7
            }
        });

        marker.addListener("click", (e) => {
            if (clickRef.current) clickRef.current(e);
        });

        markerRef.current = marker;
        setMarkerReady(true);

        return () => {
            marker.setMap(null);
        };
    }, [map]); // Depend only on map to create once

    // Update Position & Color
    useEffect(() => {
        if (markerRef.current) {
            markerRef.current.setPosition(position);
            markerRef.current.setIcon({
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: color || '#ef4444',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 2,
                scale: 7
            });
        }
    }, [position.lat, position.lng, color]);

    if (!children || !markerReady) return null;
    return React.cloneElement(children, { anchor: markerRef.current });
};


// Custom Polyline wrapper to ensure clean unmounting
const ManualPolyline = ({ path, options }) => {
    const map = useGoogleMap();
    const lineRef = useRef(null);

    // Create & Cleanup
    useEffect(() => {
        if (!map) return;
        const line = new window.google.maps.Polyline({
            map,
            path,
            ...options
        });
        lineRef.current = line;

        // Force cleanup
        return () => {
            if (lineRef.current) {
                lineRef.current.setMap(null);
                lineRef.current = null;
            }
        };
    }, [map]); // Init once. Changes handled by next effect or key change remount.

    // Update options if instance preserves
    useEffect(() => {
        if (!lineRef.current) return;
        lineRef.current.setOptions(options);
        // path update is tricky if length changes, safer to rely on remount via key
        // but for safety:
        lineRef.current.setPath(path);
    }, [path, options]);

    return null;
};

export default function MapPanel({ selectedLocation, focusedLocation, itineraryData, activeDay, onAddLocation, onDirectionsFetched, onDirectionsError }) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: LIBRARIES
    });

    const mapRef = useRef(null);
    const [infoWindowOpen, setInfoWindowOpen] = useState(null);
    const [renderedRoutes, setRenderedRoutes] = useState({}); // key -> routeResult
    const { getRoute } = useRouteCalculator();

    // Transform props to renderable list
    const mapData = useMemo(() => {
        if (!itineraryData) return [];
        return Object.entries(itineraryData).map(([dayId, items], index) => ({
            day: dayId,
            color: getColorForDay(index),
            locations: items.map(item => ({
                ...item,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lng)
            }))
        }));
    }, [itineraryData]);

    const onLoad = useCallback((map) => {
        mapRef.current = map;
    }, []);

    const onUnmount = useCallback(() => {
        mapRef.current = null;
    }, []);

    // Effect: Fetch Routes Imperatively
    useEffect(() => {
        if (!isLoaded) return;

        mapData.forEach(dayData => {
            dayData.locations.forEach((loc, i) => {
                if (i >= dayData.locations.length - 1) return;
                const nextLoc = dayData.locations[i + 1];
                const transportMode = loc.transportMode || 'DRIVING';
                const cacheKey = `${loc.lat},${loc.lng}-${nextLoc.lat},${nextLoc.lng}-${transportMode}`;

                // Fetch Route
                getRoute(loc, nextLoc, transportMode)
                    .then(result => {
                        // Update local render state if new
                        setRenderedRoutes(prev => {
                            if (prev[cacheKey]) return prev;
                            return { ...prev, [cacheKey]: result };
                        });

                        // Notify Parent (App.jsx)
                        if (onDirectionsFetched) {
                            const leg = result.routes[0].legs[0];
                            onDirectionsFetched(dayData.day, loc.id, {
                                duration: leg.duration || {},
                                distance: leg.distance || {}
                            });
                        }
                    })
                    .catch(status => {
                        console.warn(`Route failed: ${status}`);
                        if (onDirectionsError) {
                            onDirectionsError(dayData.day, loc.id, status);
                        }
                    });
            });
        });

    }, [isLoaded, mapData, getRoute, onDirectionsFetched, onDirectionsError]);


    // Effect: Pan to Selected/Focused
    useEffect(() => {
        if (isLoaded && mapRef.current) {
            if (selectedLocation) {
                mapRef.current.panTo({ lat: selectedLocation.lat, lng: selectedLocation.lng });
                mapRef.current.setZoom(15);
            } else if (focusedLocation) {
                mapRef.current.panTo({ lat: parseFloat(focusedLocation.lat), lng: parseFloat(focusedLocation.lng) });
                mapRef.current.setZoom(16);
                setInfoWindowOpen(`existing-${focusedLocation.id}`);
            }
        }
    }, [isLoaded, selectedLocation, focusedLocation]);

    if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
        return <div className="p-8 text-center text-gray-500">Missing API Key</div>;
    }

    if (!isLoaded) return <div className="h-full w-full bg-gray-100 animate-pulse rounded-xl" />;

    return (
        <div className="h-full w-full rounded-xl shadow-inner border border-gray-200 overflow-hidden">
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={13}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={options}
            >
                {/* Render Routes */}
                {mapData.map(dayData => (
                    <React.Fragment key={dayData.day}>
                        {dayData.locations.map((loc, i) => {
                            if (i >= dayData.locations.length - 1) return null;
                            const nextLoc = dayData.locations[i + 1];
                            const transportMode = loc.transportMode || 'DRIVING';
                            const cacheKey = `${loc.lat},${loc.lng}-${nextLoc.lat},${nextLoc.lng}-${transportMode}`;
                            const route = renderedRoutes[cacheKey];

                            if (route && route.status === 'OK') {
                                return (
                                    <ManualPolyline
                                        key={cacheKey}
                                        path={route.routes[0].overview_path}
                                        options={getStepOptions(transportMode, dayData.color)}
                                    />
                                );
                            }
                            return null;
                        })}

                        {/* Markers */}
                        {dayData.locations.map(loc => (
                            <AdvancedMarker
                                key={loc.id}
                                position={{ lat: loc.lat, lng: loc.lng }}
                                color={dayData.color}
                                onClick={() => setInfoWindowOpen(`existing-${loc.id}`)}
                            >
                                {infoWindowOpen === `existing-${loc.id}` && (
                                    <InfoWindow onCloseClick={() => setInfoWindowOpen(null)}>
                                        <div className="p-1 text-center font-sans">
                                            <h3 className="font-semibold text-sm mb-1">{loc.title}</h3>
                                            <span className="text-xs text-gray-500">{dayData.day} - {loc.category}</span>
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
                        {(infoWindowOpen === 'search-result' || infoWindowOpen === null) && (
                            <InfoWindow
                                onCloseClick={() => setInfoWindowOpen(null)}
                                position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                            >
                                <div className="font-sans text-center max-w-[200px]">
                                    <h3 className="font-semibold text-sm mb-1">{selectedLocation.name}</h3>
                                    <p className="text-xs text-gray-500 mb-2">{selectedLocation.fullAddress}</p>
                                    <button
                                        onClick={onAddLocation}
                                        className="w-full flex items-center justify-center gap-1 bg-primary text-white py-1.5 rounded text-xs font-medium hover:bg-primary/90 transition-colors"
                                    >
                                        <Plus size={14} />
                                        加入 {activeDay}
                                    </button>
                                </div>
                            </InfoWindow>
                        )}
                    </AdvancedMarker>
                )}
            </GoogleMap>
        </div>
    );
}
