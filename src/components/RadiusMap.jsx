import { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
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

function buildMarkers(institutions) {
  const map = new Map();

  institutions.forEach(institution => {
    institution.courses.forEach(course => {
      Object.values(course.locations).flat().forEach(loc => {
        const key = `${institution.providerCode}|${loc.postcode}`;
        const pc = String(loc.postcode || '').padStart(4, '0');
        const gps = AU_POSTCODES[pc];
        if (!gps) return;

        if (!map.has(key)) {
          map.set(key, {
            lat: gps.lat,
            lng: gps.lng,
            institutionName: institution.name,
            city: loc.city,
            state: loc.state,
            courses: []
          });
        }
        map.get(key).courses.push({
          courseName: course.courseName,
          totalCost: course.totalCost,
          tuitionFee: course.tuitionFee,
        });
      });
    });
  });

  return Array.from(map.values());
}

function makeCourseIcon(count) {
  return L.divIcon({
    className: '',
    html: `<div class="course-marker">${count}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

function MapFitter({ center, radiusMeters, markers }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [40, 40], animate: true });
    } else if (center) {
      const bounds = L.latLng(center.lat, center.lng).toBounds(radiusMeters * 2);
      map.fitBounds(bounds, { padding: [24, 24], animate: true });
    }
  }, [markers, center, radiusMeters, map]);
  return null;
}

export function RadiusMap({ locationQuery, locationRadius, filteredInstitutions = [] }) {
  if (!locationQuery || !locationRadius) return null;

  const center = findLocalityCenter(locationQuery);
  if (!center) return null;

  const radiusMeters = locationRadius * 1000;
  const markers = buildMarkers(filteredInstitutions);

  const uniqueSchools = new Set(markers.map(m => m.institutionName)).size;
  const totalCourses = markers.reduce((s, m) => s + m.courses.length, 0);

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
        {markers.map((m, i) => (
          <Marker
            key={`${m.lat}-${m.lng}-${m.institutionName}-${i}`}
            position={[m.lat, m.lng]}
            icon={makeCourseIcon(m.courses.length)}
            eventHandlers={{
              mouseover: e => e.target.openPopup(),
              mouseout: e => e.target.closePopup(),
            }}
          >
            <Popup closeButton={false} autoPan={false} className="course-popup">
              <div className="popup-school-name">{m.institutionName}</div>
              <div className="popup-location">{m.city}, {m.state}</div>
              <hr style={{ margin: '6px 0', border: 'none', borderTop: '1px solid #eee' }} />
              {m.courses.slice(0, 5).map((c, j) => (
                <div key={j} className="popup-course-row">
                  <span className="popup-course-name">{c.courseName}</span>
                  <span className="popup-course-price">
                    {c.totalCost ? `A$${c.totalCost.toLocaleString()}` : c.tuitionFee ? `A$${c.tuitionFee.toLocaleString()}` : 'TBA'}
                  </span>
                </div>
              ))}
              {m.courses.length > 5 && (
                <div className="popup-more">+{m.courses.length - 5} more courses</div>
              )}
            </Popup>
          </Marker>
        ))}
        <MapFitter center={center} radiusMeters={radiusMeters} markers={markers} />
      </MapContainer>
      <div className="radius-map-label">
        <span className="radius-map-pin">📍</span>
        Showing <strong>{uniqueSchools} {uniqueSchools === 1 ? 'school' : 'schools'}</strong> · <strong>{totalCourses} {totalCourses === 1 ? 'course' : 'courses'}</strong> within <strong>{locationRadius} km</strong> of <strong>{locationQuery}</strong>
      </div>
    </div>
  );
}
