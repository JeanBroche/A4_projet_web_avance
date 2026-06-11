import type { Activity } from '~/types'

export function createInitialActivities(): Activity[] {
  return [
    { id: 1, type: 'anomaly', title: 'Anomalie signalée', description: 'Une anomalie a été signalée sur la BOM de l\'OF-2024-0142.', userId: '4', user: 'Marie Dupont', date: new Date('2024-12-10T14:32:00'), meta: 'OF-2024-0142' },
    { id: 2, type: 'of_started', title: 'Batch démarré', description: 'Début de fabrication pour le bras articulé A320, 4 unités.', userId: '2', user: 'Jean Martin', date: new Date('2024-12-10T10:15:00'), meta: 'OF-2024-0142' },
    { id: 3, type: 'stock_updated', title: 'Stock mis à jour', description: 'Réception de 200 vis M6×20 — stock mis à jour (450 pcs).', userId: '3', user: 'Lucie Bernard', date: new Date('2024-12-10T09:05:00'), meta: 'VIS-M6-020' },
    { id: 4, type: 'login', title: 'Connexion', description: 'Connexion au système depuis le poste atelier 3.', userId: '2', user: 'Jean Martin', date: new Date('2024-12-10T08:47:00') },
    { id: 5, type: 'of_completed', title: 'Ordre de fabrication terminé', description: 'OF verrouillage train ATR clôturé avec succès — 6 unités.', userId: '4', user: 'Marie Dupont', date: new Date('2024-12-09T17:20:00'), meta: 'OF-2024-0139' },
    { id: 6, type: 'bom_validated', title: 'BOM validée', description: 'Nomenclature du support moteur B737 vérifiée et validée.', userId: '5', user: 'Paul Renaud', date: new Date('2024-12-09T15:00:00'), meta: 'OF-2024-0143' },
    { id: 7, type: 'stock_low', title: 'Alerte stock faible', description: 'Stock du joint torique NBR 20×2 tombé à 0 — rupture détectée.', user: 'Système', date: new Date('2024-12-09T12:44:00'), meta: 'JNT-NBR-202' },
    { id: 8, type: 'of_paused', title: 'Batch mis en pause', description: 'Fabrication du vérin hydraulique F/A-18 suspendue.', userId: '2', user: 'Jean Martin', date: new Date('2024-12-09T11:10:00'), meta: 'OF-2024-0140' },
    { id: 9, type: 'stock_updated', title: 'Stock mis à jour', description: 'Sortie de 5 roulements 6205-ZZ pour l\'OF-2024-0139.', userId: '3', user: 'Lucie Bernard', date: new Date('2024-12-09T09:30:00'), meta: 'RLM-6205-ZZ' },
    { id: 10, type: 'of_started', title: 'Batch démarré', description: 'Lancement de la fabrication du vérin hydraulique F/A-18.', userId: '2', user: 'Jean Martin', date: new Date('2024-12-08T13:55:00'), meta: 'OF-2024-0140' },
    { id: 11, type: 'anomaly', title: 'Anomalie signalée', description: 'Défaut de dimensionnement détecté sur l\'axe acier Ø12.', userId: '5', user: 'Paul Renaud', date: new Date('2024-12-08T11:20:00'), meta: 'AXE-012-500' },
    { id: 12, type: 'bom_validated', title: 'BOM validée', description: 'Nomenclature du bras articulé A320 soumise et validée.', userId: '4', user: 'Marie Dupont', date: new Date('2024-12-08T09:00:00'), meta: 'OF-2024-0142' },
    { id: 13, type: 'of_completed', title: 'Ordre de fabrication terminé', description: 'Soute cargo A400M finalisée — 2 unités livrées.', userId: '3', user: 'Lucie Bernard', date: new Date('2024-12-06T16:45:00'), meta: 'OF-2024-0141' },
    { id: 14, type: 'stock_low', title: 'Alerte stock faible', description: 'Axe acier Ø12 sous le seuil minimal (6 pcs / seuil : 10 pcs).', user: 'Système', date: new Date('2024-12-06T14:10:00'), meta: 'AXE-012-500' },
    { id: 15, type: 'login', title: 'Connexion', description: 'Connexion depuis le bureau technique.', userId: '5', user: 'Paul Renaud', date: new Date('2024-12-06T08:30:00') }
  ]
}
