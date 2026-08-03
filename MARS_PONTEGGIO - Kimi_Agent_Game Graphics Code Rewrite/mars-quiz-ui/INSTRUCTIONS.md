# ISTRUZIONI PER AGENTE CLI — Integrazione Grafica Mars Compliance

## Overview
Questo pacchetto contiene il **design system completo** e il **codice sorgente UI** per trasformare il gioco "Ponteggio Trainer" in stile Mars Compliance (marscompliance.com).

## File in questo pacchetto
```
mars-quiz-ui/
├── design-system.md          # Specifiche complete colori, tipografia, componenti
├── INSTRUCTIONS.md           # Questo file
├── src/
│   ├── App.jsx               # App principale esempio (quiz game)
│   ├── styles/
│   │   ├── variables.css     # Variabili CSS custom properties
│   │   └── global.css        # Reset, utility classes, animazioni
│   └── components/
│       ├── Header.jsx        # Header con logo Mars
│       ├── HeroScreen.jsx    # Schermata landing
│       ├── QuizCard.jsx      # Card domanda
│       ├── AnswerOption.jsx  # Opzione risposta (stati: default/selected/correct/wrong)
│       ├── ProgressBar.jsx   # Barra avanzamento
│       ├── ResultScreen.jsx  # Schermata risultati + attestato
│       ├── SafetyBadge.jsx   # Badge colorati per oggetti sicurezza
│       └── Footer.jsx        # Footer dark Mars
```

## Passi di integrazione

### 1. Font
Aggiungere nel `<head>` di `index.html` (o importare nel CSS principale):
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
```

### 2. Variabili CSS
Copiare il contenuto di `src/styles/variables.css` all'inizio del file CSS globale dell'app (es. `index.css`, `globals.css`, `App.css`).

### 3. Stili Globali
Copiare il contenuto di `src/styles/global.css` nel CSS globale, subito dopo le variabili.

### 4. Mappatura Componenti
L'agente CLI deve mappare i componenti esistenti del gioco ai nuovi componenti Mars:

| Componente vecchio | Nuovo componente / Classe CSS | Note |
|-------------------|------------------------------|------|
| Header / Navbar | `Header.jsx` | Usa `variant="dark"` per schermate interne, `"light"` per hero |
| Schermata iniziale / Welcome | `HeroScreen.jsx` | Adattare testi, stats, callback `onStart` |
| Card domanda | `QuizCard.jsx` | Passare `question`, `currentIndex`, `totalQuestions`, `selectedAnswer`, `onSelectAnswer`, `showFeedback`, `isCorrect` |
| Opzioni risposta | `AnswerOption.jsx` | Stati: `default`, `selected`, `correct`, `wrong`. Mappare al vecchio click handler |
| Barra progresso | `ProgressBar.jsx` | `current` e `total` props |
| Schermata risultati | `ResultScreen.jsx` | Passare `score`, `total`, `onRetry`, `onHome` |
| Badge "Pericolo"/"Obbligo"/"Attenzione" | `SafetyBadge.jsx` | Tipi: `danger`, `warning`, `mandatory`, `safe`, `info` |
| Footer | `Footer.jsx` | Sostituire footer esistente |

### 5. Colori Safety — REGOLA CRITICA
I **Safety Colors** (`--safety-yellow`, `--safety-orange`, `--safety-red`, `--safety-blue`, `--safety-green`) devono essere usati **SOLO** per:
- Immagini/illustrazioni di oggetti reali (cartelli, giubbotti, caschi, attrezzature, ponteggi)
- Badge di stato che rappresentano proprio quegli oggetti o norme
- Stati di errore (rosso) o successo (verde safety) nelle risposte

**NON** usare safety colors per:
- Bottoni primari della UI (usare `var(--mars-green)`)
- Header, footer, sfondi principali
- Progress bar (usare `var(--mars-green)`)
- Link o navigazione

### 6. Immagini di sicurezza
Se nel gioco ci sono foto/illustrazioni di:
- Cartelli gialli → mantenere `#FFD700`
- Cartelli rossi → mantenere `#DC2626`
- Giubbotti arancioni → mantenere `#FF6600`
- Caschi, imbracature, ponteggi → colori realistici

Non applicare filtri o override del brand su queste immagini.

### 7. Logo Mars
Sostituire il logo esistente con il logo Mars Compliance (fornito dall'utente in `/mnt/agents/upload/LOGO MARS.png`).
Esportare in SVG o PNG trasparente e usare:
- Su sfondo chiaro: logo colorato originale
- Su sfondo scuro (header dark, footer): versione bianco o monocromatica

### 8. Tipografia
- Titoli grandi (hero, sezioni): `font-family: var(--font-serif)` (Playfair Display)
- Body, bottoni, label: `font-family: var(--font-sans)` (Inter)
- Numeri statistiche: Inter 800, colore Mars Green

### 9. Responsività
Tutte le dimensioni usano `clamp()` per adattarsi mobile/desktop. Verificare che il container non superi `720px` su quiz e `960px` su hero.

### 10. Animazioni
Le animazioni sono gestite via classi CSS:
- `.mars-animate-fade-in-up` — entrata fade + slide up
- `.mars-animate-slide-in-right` — entrata da destra
- `.mars-animate-count-up` — pop scale per numeri
- `.mars-stagger-N` — delay progressivo (1-4)

Aggiungere/rimuovere classi dinamicamente via React state.

## Checklist finale agente CLI
- [ ] Variabili CSS importate nel CSS globale
- [ ] Stili globali attivi (reset, utility, animazioni)
- [ ] Font Google caricati
- [ ] Header con logo Mars sostituito
- [ ] Colori brand applicati a UI (verde Mars, cream, dark)
- [ ] Safety colors preservati per oggetti reali
- [ ] Card quiz con bordi sottili e ombre soft
- [ ] Answer options con stati selected/correct/wrong
- [ ] Progress bar in Mars Green
- [ ] Schermata risultati con cerchio punteggio
- [ ] Footer dark Mars inserito
- [ ] Hover states e focus-visible attivi
- [ ] `prefers-reduced-motion` rispettato
