export const CANVAS_MAP_STYLE = [
    {
        "featureType": "all",
        "elementType": "geometry",
        "stylers": [
            { "color": "#f2f0e9" } // Match --pk-bg (Cream paper)
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels.text.fill",
        "stylers": [
            { "color": "#475569" } // Slate 600
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels.text.stroke",
        "stylers": [
            { "visibility": "simplified" },
            { "color": "#f2f0e9" }, // Match background for halo
            { "weight": 4 }
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels.icon",
        "stylers": [
            { "visibility": "off" }
        ]
    },
    {
        "featureType": "administrative",
        "elementType": "geometry.stroke",
        "stylers": [
            { "color": "#cbd5e1" }, // Slate 300
            { "weight": 1 }
        ]
    },
    {
        "featureType": "landscape.man_made",
        "elementType": "geometry.fill",
        "stylers": [
            { "color": "#f2f0e9" } // Strictly cream
        ]
    },
    {
        "featureType": "landscape.natural",
        "elementType": "geometry.fill",
        "stylers": [
            { "color": "#ebe9e0" } // Slightly darker cream/beige for contrast
        ]
    },
    {
        "featureType": "poi",
        "elementType": "geometry.fill",
        "stylers": [
            { "visibility": "on" },
            { "color": "#e6e4dc" } // Subtle difference for POIs
        ]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry.fill",
        "stylers": [
            { "color": "#dae6d8" } // Very desaturated sage green
        ]
    },
    {
        "featureType": "road",
        "elementType": "geometry.fill",
        "stylers": [
            { "color": "#ffffff" } // White roads
        ]
    },
    {
        "featureType": "road",
        "elementType": "geometry.stroke",
        "stylers": [
            { "color": "#e2e8f0" }, // Slate 200 outline
            { "weight": 0.5 }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.fill",
        "stylers": [
            { "color": "#ffffff" }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [
            { "color": "#cbd5e1" }, // Slightly darker stroke for highways
            { "weight": 1 }
        ]
    },
    {
        "featureType": "transit",
        "elementType": "geometry",
        "stylers": [
            { "visibility": "off" } // Hide transit lines for cleaner look? Or simplified.
        ]
    },
    {
        "featureType": "transit.station",
        "elementType": "labels.icon",
        "stylers": [
            { "visibility": "on" }, // Show stations but maybe desaturated?
            { "saturation": -100 },
            { "lightness": 30 }
        ]
    },
    {
        "featureType": "water",
        "elementType": "geometry.fill",
        "stylers": [
            { "color": "#cce3e6" } // Pale teal-blue (blends with --pk-primary #14b8a6)
        ]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [
            { "color": "#64748b" } // Slate 500
        ]
    }
];
