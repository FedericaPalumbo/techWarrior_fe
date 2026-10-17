// Ruoli dell'app (vedi README): il cittadino segnala problemi/proposte, l'ente comunale li gestisce.
// Il backend li chiama 'CITTADINO' e 'COMUNE': la conversione avviene in un solo punto (AuthService,
// ROLE_FROM_API), così il resto del front continua a usare 'cittadino' / 'ente'.
// Alla registrazione il backend assegna in automatico 'CITTADINO'.
export const USER_ROLES = ['cittadino', 'ente'] as const;
export type UserRole = typeof USER_ROLES[number];
// Record<UserRole, string> obbliga ad aggiungere l'etichetta quando si aggiunge un ruolo
export const USER_ROLE_LABELS: Record<UserRole, string> = {
    cittadino: 'Cittadino',
    ente: 'Ente comunale',
};

// Il backend risponde sempre con { success: true, data: ... } (gli errori con { success: false, error: '...' }).
// Fa eccezione solo GET /users/profile, che restituisce direttamente l'utente.
export type ApiResponse<T> = {
    success: boolean,
    data: T
};

// ---- Segnalazioni ----
// Stati valutati dall'ente. I valori coincidono con l'enum "StatoSegnalazione" del backend (schema.prisma):
// SEGNALATO -> IN_APPROVAZIONE -> IN_LAVORAZIONE -> RISOLTO, e ANNULLATO da qualsiasi stato non finale.
export const STATI_SEGNALAZIONE = [
    'SEGNALATO', 'IN_APPROVAZIONE', 'IN_LAVORAZIONE', 'RISOLTO', 'ANNULLATO',
] as const;
export type StatoSegnalazione = typeof STATI_SEGNALAZIONE[number];

// Il front riceve dal back solo l'url dell'immagine (salvata su Cloudinary): come viene salvata
// è un dettaglio del back e non entra nel model del front.
export type SegnalazioneImmagine = {
    id: number,
    url: string
};

// latitudine e longitudine le ricava il backend dall'indirizzo (geocodifica) e nel DB sono facoltative
export type Segnalazione = {
    id: number,
    titolo: string,
    descrizione: string | null,
    stato: StatoSegnalazione,
    latitudine: number | null,
    longitudine: number | null,
    indirizzo: string,
    autoreId: number,
    createdAt: string,
    immagini: SegnalazioneImmagine[],
    voti?: number
};

// Quello che serve alla mappa: solo le segnalazioni con coordinate
export type SegnalazioneMappa = {
    id: number,
    titolo: string,
    stato: StatoSegnalazione,
    latitudine: number,
    longitudine: number
};

// La "soluzione" proposta dall'utente (tabella proposte_segnalazione)
export type Proposta = {
    id: number,
    descrizione: string,
    segnalazioneId: number,
    autoreId: number,
    createdAt: string
};

// ---- Iniziative (inviti per reclutare volontari) ----
// Rispecchia la tabella "iniziative". Le date arrivano dal back come stringhe ISO (TIMESTAMP).
// "partecipantiCount" e "partecipo" NON sono colonne della tabella: li calcola IniziativaService
// a partire dall'elenco "partecipanti" che il backend restituisce dentro ogni iniziativa.
export type Iniziativa = {
    id: number,
    titolo: string,
    descrizione: string,
    immagineUrl: string | null,
    dataInizio: string | null,
    dataFine: string | null,
    luogo: string | null,
    creatoreId: number,
    createdAt: string,
    updatedAt: string,
    partecipantiCount?: number,
    partecipo?: boolean
};