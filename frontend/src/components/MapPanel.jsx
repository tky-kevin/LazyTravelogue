import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, InfoWindow, useGoogleMap, Polyline } from '@react-google-maps/api';
import { Plus, Bookmark } from 'lucide-react';
import { CANVAS_MAP_STYLE } from './mapStyles';
import { useRouteCalculator } from '../hooks/useRouteCalculator';
import { categorizePlace } from '../utils/placeUtils';

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
const defaultOptions = {
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
            strokeOpacity: 1.0,
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


// Helper to parse transit details from a Google Maps DirectionsLeg
const parseTransitDetails = (leg) => {
    if (!leg || !leg.steps) return null;

    return leg.steps.map(step => {
        if (step.travel_mode === 'TRANSIT' && step.transit) {
            return {
                type: 'TRANSIT',
                line: step.transit.line.short_name || step.transit.line.name,
                vehicle: step.transit.line.vehicle.name,
                departureStop: step.transit.departure_stop.name,
                arrivalStop: step.transit.arrival_stop.name,
                departureTime: step.transit.departure_time?.text || '未提供',
                arrivalTime: step.transit.arrival_time?.text || '未提供',
                numStops: step.transit.num_stops,
                color: step.transit.line.color,
                textColor: step.transit.line.text_color
            };
        } else if (step.travel_mode === 'WALKING') {
            return {
                type: 'WALKING',
                duration: step.duration.text,
                distance: step.distance.text,
                instruction: step.instructions
            };
        }
        return null;
    }).filter(Boolean);
};

// Helper to parse alternative routes info
const parseAlternatives = (result, selectedIndex = 0, baseTime = new Date()) => {
    if (!result || !result.routes || result.routes.length <= 1) return null;

    // Filter out the selected route
    return result.routes
        .map((route, index) => ({ route, index }))
        .filter(({ index }) => index !== selectedIndex)
        .map(({ route }) => {
            const leg = route.legs[0];
            const transitSteps = leg.steps.filter(s => s.travel_mode === 'TRANSIT');

            let startTimeMs, endTimeMs;

            // Smart timestamp parser - handles Date objects, seconds, milliseconds, and strings
            const parseTimeValue = (timeObj, fallbackMs = null) => {
                if (!timeObj || !timeObj.value) {
                    return fallbackMs;
                }

                const value = timeObj.value;

                // Case 1: Already a Date object
                if (value instanceof Date) {
                    return value.getTime();
                }

                // Case 2: Timestamp (need to detect seconds vs milliseconds)
                if (typeof value === 'number') {
                    // Unix timestamps < 10000000000 are in seconds (before year 2286)
                    // This is a safe assumption since 10000000000 = Nov 20, 2286
                    if (value < 10000000000) {
                        console.log(`🕐 Converting seconds to ms: ${value} → ${value * 1000}`);
                        return value * 1000; // Convert seconds to milliseconds
                    }
                    return value; // Already in milliseconds
                }

                // Case 3: String (ISO 8601, etc.)
                if (typeof value === 'string') {
                    const parsed = new Date(value).getTime();
                    if (!isNaN(parsed)) {
                        return parsed;
                    }
                }

                console.warn('⚠️ Could not parse time value:', value, typeof value);
                return fallbackMs;
            };

            // Parse departure time
            const legDep = leg.departure_time;
            startTimeMs = parseTimeValue(legDep, baseTime.getTime());

            // Parse arrival time
            const legArr = leg.arrival_time;
            endTimeMs = parseTimeValue(legArr, null);

            // If arrival time is missing, calculate from start + duration
            if (!endTimeMs) {
                endTimeMs = startTimeMs + (leg.duration.value * 1000);
            }

            // Improved time formatting with explicit timezone
            const formatTime = (ms) => {
                const d = new Date(ms);
                return d.toLocaleTimeString('zh-TW', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                    timeZone: 'Asia/Taipei'
                });
            };

            const alternativeInfo = {
                duration: leg.duration.text,
                durationValue: leg.duration.value,
                departureTime: formatTime(startTimeMs),
                departureTimeValue: startTimeMs,
                arrivalTime: formatTime(endTimeMs),
                arrivalTimeValue: endTimeMs,
                summary: transitSteps.length > 0
                    ? transitSteps.map(s => (s.transit?.line.short_name || s.transit?.line.name)).join(' ➔ ')
                    : '步行為主'
            };

            // Debug logging
            console.log('🚇 Alternative route parsed:', {
                departure: `${alternativeInfo.departureTime} (${new Date(startTimeMs).toISOString()})`,
                arrival: `${alternativeInfo.arrivalTime} (${new Date(endTimeMs).toISOString()})`,
                duration: alternativeInfo.duration,
                summary: alternativeInfo.summary
            });

            return alternativeInfo;
        });
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

export default function MapPanel({ selectedLocation, focusedLocation, itineraryData, days = [], activeDay, activeDayLabel, onLocationSelect, onAddLocation, onAddToPocket, onDirectionsFetched, onDirectionsError }) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: LIBRARIES,
        language: 'zh-TW'
    });

    const mapRef = useRef(null);
    const [infoWindowOpen, setInfoWindowOpen] = useState(null);
    const [renderedRoutes, setRenderedRoutes] = useState({}); // key -> routeResult
    const { getRoute } = useRouteCalculator();

    // Map View State
    const [mapCenter, setMapCenter] = useState(center);
    const [mapZoom, setMapZoom] = useState(13);

    // Map Layers State
    const [layers, setLayers] = useState({
        poi: true,      // Attractions / General POI
        business: true, // Shops / Restaurants
        transit: true,  // Transit Stations
        park: true      // Parks
    });

    const toggleLayer = (layer) => {
        setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
    };

    // Construct dynamic styles based on layer visibility
    const dynamicStyles = useMemo(() => {
        return CANVAS_MAP_STYLE.map(style => {
            // General POI Labels/Icons
            if (style.featureType === 'poi' || style.featureType === 'all' && style.elementType === 'labels.icon') {
                if (style.featureType === 'poi' && !layers.poi) return { ...style, stylers: [{ visibility: 'off' }] };
                if (style.elementType === 'labels.icon' && !layers.poi && !layers.business) return { ...style, stylers: [{ visibility: 'off' }] };
            }
            // Specific overrides
            if (style.featureType === 'poi.business' && !layers.business) return { ...style, stylers: [{ visibility: 'off' }] };
            if (style.featureType?.startsWith('transit') && !layers.transit) return { ...style, stylers: [{ visibility: 'off' }] };
            if (style.featureType === 'poi.park' && !layers.park) return { ...style, stylers: [{ visibility: 'off' }] };

            return style;
        }).concat([
            // Ensure business/transit visibility is explicitly handled if not in base style
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

    // Transform props to renderable list
    const mapData = useMemo(() => {
        if (!days || days.length === 0) return [];
        return days.map((day, index) => {
            // Use itineraryData activities if they belong to this day (itineraryData holds calculated days)
            const activities = itineraryData[day.id] || itineraryData[day.date] || day.activities || [];
            return {
                day: day.id,
                color: getColorForDay(index),
                locations: activities.map(item => ({
                    ...item,
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lng)
                }))
            };
        });
    }, [days, itineraryData]);

    const onLoad = useCallback((map) => {
        mapRef.current = map;
    }, []);

    const onUnmount = useCallback(() => {
        mapRef.current = null;
    }, []);

    const onMapClick = useCallback((e) => {
        if (e.placeId && onLocationSelect) {
            e.stop?.(); // Prevent standard Google POI info window

            if (!mapRef.current) return;
            const service = new window.google.maps.places.PlacesService(mapRef.current);

            service.getDetails({
                placeId: e.placeId,
                fields: ['name', 'geometry', 'formatted_address', 'place_id', 'rating', 'user_ratings_total', 'types']
            }, (place, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && place.geometry && place.geometry.location) {
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
        } else {
            // Option: Clear selection if clicking empty map
            // onLocationSelect?.(null);
        }
    }, [onLocationSelect]);

    // Effect: Fetch Routes Imperatively
    useEffect(() => {
        if (!isLoaded) return;

        mapData.forEach(dayData => {
            dayData.locations.forEach((loc, i) => {
                if (i >= dayData.locations.length - 1) return;
                const nextLoc = dayData.locations[i + 1];
                const transportMode = loc.transportMode || 'DRIVING';
                const cacheKey = `${loc.lat},${loc.lng}-${nextLoc.lat},${nextLoc.lng}-${transportMode}`;

                // Departure Time for transit (if available from previous activity's calculated end time)
                const departureTime = (dayData.day === activeDay && loc.endDate) ? new Date(loc.endDate) : null;

                // Fetch Route
                getRoute(loc, nextLoc, transportMode, departureTime)
                    .then(result => {
                        console.log("Directions Result:", result); // Debugging

                        // Smart selection for TRANSIT mode:
                        // Prioritize the FASTEST route that actually has TRANSIT steps.
                        let selectedRouteIndex = 0;
                        if (transportMode === 'TRANSIT' && result.routes && result.routes.length > 0) {
                            // detailedRoutes: Array of { index, route, durationValue, hasTransit }
                            const candidates = result.routes.map((r, idx) => ({
                                index: idx,
                                route: r,
                                durationValue: r.legs[0].duration.value,
                                hasTransit: r.legs[0].steps.some(s => s.travel_mode === 'TRANSIT')
                            }));

                            // Filter for routes with transit steps
                            const transitCandidates = candidates.filter(c => c.hasTransit);

                            if (transitCandidates.length > 0) {
                                // Sort by duration (ascending) -> pick fastest
                                transitCandidates.sort((a, b) => a.durationValue - b.durationValue);
                                selectedRouteIndex = transitCandidates[0].index;
                            } else {
                                // Fallback: if no transit steps found in any route (rare), stick to default (Google's best guess, likely walking)
                                selectedRouteIndex = 0;
                            }
                        }

                        // Update local render state
                        setRenderedRoutes(prev => {
                            if (prev[cacheKey]) return prev;
                            return { ...prev, [cacheKey]: { ...result, selectedRouteIndex } };
                        });

                        // Notify Parent (App.jsx)
                        if (onDirectionsFetched) {
                            const selectedRoute = result.routes[selectedRouteIndex];
                            const leg = selectedRoute.legs[0];

                            // Use the REQUESTED departure time as a fallback base if leg time is missing
                            // (e.g. Walking routes often lack absolute timestamps)
                            const baseTime = departureTime ? new Date(departureTime) : new Date();

                            const transitDetails = transportMode === 'TRANSIT' ? parseTransitDetails(leg) : null;
                            const alternatives = transportMode === 'TRANSIT' ? parseAlternatives(result, selectedRouteIndex, baseTime) : null;

                            onDirectionsFetched(dayData.day, loc.id, {
                                duration: leg.duration || {},
                                distance: leg.distance || {},
                                transitDetails,
                                alternatives,
                                transportMode // Ensure mode is passed back
                            });
                        }
                    })
                    .catch(err => {
                        console.error(`Error fetching route for ${loc.name} -> ${nextLoc.name}:`, err);
                        // Only notify error, do not switch mode automatically
                        if (onDirectionsError) {
                            onDirectionsError(dayData.day, loc.id, err);
                        }
                    });
            });
        });

    }, [isLoaded, mapData, getRoute, onDirectionsFetched, onDirectionsError]);


    // Simplified View Logic: We only move programmatically via refs to ensure smoothness
    useEffect(() => {
        if (isLoaded && mapRef.current) {
            if (selectedLocation) {
                const target = { lat: selectedLocation.lat, lng: selectedLocation.lng };
                setInfoWindowOpen('search-result');
                mapRef.current.panTo(target);

                // Only zoom in if we are too far out
                if (mapRef.current.getZoom() < 15) {
                    mapRef.current.setZoom(15);
                }
            } else if (focusedLocation) {
                const target = { lat: parseFloat(focusedLocation.lat), lng: parseFloat(focusedLocation.lng) };
                setInfoWindowOpen(`existing-${focusedLocation.id}`);
                mapRef.current.panTo(target);

                if (mapRef.current.getZoom() < 16) {
                    mapRef.current.setZoom(16);
                }
            }
        }
    }, [isLoaded, selectedLocation?.placeId, focusedLocation?.id]);

    if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
        return <div className="p-8 text-center text-gray-500">Missing API Key</div>;
    }

    if (!isLoaded) return <div className="h-full w-full bg-gray-100 animate-pulse rounded-xl" />;

    return (
        <div className="h-full w-full rounded-xl shadow-inner border border-gray-200 overflow-hidden">
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
                <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2 max-w-[280px]">
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
                {mapData.map(dayData => (
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
