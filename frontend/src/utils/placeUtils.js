/**
 * Maps Google Place types to user-friendly Chinese categories.
 * @param {string[]} types - Array of types from Google Places API
 * @returns {string} - Chinese category name
 */
export const categorizePlace = (types = []) => {
    if (!types || types.length === 0) return '地點';

    const typeSet = new Set(types);

    // 1. Food & Dining
    if (typeSet.has('restaurant') || typeSet.has('food') || typeSet.has('cafe') ||
        typeSet.has('bakery') || typeSet.has('bar') || typeSet.has('meal_takeaway')) {
        return '美食';
    }

    // 2. Shopping
    if (typeSet.has('shopping_mall') || typeSet.has('store') || typeSet.has('clothing_store') ||
        typeSet.has('supermarket') || typeSet.has('department_store') || typeSet.has('convenience_store')) {
        return '購物';
    }

    // 3. Sightseeing & Culture
    if (typeSet.has('tourist_attraction') || typeSet.has('museum') || typeSet.has('art_gallery') ||
        typeSet.has('temple') || typeSet.has('church') || typeSet.has('shrine') || typeSet.has('zoo') || typeSet.has('aquarium')) {
        return '景點';
    }

    // 4. Nature & Parks
    if (typeSet.has('park') || typeSet.has('natural_feature') || typeSet.has('campground')) {
        return '公園/自然';
    }

    // 5. Lodging
    if (typeSet.has('lodging')) {
        return '住宿';
    }

    // 6. Transit
    if (typeSet.has('transit_station') || typeSet.has('bus_station') || typeSet.has('train_station') ||
        typeSet.has('subway_station') || typeSet.has('airport')) {
        return '交通';
    }

    // 7. Entertainment
    if (typeSet.has('movie_theater') || typeSet.has('amusement_park') || typeSet.has('night_club') || typeSet.has('casino')) {
        return '娛樂';
    }

    return '地點'; // Default
};
