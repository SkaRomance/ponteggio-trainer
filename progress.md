Original prompt: `C:\Users\Salvatore Romano\Desktop\Personale\PROGETTI\ponteggio-trainer\MARS_PONTEGGIO - Kimi_Agent_Game Graphics Code Rewrite" midifica grafica su queste regole usa afents e skills in autonomia`

2026-04-25
- Analizzate le istruzioni Mars Compliance nei pacchetti `mars-ponteggio-theme` e `mars-quiz-ui`.
- Confermato che il progetto reale da aggiornare e il simulatore 3D in root `ponteggio-trainer`.
- Sostituita la baseline grafica brutalist con il tema Mars in `src/App.css`, `src/index.css` e `index.html`.
- Integrato il logo Mars in `public/` e nei punti chiave dell'interfaccia.
- Riallineati componenti React, overlay e pannelli HUD al nuovo sistema grafico Mars.
- Aggiornati i testi 3D scene/UI al sistema Mars, preservando i colori realistici dei materiali di sicurezza.
- Audit funzionale completato: individuati e chiusi i gap su tracking fasi, regole visibili, feedback errori/warning e logistica di fissaggio carico.
- Implementati `PhaseBriefing` e `NoticeCenter` per rendere espliciti obiettivi, regole critiche, successi e warning in-app.
- Aggiunto tracking `completedPhases` nello store e report finale con copertura fasi e riepilogo severita.
- Chiusa la regola di gameplay mancante nel trasporto: ora la partenza richiede carico completo, bilanciato e fissato.
- Rimosso l'uso dei `alert()` nelle scene principali, sostituiti da notifiche coerenti con il flusso Mars.
- Verifica finale completata: `npm run build` e `npx eslint src --ext .ts,.tsx` passano.

TODO
- Verificare in browser il comportamento finale su viewport desktop/mobile e l'impatto del font `Inter` su tutti i `Text` Drei.
- Valutare in un commit successivo la rimozione o attivazione delle parti legacy ancora non usate (`phaseScores`, `storageLocations`, parte del lifting avatar).
