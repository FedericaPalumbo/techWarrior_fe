// Ruoli dell'app (vedi README): il cittadino segnala problemi/proposte, l'ente comunale li gestisce.
// Alla registrazione il backend assegna in automatico 'cittadino'.
// NB: i valori devono coincidere con quelli usati dal backend del team.
export const USER_ROLES = ['cittadino', 'ente'] as const;
export type UserRole = typeof USER_ROLES[number];
// Record<UserRole, string> obbliga ad aggiungere l'etichetta quando si aggiunge un ruolo
export const USER_ROLE_LABELS: Record<UserRole, string> = {
    cittadino: 'Cittadino',
    ente: 'Ente comunale',
};

// ---- Segnalazioni ----
// Stati valutati dall'ente (vedi README). NB: i valori devono coincidere con l'enum
// "StatoSegnalazione" del DB: da confermare col team back.
export const STATI_SEGNALAZIONE = [
    'SEGNALATO', 'VISTO', 'IN_APPROVAZIONE', 'IN_LAVORAZIONE', 'RISOLTO', 'SCARTATO',
] as const;
export type StatoSegnalazione = typeof STATI_SEGNALAZIONE[number];

// Il front riceve dal back solo l'url dell'immagine: come viene salvata (file, storage, ecc.)
// è un dettaglio del back e non entra nel model del front.
export type SegnalazioneImmagine = {
    id: number,
    url: string
};

export type Segnalazione = {
    id: number,
    titolo: string,
    descrizione: string | null,
    stato: StatoSegnalazione,
    latitudine: number,
    longitudine: number,
    indirizzo: string | null,
    createdAt: string,
    immagini: SegnalazioneImmagine[]
};

// La "soluzione" proposta dall'utente (tabella proposte_segnalazione)
export type Proposta = {
    id: number,
    descrizione: string,
    segnalazioneId: number,
    createdAt: string
};