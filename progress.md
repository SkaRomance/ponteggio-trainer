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
- Esteso l'audit con `phaseScores` reali per fase e report finale con esito, delta salute, crediti e rilievi principali.
- Rafforzato lo stoccaggio: supporti distanziati, blocco della danger zone, persistenza `storageLocations` e chiusura fase solo a scarico conforme.
- Portati i controlli DPI/ancoraggio anche nelle fasi `use` e `disassembly` per continuita operativa reale.
- Resi contestuali i testi dei controlli, limitato il selettore lingua alle localizzazioni coperte e ammorbidito il copy legale del menu.
- Eliminati gli errori console emersi nello smoke test: chiavi `react-intl` mancanti e uso improprio di `font=\"Inter\"` nei `Text` Drei.
- Reso canonico lo stato logistico tra `transport` e `storage` con `transportGroundItems` / `transportTruckItems` nello store.
- Bloccata la navigazione manuale delle fasi durante una run attiva per preservare coerenza di audit e scoring.
- Esteso il perimetro demo fino alla fase `transport`, lasciando bloccate le fasi successive.
- Smoke test eseguito con il client Playwright del workflow `develop-web-game`: nessun file `errors-0.json` generato dopo l'ultimo passaggio.
- Aggiornata la prima fase di ispezione per eliminare indizi preventivi sullo stato del pezzo: rimossi percentuale integrita, badge `OK/Danneggiato` e warning del tipo di danno prima della scelta.
- Migliorata la resa realistica dei componenti ispezionati: difetti visivi su modello 3D e magazzino tramite ruggine, crepe, deformazioni, ossidazione, usura e parti mancanti senza color coding verde/rosso di verdetto.
- Avviato passaggio "accreditamento/VR": aggiunti dati sessione corso obbligatori, session ID, scenario seed, export JSON/CSV, stampa report, log eventi e hook `render_game_to_text` / `advanceTime`.
- Resa ripetibile la generazione dei difetti con seed tracciato nel report e reset reale dello stato ispezione a ogni nuova run.
- Corrette criticita emerse dagli audit: doppia penalita in ispezione, controlli DPI basati sull'altezza dell'azione e non sulla Y avatar, ordine di smontaggio inverso reale e inventario minimo coerente con montaggio.
- Aggiunti controlli aula/VR: fullscreen con tasto F, pausa/reset e bridge WebXR quando il browser supporta `immersive-vr`.
- Aggiunto stato testuale accessibile della scena per screen reader e per verifiche automatiche.

TODO
- Fare una verifica visuale manuale in browser desktop/mobile: lo smoke headless e pulito lato console ma non e affidabile come controllo della resa 3D centrale.
- Valutare in un commit successivo il code-splitting Vite: il bundle JS supera ancora il warning dei 500 kB.
- Per un accreditamento formale servono ancora revisione legale/didattica, eventuale firma digitale/persistenza server-side delle evidenze e prove in visore VR reale.

Next wave proposed (2026-04-28)
- Portare auth e licenze da bootstrap env-driven a modello DB-first con bootstrap usato solo come seed iniziale o recovery path.
- Introdurre hardening auth: `bcrypt`/`argon2id`, rate limiting login, audit log successo/fallimento, invalidazione coerente di account/licenze revocati.
- Implementare control plane admin: ricerca tenant, emissione/rinnovo/revoca licenze, visione sessioni cross-tenant e storico termini.
- Aggiungere area cliente/docente con archivio tenant, dettagli sessione ed esposizione chiara di scadenze, updates e stato evidenza.
- Pianificazione dettagliata versionata in `docs/wave-03-platform-ops-plan.md`.

2026-04-28 - Sprint 1 Wave 3
- Rifattorizzato l auth helper verso modello DB-first incrementale con fallback bootstrap solo per seed o compatibilita.
- Introdotto hashing password `pbkdf2-sha256` con upgrade automatico da hash legacy SHA-256 al primo login valido.
- Aggiunte sessioni auth revocabili lato server e logout con revoca best-effort quando il backend auth e disponibile.
- Aggiunto rate limiting login con storage DB quando presente e fallback process-local in assenza del nuovo schema.
- Esteso lo schema logico con `auth_accounts`, `auth_sessions`, `auth_rate_limits` e indice `LOWER(email)`.
- Aggiunto audit log per `auth.login.success`, `auth.login.failure`, `auth.login.rate_limited`, `auth.logout` e lettura archivio admin.
- Aggiornati `.env.example`, `README.md` e `scripts/hash-password.mjs` per il nuovo formato hash e le env di hardening.
