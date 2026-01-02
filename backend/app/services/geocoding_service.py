import httpx
from typing import Optional, Dict, Tuple
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class GeocodingService:
    """Service for geocoding place names using Google Maps Places API"""
    
    @staticmethod
    async def geocode_place(place_name: str, fallback_lat: Optional[float] = None, fallback_lng: Optional[float] = None) -> Tuple[float, float]:
        """Convert a place name to coordinates, with optional AI fallback."""
        api_key = settings.GOOGLE_MAPS_API_KEY
        
        if not api_key:
            logger.warning("Google Maps API Key not found, using fallback coordinates")
            if fallback_lat is not None and fallback_lng is not None:
                return (fallback_lat, fallback_lng)
            raise ValueError("No API key and no fallback coordinates provided")
        
        try:
            async with httpx.AsyncClient() as client:
                url = "https://maps.googleapis.com/maps/api/geocode/json"
                params = {
                    "address": place_name,
                    "key": api_key,
                    "language": "zh-TW"
                }
                
                response = await client.get(url, params=params, timeout=10.0)
                response.raise_for_status()
                
                data = response.json()
                
                if data.get("status") == "OK" and data.get("results"):
                    location = data["results"][0]["geometry"]["location"]
                    lat = location["lat"]
                    lng = location["lng"]
                    logger.info(f"Successfully geocoded '{place_name}' to ({lat}, {lng})")
                    return (lat, lng)
                else:
                    logger.warning(f"Geocoding failed for '{place_name}': {data.get('status')}")
                    # Use fallback coordinates if available
                    if fallback_lat is not None and fallback_lng is not None:
                        logger.info(f"Using AI-generated fallback coordinates for '{place_name}'")
                        return (fallback_lat, fallback_lng)
                    raise ValueError(f"Geocoding failed: {data.get('status')}")
                    
        except httpx.HTTPError as e:
            logger.error(f"HTTP error during geocoding for '{place_name}': {str(e)}")
            if fallback_lat is not None and fallback_lng is not None:
                logger.info(f"Using AI-generated fallback coordinates for '{place_name}'")
                return (fallback_lat, fallback_lng)
            raise
            
        except Exception as e:
            logger.error(f"Unexpected error during geocoding for '{place_name}': {str(e)}")
            if fallback_lat is not None and fallback_lng is not None:
                logger.info(f"Using AI-generated fallback coordinates for '{place_name}'")
                return (fallback_lat, fallback_lng)
            raise
    
    @staticmethod
    async def geocode_itinerary_activities(itinerary_data: Dict) -> Dict:
        """Geocode all activities in an itinerary, using AI coordinates as fallback."""
        if not itinerary_data.get("days"):
            return itinerary_data
        
        updated_days = []
        
        for day in itinerary_data["days"]:
            updated_activities = []
            
            for activity in day.get("activities", []):
                place_name = activity.get("title", "")
                ai_lat = activity.get("lat")
                ai_lng = activity.get("lng")
                
                try:
                    lat, lng = await GeocodingService.geocode_place(
                        place_name,
                        fallback_lat=ai_lat,
                        fallback_lng=ai_lng
                    )
                    
                    activity["lat"] = lat
                    activity["lng"] = lng
                    
                except Exception as e:
                    logger.error(f"Failed to geocode activity '{place_name}': {str(e)}")
                    # Keep AI-generated coordinates if they exist
                    if ai_lat is None or ai_lng is None:
                        logger.warning(f"No coordinates available for '{place_name}', setting to default")
                        activity["lat"] = 25.0330  # Default to Taipei
                        activity["lng"] = 121.5654
                
                updated_activities.append(activity)
            
            updated_day = {**day, "activities": updated_activities}
            updated_days.append(updated_day)
        
        return {**itinerary_data, "days": updated_days}
