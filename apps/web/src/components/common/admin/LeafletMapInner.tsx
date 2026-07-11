'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet's default marker icon references relative image paths that don't
// resolve under Next.js bundling — point them at the CDN build matching our
// installed leaflet version instead of shipping/importing the PNGs ourselves.
const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629]; // India centroid
const DEFAULT_ZOOM = 5;
const PIN_ZOOM = 15;

interface LeafletMapInnerProps {
  latitude?: number;
  longitude?: number;
  onPick: (lat: number, lng: number) => void;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Recenters the map whenever the external position changes (search result,
// "use my location", or manual lat/lng entry) without fighting the user's
// own pan/zoom while they're interacting with the map.
function RecenterOnChange({ position }: { position: [number, number] }) {
  const map = useMap();
  const prevRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    const moved =
      !prev || Math.abs(prev[0] - position[0]) > 1e-9 || Math.abs(prev[1] - position[1]) > 1e-9;
    if (moved) {
      map.setView(position, Math.max(map.getZoom(), PIN_ZOOM), { animate: true });
    }
    prevRef.current = position;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position[0], position[1]]);

  return null;
}

function DraggableMarker({
  position,
  onPick,
}: {
  position: [number, number];
  onPick: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  return (
    <Marker
      position={position}
      draggable
      icon={markerIcon}
      eventHandlers={{
        dragend() {
          const latlng = markerRef.current?.getLatLng();
          if (latlng) onPick(latlng.lat, latlng.lng);
        },
      }}
      ref={markerRef}
    />
  );
}

export default function LeafletMapInner({ latitude, longitude, onPick }: LeafletMapInnerProps) {
  const hasPosition =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude);
  const position: [number, number] | null = hasPosition ? [latitude, longitude] : null;

  return (
    <MapContainer
      center={position ?? DEFAULT_CENTER}
      zoom={position ? PIN_ZOOM : DEFAULT_ZOOM}
      scrollWheelZoom
      style={{ height: '420px', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={onPick} />
      {position && <RecenterOnChange position={position} />}
      {position && <DraggableMarker position={position} onPick={onPick} />}
    </MapContainer>
  );
}
