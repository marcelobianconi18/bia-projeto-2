import { GeoSignalHotspot as Hotspot } from "../../types";

const IS_REAL_ONLY = import.meta.env.VITE_REAL_ONLY === 'true';

export const STATIC_HOTSPOTS: Hotspot[] = IS_REAL_ONLY ? [] : [
    {
        id: "1",
        point: { lat: -25.4178, lng: -49.2667 },
        properties: { id: "1", kind: "CUSTOM_PIN", name: 'Centro Cívico', score: 98 },
        provenance: { label: 'DERIVED', source: 'Static Mock', method: 'Manual Entry', notes: 'Mock data for dev' }
    },
    {
        id: "2",
        point: { lat: -23.5891, lng: -46.6350 },
        properties: { id: "2", kind: "CUSTOM_PIN", name: 'Vila Mariana', score: 94 },
        provenance: { label: 'DERIVED', source: 'Modelagem local', method: 'Heuristic', notes: 'Mock' }
    },
    {
        id: "3",
        point: { lat: -23.5670, lng: -46.7020 },
        properties: { id: "3", kind: "CUSTOM_PIN", name: 'Pinheiros', score: 89 },
        provenance: { label: 'DERIVED', source: 'Modelagem local', method: 'Heuristic', notes: 'Mock' }
    },
    {
        id: "4",
        point: { lat: -23.5838, lng: -46.6784 },
        properties: { id: "4", kind: "CUSTOM_PIN", name: 'Itaim Bibi', score: 85 },
        provenance: { label: 'DERIVED', source: 'Modelagem local', method: 'Heuristic', notes: 'Mock' }
    },
    {
        id: "5",
        point: { lat: -23.5663, lng: -46.6673 },
        properties: { id: "5", kind: "CUSTOM_PIN", name: 'Jardins', score: 82 },
        provenance: { label: 'DERIVED', source: 'Modelagem local', method: 'Heuristic', notes: 'Mock' }
    },
];
