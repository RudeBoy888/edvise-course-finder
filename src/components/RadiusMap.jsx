import { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import AU_POSTCODES from '../data/au_postcodes.json';
import '../styles/RadiusMap.css';

// Fix Leaflet default marker icons broken by Vite bundler
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function findLocalityCenter(query) {
  const q = query.trim().toUpperCase();
  const matches = Object.values(AU_POSTCODES).filter(e =>
    e.locality.toUpperCase().includes(q)
  );
  if (!matches.length) return null;
  return {
    lat: matches.reduce((s, e) => s + e.lat, 0) / matches.length,
    lng: matches.reduce((s, e) => s + e.lng, 0) / matches.length,
  };
}

// Auto-fits map bounds to the circle whenever center/radius changes
function MapFitter({ center, radiusMeters }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      const bounds = L.latLng(center.lat, center.lng).toBounds(radiusMeters * 2);
      map.fitBounds(bounds, { padding: [24, 24], animate: true });
    }
  }, [center, radiusMeters, map]);
  return null;
}

export function RadiusMap({ locationQuery, locationRadius }) {
  if (!locationQuery || !locationRadius) return null;

  const center = findLocalityCenter(locationQuery);
  if (!center) return null;

  const radiusMeters = locationRadius * 1000;

  return (
    <div className="radius-map-wrapper">
      <MapContainer
        key={locationQuery}
        center={[center.lat, center.lng]}
        zoom={12}
        className="radius-map"
        scrollWheelZoom={false}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <Circle
          center={[center.lat, center.lng]}
          radius={radiusMeters}
          pathOptions={{
            color: '#C7613C',
            fillColor: '#C7613C',
            fillOpacity: 0.13,
            weight: 2.5,
            dashArray: '6 4',
          }}
        />
        <Marker position={[center.lat, center.lng]} />
        <MapFitter center={center} radiusMeters={radiusMeters} />
      </MapContainer>
      <div className="radius-map-label">
        <span className="radius-map-pin">📍</span>
        Showing schools within <strong>{locationRadius} km</strong> of <strong>{locationQuery}</strong>
      </div>
    </div>
  );
}
