import { SegnalazioneMappa } from '../entities/entities';
import { MAPPA_CONFIG } from './mappa.config';

// Dati finti generati attorno al centro della mappa.
// Alcuni pin sono volutamente vicinissimi per vedere il cluster.
const [lat, lng] = MAPPA_CONFIG.centro;

export const MOCK_SEGNALAZIONI_MAPPA: SegnalazioneMappa[] = [
    { id: 1, titolo: 'Buca profonda sulla carreggiata', stato: 'VISTO', latitudine: lat + 0.0100, longitudine: lng + 0.0120 },
    { id: 2, titolo: 'Lampione spento', stato: 'IN_APPROVAZIONE', latitudine: lat - 0.0080, longitudine: lng + 0.0050 },
    { id: 3, titolo: 'Rifiuti abbandonati al parco', stato: 'IN_LAVORAZIONE', latitudine: lat + 0.0040, longitudine: lng - 0.0110 },
    { id: 4, titolo: 'Panchina rotta', stato: 'RISOLTO', latitudine: lat - 0.0030, longitudine: lng - 0.0060 },
    { id: 5, titolo: 'Segnalazione duplicata', stato: 'SCARTATO', latitudine: lat + 0.0150, longitudine: lng - 0.0040 },
    { id: 6, titolo: 'Tombino aperto', stato: 'VISTO', latitudine: lat + 0.0001, longitudine: lng + 0.0001 },
    { id: 7, titolo: 'Marciapiede dissestato', stato: 'IN_APPROVAZIONE', latitudine: lat + 0.0003, longitudine: lng - 0.0002 },
    { id: 8, titolo: 'Graffiti sul muro della scuola', stato: 'IN_LAVORAZIONE', latitudine: lat - 0.0002, longitudine: lng + 0.0003 },
    { id: 9, titolo: 'Semaforo guasto', stato: 'RISOLTO', latitudine: lat - 0.0120, longitudine: lng - 0.0150 },
    { id: 10, titolo: 'Albero pericolante', stato: 'VISTO', latitudine: lat + 0.0070, longitudine: lng + 0.0025 },
];