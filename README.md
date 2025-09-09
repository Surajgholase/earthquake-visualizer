# Earthquake Visualizer

Real-time earthquake visualizer using the USGS GeoJSON feed, React, Vite, Tailwind CSS, and React-Leaflet.

## Features
- Interactive map with circle markers sized by magnitude
- Color modes: severity (by magnitude) or depth
- Filters: magnitude range and location search
- Auto-refresh toggle and manual refresh
- Popups with magnitude, depth, time and USGS details

## Run locally

1. Unzip the project (if you downloaded the ZIP).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open the URL shown by Vite (usually http://localhost:5173).


## Notes
- The app fetches data from:
  `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson`
  
