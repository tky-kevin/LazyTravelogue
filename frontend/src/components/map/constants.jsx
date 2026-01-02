import React from 'react';

export const DAILY_COLORS = [
    '#0ea5e9',
    '#f59e0b',
    '#10b981',
    '#8b5cf6',
    '#f43f5e',
];

export const getColorForDay = (dayIndex) => DAILY_COLORS[dayIndex % DAILY_COLORS.length];

export const getStepOptions = (mode, color) => {
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

export const parseTransitDetails = (leg) => {
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
