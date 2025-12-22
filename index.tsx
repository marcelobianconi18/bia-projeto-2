import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/index.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon2x from 'leaflet/dist/images/marker-icon-2x.png';
import icon from 'leaflet/dist/images/marker-icon.png';
import shadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: icon2x.indexOf('http') === 0 ? icon2x : undefined, // Vite handles imports as URLs usually, but let's be safe or just use the import
  iconUrl: icon,
  shadowUrl: shadow,
});
// Vite asset handling returns string URLs for image imports
L.Icon.Default.mergeOptions({
  iconRetinaUrl: icon2x,
  iconUrl: icon,
  shadowUrl: shadow,
});

import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);