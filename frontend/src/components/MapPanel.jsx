import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, InfoWindow, DirectionsService, useGoogleMap } from '@react-google-maps/api';
import { Plus } from 'lucide-react';
import { CANVAS_MAP_STYLE } from './mapStyles';

// 1. Color Palette for Days
const DAILY_COLORS = [
    '#0ea5e9', // Day 1: Blue
    '#f59e0b', // Day 2: Amber
    '#10b981', // Day 3: Emerald
    '#8b5cf6', // Day 4: Violet
    '#f43f5e', // Day 5: Rose
];

const getColorForDay = (dayIndex) => DAILY_COLORS[dayIndex % DAILY_COLORS.length];

// Define libraries array outside component to avoid infinite loops in useJsApiLoader
const LIBRARIES = ['marker'];

// Map Setup
const containerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '12px',
};

const center = {
    lat: 25.0478, // Taipei Main Station
    lng: 121.5170
};

const options = {
    styles: CANVAS_MAP_STYLE,
    disableDefaultUI: true,
    zoomControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    // mapId removed to allow JSON styling (Raster Map)
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
        // Dotted Line
        return {
            ...baseOptions,
            strokeOpacity: 0, // Hide base line
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
        // Dashed Line (Thick)
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
        // DRIVING (Solid)
        return {
            ...baseOptions,
            strokeOpacity: 0.7,
            zIndex: 1
        };
    }
};

// Sub-component for a single route leg (removed React.memo to ensure proper lifecycle/cleanup)
const RouteLeg = ({ loc, nextLoc, dayData, transportMode, cachedResult, onResult }) => {

    // Access the map instance directly
    const map = useGoogleMap();
    const polylinesRef = useRef([]);

    const googleMode =
        transportMode === 'WALKING' ? 'WALKING' :
            transportMode === 'TRANSIT' ? 'TRANSIT' : 'DRIVING';

    // Memoize options for DirectionsService to prevent infinite polling due to reference changes
    const directionsOptions = useMemo(() => ({
        destination: { lat: nextLoc.lat, lng: nextLoc.lng },
        origin: { lat: loc.lat, lng: loc.lng },
        travelMode: googleMode,
        transitOptions: googleMode === 'TRANSIT' ? {
            routingPreference: 'FEWER_TRANSFERS',
            modes: ['BUS', 'RAIL', 'SUBWAY', 'TRAIN', 'TRAM']
        } : undefined
    }), [nextLoc.lat, nextLoc.lng, loc.lat, loc.lng, googleMode]);

    // Callback wrapper
    const handleCallback = useCallback((res) => {
        if (res && res.request) {
            onResult(res);
        }
    }, [onResult]);

    // Effect: Sync cached result updates to parent
    useEffect(() => {
        // We only notify parent if we have a valid result.
        // We do NOT draw here. Drawing is handled by the other useEffect.
        if (cachedResult && cachedResult.status === 'OK') {
            onResult(cachedResult);
        }
    }, [cachedResult, onResult]);

    // Effect: Manually manage Google Maps Polylines used for rendering
    // This ensures STRICT cleanup when the component unmounts or data changes.
    useEffect(() => {
        if (!map) return;

        // Cleanup function helper
        const cleanupLines = () => {
            if (polylinesRef.current) {
                polylinesRef.current.forEach(line => line.setMap(null));
                polylinesRef.current = [];
            }
        };

        // Always clean up old lines before drawing new ones (or on unmount)
        cleanupLines();

        if (cachedResult && cachedResult.status === 'OK' && cachedResult.routes[0] && cachedResult.routes[0].legs[0]) {
            const steps = cachedResult.routes[0].legs[0].steps;

            steps.forEach(step => {
                const stepMode = step.travel_mode;
                const opts = getStepOptions(stepMode, dayData.color);

                // Create native Polyline
                const line = new window.google.maps.Polyline({
                    path: step.path,
                    ...opts,
                    map: map // render immediately
                });

                polylinesRef.current.push(line);
            });
        }

        // Cleanup on unmount or re-run
        return cleanupLines;
    }, [cachedResult, map, dayData.color]);

    // If we have a cached result, we don't render DirectionsService (we draw manually)
    // If not cached, we render Service to fetch it.
    if (cachedResult && cachedResult.status === 'OK') {
        return null;
    }

    // If we have a cached FAILURE, do nothing
    if (cachedResult && cachedResult.status !== 'OK') {
        return null;
    }

    // Otherwise, fetch it
    return (
        <DirectionsService
            options={directionsOptions}
            callback={handleCallback}
        />
    );
};

// Wrapper component for Standard Marker (replacing AdvancedMarkerElement)
// We switch to Standard Marker because AdvancedMarkerElement requires a Map ID,
// and Map ID maps do not support client-side JSON styling (styles prop).
const AdvancedMarker = ({ position, color, onClick, children }) => {
    const map = useGoogleMap();
    const markerRef = useRef(null);
    const [markerInstance, setMarkerInstance] = useState(null);

    useEffect(() => {
        if (!map) return;

        let marker = null;

        // Use Legacy Marker which supports JSON styling on the map
        marker = new window.google.maps.Marker({
            map,
            position,
            title: 'Location',
            // Replicate the visual style using vector icons (Symbol)
            icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: color,
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 2,
                scale: 7 // Radius 7 = 14px diameter
            },
            clickable: true
        });

        marker.addListener("click", (e) => {
            if (onClick) onClick(e);
        });

        markerRef.current = marker;
        setMarkerInstance(marker);

        return () => {
            if (marker) {
                marker.setMap(null);
            }
        };
    }, [map, position.lat, position.lng, color, onClick]);

    // Pass the marker instance as anchor to children (InfoWindow)
    if (!children) return null;

    return React.cloneElement(children, { anchor: markerInstance });
};


export default function MapPanel({ selectedLocation, focusedLocation, itineraryData, activeDay, onAddLocation, onDirectionsFetched, onDirectionsError }) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries: LIBRARIES
    });

    const mapRef = useRef(null);
    const [infoWindowOpen, setInfoWindowOpen] = useState(null);
    const [directionsCache, setDirectionsCache] = useState({});

    // Transform props to renderable list
    const mapData = useMemo(() => {
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

    const onLoad = useCallback(function callback(map) {
        mapRef.current = map;
    }, []);

    const onUnmount = useCallback(function callback(map) {
        mapRef.current = null;
    }, []);

    // Helper to handle direction results from RouteLeg
    const handleRouteResult = useCallback((response, key, dayId, fromItemId) => {
        if (response !== null) {
            // Check if we already have this specific result to avoid loop
            setDirectionsCache(prev => {
                if (prev[key]) return prev; // Already cached, ignore
                return { ...prev, [key]: response };
            });

            if (response.status === 'OK') {
                const leg = response.routes[0].legs[0];
                if (leg && onDirectionsFetched) {
                    onDirectionsFetched(dayId, fromItemId, {
                        duration: leg.duration || {},
                        distance: leg.distance || {}
                    });
                }
            } else {
                console.warn(`Directions request failed for ${key}: status ${response.status} `);
                // Notify Error for automatic fallback
                if (onDirectionsError) {
                    onDirectionsError(dayId, fromItemId, response.status);
                }
            }
        }
    }, [onDirectionsFetched, onDirectionsError]);

    // Effect: Pan to Selected/Focused
    useEffect(() => {
        if (isLoaded && mapRef.current) {
            if (selectedLocation) {
                mapRef.current.panTo({ lat: selectedLocation.lat, lng: selectedLocation.lng });
                mapRef.current.setZoom(15);
            } else if (focusedLocation) {
                mapRef.current.panTo({ lat: parseFloat(focusedLocation.lat), lng: parseFloat(focusedLocation.lng) });
                mapRef.current.setZoom(16);
                setInfoWindowOpen(`existing - ${focusedLocation.id} `);
            }
        }
    }, [isLoaded, selectedLocation, focusedLocation]);

    if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
        return (
            <div className="map-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', background: '#f5f5f5' }}>
                <p style={{ color: 'var(--pk-text-muted)', textAlign: 'center', padding: '0 2rem' }}>
                    缺少 Google Maps API 金鑰。<br />
                    請在 frontend 根目錄建立 <code>.env</code> 檔案並加入：<br />
                    <code>VITE_GOOGLE_MAPS_API_KEY=your_key_here</code>
                </p>
            </div>
        );
    }

    if (!isLoaded) return <div className="map-panel">地圖載入中...</div>;

    return (
        <div className="map-panel">
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={13}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={options}
            >
                {/* Render Each Day */}
                {mapData.map((dayData) => (
                    <React.Fragment key={dayData.day}>

                        {/* 1. Directions (Routes) via RouteLeg */}
                        {dayData.locations.map((loc, i) => {
                            // Do we have a next location?
                            if (i >= dayData.locations.length - 1) return null;

                            const nextLoc = dayData.locations[i + 1];
                            const transportMode = loc.transportMode || 'DRIVING';

                            const cacheKey = `${loc.lat},${loc.lng} -${nextLoc.lat},${nextLoc.lng} -${transportMode} `;
                            const cachedResult = directionsCache[cacheKey];

                            return (
                                <RouteLeg
                                    key={cacheKey}
                                    loc={loc}
                                    nextLoc={nextLoc}
                                    dayData={dayData}
                                    transportMode={transportMode}
                                    cachedResult={cachedResult}
                                    onResult={(res) => handleRouteResult(res, cacheKey, dayData.day, loc.id)}
                                />
                            );
                        })}

                        {/* 2. Custom Markers with AdvancedMarkerElement */}
                        {dayData.locations.map(loc => (
                            <AdvancedMarker
                                key={loc.id}
                                position={{ lat: loc.lat, lng: loc.lng }}
                                color={dayData.color}
                                onClick={() => setInfoWindowOpen(`existing - ${loc.id} `)}
                            >
                                {infoWindowOpen === `existing - ${loc.id} ` && (
                                    <InfoWindow onCloseClick={() => setInfoWindowOpen(null)}>
                                        <div style={{ fontFamily: 'var(--font-sans)', textAlign: 'center', padding: '4px' }}>
                                            <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600 }}>{loc.title}</h3>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>{dayData.day} - {loc.category}</span>
                                        </div>
                                    </InfoWindow>
                                )}
                            </AdvancedMarker>
                        ))}
                    </React.Fragment>
                ))}

                {/* 3. Search Result with AdvancedMarkerElement */}
                {selectedLocation && (
                    <AdvancedMarker
                        position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                        color="#ef4444" // Default red for new selection
                        onClick={() => setInfoWindowOpen('search-result')}
                    >
                        {(infoWindowOpen === 'search-result' || infoWindowOpen === null) && (
                            <InfoWindow
                                onCloseClick={() => setInfoWindowOpen(null)}
                                position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                            >
                                <div style={{ fontFamily: 'var(--font-sans)', textAlign: 'center', maxWidth: '200px' }}>
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600 }}>{selectedLocation.name}</h3>
                                    <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px 0' }}>{selectedLocation.fullAddress}</p>
                                    <button
                                        onClick={onAddLocation}
                                        style={{
                                            width: '100%',
                                            padding: '6px 12px',
                                            backgroundColor: 'var(--pk-primary)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px',
                                            fontSize: '12px',
                                            fontWeight: 500
                                        }}
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
