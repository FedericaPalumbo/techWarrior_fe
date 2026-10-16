import { StatoSegnalazione } from '../entities/entities';

// ESEMPIO: sostituisci centro e maxBounds con i valori del tuo comune.
// maxBounds = [[lat sud-ovest, lng sud-ovest], [lat nord-est, lng nord-est]]
export const MAPPA_CONFIG = {
    centro: [41.9028, 12.4964] as [number, number],
    zoom: 13,
    zoomMin: 11,
    zoomMax: 19,
    maxBounds: [
        [41.75, 12.25],
        [42.05, 12.70],
    ] as [[number, number], [number, number]],

    tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; contributori di OpenStreetMap',

    // true = usa i dati finti (mappa.mock.ts), false = chiama le API del back
    usaDatiFinti: true,
};

// Ordine in cui compaiono i 5 stati nella legenda / nei chip
export const STATI_ORDINE: readonly StatoSegnalazione[] = [
    'VISTO',
    'IN_APPROVAZIONE',
    'IN_LAVORAZIONE',
    'RISOLTO',
    'SCARTATO',
];

// Stato -> colore del pin
export const STATO_COLORE: Record<StatoSegnalazione, string> = {
    VISTO: '#2563eb',
    IN_APPROVAZIONE: '#d97706',
    IN_LAVORAZIONE: '#7c3aed',
    RISOLTO: '#16a34a',
    SCARTATO: '#6b7280',
};

// Stato -> testo mostrato all'utente
export const STATO_LABEL: Record<StatoSegnalazione, string> = {
    VISTO: 'Visto',
    IN_APPROVAZIONE: 'In approvazione',
    IN_LAVORAZIONE: 'In lavorazione',
    RISOLTO: 'Risolto',
    SCARTATO: 'Scartato',
};