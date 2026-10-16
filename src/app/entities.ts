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