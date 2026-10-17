import { StatoSegnalazione } from '../entities';

// ESEMPIO: sostituisci centro e maxBounds con i valori del tuo comune (qui Vicenza).
// maxBounds = [[lat sud-ovest, lng sud-ovest], [lat nord-est, lng nord-est]]
// Le segnalazioni fuori da questo rettangolo non si vedono sulla mappa.
export const MAPPA_CONFIG = {
    centro: [45.5455, 11.5354] as [number, number],
    zoom: 13,
    zoomMin: 11,
    zoomMax: 19,
    maxBounds: [
        [45.45, 11.40],
        [45.65, 11.70],
    ] as [[number, number], [number, number]],

    tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; contributori di OpenStreetMap',

    // true = usa i dati finti (mappa.mock.ts), false = chiama le API del back
    usaDatiFinti: false,
};

// Ordine in cui compaiono i 5 stati nella legenda / nei chip (stessi valori dell'enum del backend)
export const STATI_ORDINE: readonly StatoSegnalazione[] = [
    'SEGNALATO',
    'IN_APPROVAZIONE',
    'IN_LAVORAZIONE',
    'RISOLTO',
    'ANNULLATO',
];

// Stato -> colore del pin
export const STATO_COLORE: Record<StatoSegnalazione, string> = {
    SEGNALATO: '#2563eb',
    IN_APPROVAZIONE: '#d97706',
    IN_LAVORAZIONE: '#7c3aed',
    RISOLTO: '#16a34a',
    ANNULLATO: '#6b7280',
};

// Stato -> testo mostrato all'utente
export const STATO_LABEL: Record<StatoSegnalazione, string> = {
    SEGNALATO: 'Segnalato',
    IN_APPROVAZIONE: 'In approvazione',
    IN_LAVORAZIONE: 'In lavorazione',
    RISOLTO: 'Risolto',
    ANNULLATO: 'Annullato',
};