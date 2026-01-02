export const categorizePlace = (types = []) => {
    if (!types || types.length === 0) return '地點';

    const typeSet = new Set(types);

    if (typeSet.has('restaurant') || typeSet.has('food') || typeSet.has('cafe') ||
        typeSet.has('bakery') || typeSet.has('bar') || typeSet.has('meal_takeaway')) {
        return '美食';
    }

    if (typeSet.has('shopping_mall') || typeSet.has('store') || typeSet.has('clothing_store') ||
        typeSet.has('supermarket') || typeSet.has('department_store') || typeSet.has('convenience_store')) {
        return '購物';
    }

    if (typeSet.has('tourist_attraction') || typeSet.has('museum') || typeSet.has('art_gallery') ||
        typeSet.has('temple') || typeSet.has('church') || typeSet.has('shrine') || typeSet.has('zoo') || typeSet.has('aquarium')) {
        return '景點';
    }

    if (typeSet.has('park') || typeSet.has('natural_feature') || typeSet.has('campground')) {
        return '公園/自然';
    }

    if (typeSet.has('lodging')) {
        return '住宿';
    }

    if (typeSet.has('transit_station') || typeSet.has('bus_station') || typeSet.has('train_station') ||
        typeSet.has('subway_station') || typeSet.has('airport')) {
        return '交通';
    }

    if (typeSet.has('movie_theater') || typeSet.has('amusement_park') || typeSet.has('night_club') || typeSet.has('casino')) {
        return '娛樂';
    }

    return '地點';
};
