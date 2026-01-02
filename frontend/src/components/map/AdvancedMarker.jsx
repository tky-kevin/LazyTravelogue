import React, { useEffect, useState, useRef } from 'react';
import { useGoogleMap } from '@react-google-maps/api';

export const AdvancedMarker = ({ position, color, label, onClick, children }) => {
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
            label: label ? {
                text: String(label),
                color: 'white',
                fontSize: '10px',
                fontWeight: '900'
            } : null,
            icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: color || '#ef4444',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 2,
                scale: label ? 10 : 7
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

    // Update Position, Color & Label
    useEffect(() => {
        if (markerRef.current) {
            markerRef.current.setPosition(position);
            markerRef.current.setLabel(label ? {
                text: String(label),
                color: 'white',
                fontSize: '10px',
                fontWeight: '900'
            } : null);
            markerRef.current.setIcon({
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: color || '#ef4444',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 2,
                scale: label ? 10 : 7
            });
        }
    }, [position.lat, position.lng, color, label]);

    if (!markerReady) return null;
    if (!children) return null;
    return React.cloneElement(children, { anchor: markerRef.current });
};
