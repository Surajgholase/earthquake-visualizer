/*
Earthquake Visualizer - Full React component (App.jsx)
This is the main app file. After creating the project, run `npm install` and `npm run dev`.
*/
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
  ZoomControl,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { format } from 'date-fns';

// Helper to fit map bounds to markers
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (!points || points.length === 0) return;
    const bounds = points.map(p => [p.lat, p.lon]);
    try {
      map.fitBounds(bounds, { padding: [40, 40] });
    } catch (e) {
      // ignore
    }
  }, [map, points]);
  return null;
}

export default function App() {
  const [earthquakes, setEarthquakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [minMag, setMinMag] = useState(0);
  const [maxMag, setMaxMag] = useState(10);
  const [colorMode, setColorMode] = useState('severity'); // 'severity' or 'depth'
  const [query, setQuery] = useState(''); // search place
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef(null);

  // Fetch function
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'
      );
      if (!res.ok) throw new Error('Failed to fetch earthquake data');
      const data = await res.json();
      const features = data.features.map(f => {
        const [lon, lat, depth] = f.geometry.coordinates;
        return {
          id: f.id,
          mag: f.properties.mag ?? 0,
          place: f.properties.place ?? 'Unknown location',
          time: f.properties.time,
          url: f.properties.url,
          depth,
          lat,
          lon,
          type: f.properties.type,
        };
      });
      setEarthquakes(features);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh every 2 minutes when enabled
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => fetchData(), 120000);
    }
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [autoRefresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return earthquakes
      .filter(e => e.mag >= minMag && e.mag <= maxMag)
      .filter(e => (q ? e.place.toLowerCase().includes(q) : true));
  }, [earthquakes, minMag, maxMag, query]);

  const pointsForBounds = useMemo(
    () => filtered.map(e => ({ lat: e.lat, lon: e.lon })),
    [filtered]
  );

  // helpers for color and radius
  const getColor = (e) => {
    if (colorMode === 'depth') {
      // deeper -> darker blue
      if (e.depth >= 300) return '#0b3d91';
      if (e.depth >= 100) return '#2b77d9';
      if (e.depth >= 50) return '#5aa0f0';
      return '#9fd0ff';
    }

    // severity mode (by magnitude)
    const mag = e.mag;
    if (mag >= 6) return '#b02a2a'; // red
    if (mag >= 5) return '#f97316'; // orange
    if (mag >= 4) return '#f59e0b'; // amber
    if (mag >= 3) return '#eab308'; // yellow
    return '#16a34a'; // green
  };

  const getRadius = (mag) => {
    if (mag <= 0) return 4;
    return Math.max(4, Math.min(40, mag * 4));
  };

  // summary stats
  const stats = useMemo(() => {
    if (!earthquakes.length) return { count: 0, maxMag: 0 };
    const count = earthquakes.length;
    const maxMag = Math.max(...earthquakes.map(e => e.mag || 0));
    return { count, maxMag };
  }, [earthquakes]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <header className="flex items-center justify-between px-6 py-4 bg-white shadow-md">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-lg p-3 shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold">Earthquake Visualizer</h1>
            <p className="text-sm text-slate-500">Real-time earthquakes (past 24 hours) · USGS</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-600">Auto-refresh</div>
          <label className="inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-300 transition" />
          </label>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Left sidebar: Controls */}
        <aside className="w-full lg:w-96 p-6 bg-white border-r border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-md font-medium">Filters</h2>
              <p className="text-xs text-slate-500">Narrow down the events shown on the map</p>
            </div>
            <div className="text-sm text-slate-600">Events: <span className="font-semibold">{stats.count}</span></div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Magnitude range</label>
              <div className="flex items-center gap-2 mt-2">
                <input type="number" step="0.1" min="-1" max="10" value={minMag} onChange={e => setMinMag(Number(e.target.value))} className="w-20 p-2 border rounded" />
                <span className="text-slate-400">to</span>
                <input type="number" step="0.1" min="-1" max="10" value={maxMag} onChange={e => setMaxMag(Number(e.target.value))} className="w-20 p-2 border rounded" />
              </div>
              <div className="mt-2 text-xs text-slate-500">Tip: try <span className="font-medium">4 - 10</span> to show stronger quakes.</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Search location</label>
              <input type="search" placeholder="search place (e.g., Alaska)" value={query} onChange={e=>setQuery(e.target.value)} className="mt-2 w-full p-2 border rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Color mode</label>
              <div className="mt-2 flex gap-2">
                <button onClick={()=>setColorMode('severity')} className={`px-3 py-1 rounded border ${colorMode==='severity' ? 'bg-slate-800 text-white' : ''}`}>Severity</button>
                <button onClick={()=>setColorMode('depth')} className={`px-3 py-1 rounded border ${colorMode==='depth' ? 'bg-slate-800 text-white' : ''}`}>Depth</button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-sm font-medium">Latest</h3>
              <p className="text-xs text-slate-500 mt-1">Max magnitude (24h): <span className="font-semibold">{stats.maxMag.toFixed(1)}</span></p>
              <div className="mt-3 flex gap-2">
                <button onClick={fetchData} className="px-3 py-2 bg-blue-600 text-white rounded shadow">Refresh now</button>
                <button onClick={()=>{ setMinMag(0); setMaxMag(10); setQuery(''); setColorMode('severity'); }} className="px-3 py-2 border rounded">Reset</button>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6">
            <h4 className="text-sm font-medium">Legend</h4>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-700">
              <div className="flex items-center gap-2"><span className="w-4 h-4 bg-green-600 rounded-full"/> <span>Mag &lt; 3</span></div>
              <div className="flex items-center gap-2"><span className="w-4 h-4 bg-yellow-400 rounded-full"/> <span>3 - 4</span></div>
              <div className="flex items-center gap-2"><span className="w-4 h-4 bg-orange-500 rounded-full"/> <span>4 - 5</span></div>
              <div className="flex items-center gap-2"><span className="w-4 h-4 bg-red-600 rounded-full"/> <span>5+</span></div>
            </div>
          </div>

          {/* Recent list */}
          <div className="mt-6">
            <h4 className="text-sm font-medium">Recent events ({filtered.length})</h4>
            <div className="mt-2 max-h-64 overflow-auto">
              {loading && <div className="text-sm text-slate-500">Loading events…</div>}
              {!loading && filtered.length === 0 && <div className="text-sm text-slate-500">No events match filters.</div>}
              {filtered.slice(0, 12).map(e => (
                <div key={e.id} className="p-2 border-b last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">M {e.mag.toFixed(1)} • {e.place}</div>
                      <div className="text-xs text-slate-500">{format(new Date(e.time), 'PPpp')} • {e.depth} km</div>
                    </div>
                    <div>
                      <a href={e.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600">Details</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </aside>

        {/* Map area */}
        <section className="flex-1 relative min-h-[500px]">
          <div className="absolute top-4 left-4 z-20 bg-white/80 backdrop-blur rounded-lg p-2 shadow">
            <div className="text-xs text-slate-700">Showing: <span className="font-semibold">{filtered.length}</span> events</div>
            <div className="text-xs text-slate-500">Tip: click a marker for details</div>
          </div>

          <div className="h-full">
            {error && (
              <div className="p-4 text-center text-red-600">Error: {error}</div>
            )}

            <MapContainer center={[20,0]} zoom={2} scrollWheelZoom={true} className="h-full" zoomControl={false}>
              <ZoomControl position="bottomright" />
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />

              <FitBounds points={pointsForBounds} />

              {filtered.map(e => (
                <CircleMarker
                  key={e.id}
                  center={[e.lat, e.lon]}
                  radius={getRadius(e.mag)}
                  pathOptions={{ color: getColor(e), fillColor: getColor(e), fillOpacity: 0.7, weight: 1 }}
                >
                  <Popup>
                    <div className="text-sm">
                      <div className="font-semibold mb-1">M {e.mag.toFixed(1)} — {e.place}</div>
                      <div className="text-xs text-slate-600 mb-1">{format(new Date(e.time), 'PPpp')}</div>
                      <div className="text-xs">Depth: <span className="font-medium">{e.depth} km</span></div>
                      <div className="mt-2">
                        <a className="text-xs text-blue-600" href={e.url} target="_blank" rel="noreferrer">View USGS details</a>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

            </MapContainer>

            {/* loading indicator at bottom */}
            <div className="absolute bottom-4 right-4 z-30">
              <div className="bg-white/90 px-3 py-2 rounded shadow flex items-center gap-2">
                {loading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                )}
                <div className="text-xs text-slate-700">{loading ? 'Fetching data…' : 'Up-to-date'}</div>
              </div>
            </div>

          </div>
        </section>
      </main>

      <footer className="text-xs text-slate-500 p-4 text-center">
        Data source: USGS Earthquake Hazards Program · Feed: all_day.geojson
      </footer>
    </div>
  );
}
