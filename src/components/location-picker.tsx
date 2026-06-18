import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { Search, Loader2, MapPin, Layers, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Default Leaflet marker icons reference image paths that don't resolve
// correctly under bundlers like Vite. Rebuild the default icon using CDN URLs.
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface LocationValue {
  lat: number;
  lng: number;
  /** Display name returned by the geocoder, if selected via search. */
  label?: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

const DEFAULT_CENTER: [number, number] = [-7.7956, 110.3695]; // Yogyakarta

const STREET_TILE = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};
const SATELLITE_TILE = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  attribution: "Tiles &copy; Esri",
};
// Reference overlays drawn on top of the satellite imagery so the
// "hybrid" view still shows street names, place names, and labels
// similar to Google Maps satellite view.
const LABELS_TILE = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
  attribution: "",
};
const ROADS_TILE = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
  attribution: "",
};

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterOnChange({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

/**
 * Interactive location picker for Owner UMKM (Pengaturan Bisnis).
 * Lets the owner search a place (via Nominatim/OSM) or click/drag a pin
 * on the map to set their business location. Returns { lat, lng, label }.
 *
 * Free, no API key required.
 */
export function LocationPicker({
  value,
  onChange,
}: {
  value: { lat: number | null; lng: number | null; label?: string | null };
  onChange: (loc: LocationValue) => void;
}) {
  const [center, setCenter] = useState<[number, number]>(
    value.lat !== null && value.lng !== null ? [value.lat, value.lng] : DEFAULT_CENTER,
  );
  const [marker, setMarker] = useState<[number, number] | null>(
    value.lat !== null && value.lng !== null ? [value.lat, value.lng] : null,
  );
  const [query, setQuery] = useState(value.label ?? "");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [satellite, setSatellite] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  // Sync from persisted value once it becomes available (e.g. after async
  // fetch in the parent settings page finishes loading).
  useEffect(() => {
    if (initializedRef.current) return;
    if (value.lat !== null && value.lng !== null) {
      setMarker([value.lat, value.lng]);
      setCenter([value.lat, value.lng]);
      initializedRef.current = true;
    }
    if (value.label) {
      setQuery(value.label);
      initializedRef.current = true;
    }
  }, [value.lat, value.lng, value.label]);

  function pickPoint(lat: number, lng: number, label?: string) {
    setMarker([lat, lng]);
    setCenter([lat, lng]);
    setShowResults(false);
    onChange({ lat, lng, label });
    if (label) setQuery(label);
  }

  async function search(q: string) {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=id&q=${encodeURIComponent(q)}`,
        { headers: { "Accept-Language": "id" } },
      );
      const data = (await res.json()) as NominatimResult[];
      setResults(data);
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function handleQueryChange(v: string) {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 500);
  }

  async function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => pickPoint(pos.coords.latitude, pos.coords.longitude),
      () => {},
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => results.length > 0 && setShowResults(true)}
              placeholder="Cari nama tempat atau alamat…"
              className="pl-8"
            />
            {searching && <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
            {!searching && query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  setShowResults(false);
                }}
                className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Hapus"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button type="button" variant="outline" size="icon" onClick={useMyLocation} title="Gunakan lokasi saya">
            <MapPin className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setSatellite((s) => !s)}
            title={satellite ? "Tampilan peta jalan" : "Tampilan satelit"}
          >
            <Layers className="h-4 w-4" />
          </Button>
        </div>
        {showResults && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-[1000] mt-1 max-h-64 overflow-y-auto rounded-lg border bg-popover shadow-md">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pickPoint(Number(r.lat), Number(r.lon), r.display_name)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
              >
                {r.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative h-64 overflow-hidden rounded-lg border" onClick={() => setShowResults(false)}>
        <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer
            attribution={satellite ? SATELLITE_TILE.attribution : STREET_TILE.attribution}
            url={satellite ? SATELLITE_TILE.url : STREET_TILE.url}
          />
          {satellite && <TileLayer url={ROADS_TILE.url} attribution={ROADS_TILE.attribution} />}
          {satellite && <TileLayer url={LABELS_TILE.url} attribution={LABELS_TILE.attribution} />}
          <RecenterOnChange center={center} />
          <ClickHandler onPick={(lat, lng) => pickPoint(lat, lng)} />
          {marker && (
            <Marker
              position={marker}
              icon={markerIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const pos = e.target.getLatLng();
                  pickPoint(pos.lat, pos.lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <p className="text-xs text-muted-foreground">
        Cari nama tempat, klik peta, atau geser pin untuk menentukan lokasi usaha Anda.
      </p>
    </div>
  );
}