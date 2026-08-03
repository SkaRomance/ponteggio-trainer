# Mars Compliance — Design System per Quiz Game (Ponteggio Trainer)

## 1. Filosofia
Stile moderno, minimalista, professionale. Ispirato al sito marscompliance.com: molto spazio bianco, tipografia elegante, card pulite con bordi sottili, colori naturali e sofisticati. L'interfaccia deve trasmettere fiducia, competenza e chiarezza — qualità fondamentali per la formazione sulla sicurezza.

---

## 2. Palette Colori

### Brand Colors (Mars Compliance)
| Nome | Hex | Uso |
|------|-----|-----|
| **Mars Green** | `#1a472a` | Titoli, bottoni primari, numeri, accenti, badge |
| **Mars Green Light** | `#2d6a4f` | Hover stati attivi, gradienti, link |
| **Mars Green Pale** | `#e8f5e9` | Sfondi badge, tag, stati secondari, checkbox checked |
| **Cream** | `#f5f2ed` | Sfondo principale app, sezioni alternate |
| **Light Cream** | `#faf9f7` | Sfondo card, modali, pannelli interni |
| **Dark** | `#0a0a0a` | Testi principali, card scure (rischio, footer), header |
| **Charcoal** | `#333333` | Testi secondari, sottotitoli |
| **Text Secondary** | `#555555` | Descrizioni, meta testi |
| **Border** | `#d1cdc7` | Bordi card, separatori, outline input |
| **White** | `#ffffff` | Sfondi puliti, testo su dark |

### Safety Colors (REALISTICI — non alterabili dal brand)
Questi colori rappresentano oggetti reali di sicurezza e devono restare fedeli alla realtà:
| Nome | Hex | Uso |
|------|-----|-----|
| **Safety Yellow** | `#FFD700` | Cartelli attenzione, giubbotti alta visibilità, caschi, nastri |
| **Safety Orange** | `#FF6600` | Attrezzature, coni, barriere, giubbotti alternativi |
| **Safety Red** | `#DC2626` | Cartelli pericolo/divieto, errori quiz, allarmi, caschi rossi |
| **Safety Blue** | `#2563EB` | Cartelli obbligo, segnali informativi DPI |
| **Safety Green** | `#16A34A` | Cartelli soccorso/primo soccorso, uscite di emergenza |
| **Safety White** | `#F3F4F6` | Cartelli divieto (sfondo), caschi bianchi |
| **Safety Black** | `#111827` | Cartelli divieto (simbolo), testo su giallo |

**REGOLA FERREA**: i Safety Colors possono apparire SOLO in:
- Immagini/icone di oggetti reali (cartelli, giubbotti, caschi, attrezzature, ponteggi)
- Badge di stato "Pericolo", "Obbligo", "Divieto", "Attenzione"
- Barre di progresso errore (rosso) o successo (verde safety)
- Non usare come colori primari della UI (bottoni principali, header, sfondo)

---

## 3. Tipografia
| Elemento | Font | Peso | Size (mobile/desktop) | Colore |
|----------|------|------|----------------------|--------|
| H1 (Hero) | Playfair Display / Georgia | 700 | 36px / 56px | Dark o Mars Green |
| H2 (Sezione) | Playfair Display / Georgia | 700 | 28px / 42px | Dark |
| H3 (Card title) | Inter / system-ui | 700 | 20px / 24px | Dark |
| Body | Inter / system-ui | 400 | 16px / 18px | Charcoal |
| Label / Meta | Inter / system-ui | 500 | 12px / 13px | Text Secondary |
| Number / Stat | Inter / system-ui | 800 | 48px / 72px | Mars Green |
| Button | Inter / system-ui | 600 | 14px / 16px | White (su Mars Green) |

**Line-height**: 1.4 per titoli, 1.6 per body.
**Letter-spacing**: -0.02em per titoli serif, 0.02em per label uppercase.

---

## 4. Spaziature & Layout
- **Container max-width**: 720px per contenuto quiz (mobile-first), 960px per landing.
- **Padding card**: 24px (mobile) / 32px (desktop).
- **Gap tra elementi**: 16px standard, 24px tra sezioni, 32px tra blocchi.
- **Border-radius**: 
  - Card: 16px
  - Button primary: 999px (pill shape)
  - Button secondary: 12px
  - Badge/tag: 999px
  - Input: 12px
  - Modal: 20px
  - Progress bar track: 999px
- **Ombre**:
  - Card: `0 4px 24px rgba(0,0,0,0.06)`
  - Modal: `0 12px 48px rgba(0,0,0,0.12)`
  - Hover card: `0 8px 32px rgba(0,0,0,0.10)`

---

## 5. Componenti UI

### Header
- Sfondo: trasparente su hero, Mars Green (`#1a472a`) quando scrollato o su schermate interne.
- Logo Mars a sinistra (diamante verde + "MARS" in nero su sfondo chiaro, bianco su sfondo scuro).
- Nav/azioni a destra: testo bianco o dark a seconda del tema.
- Altezza: 64px.
- Border-bottom sottile su sfondo chiaro: `1px solid Border`.

### Hero / Landing Screen
- Sfondo: Cream (`#f5f2ed`) con pattern sottile di linee geometriche (opzionale, in verde 5% opacità).
- Titolo grande serif, sottotitolo in charcoal.
- Badge "PONTEGGIO TRAINER" in pill verde con bordo.
- Bottoni: 
  - Primary: Mars Green, pill, bianco, icona freccia.
  - Secondary: outline Mars Green, pill, testo Mars Green.
- Statistiche in riga: numeri grandi in Mars Green, label sotto.

### Quiz Card (domanda)
- Sfondo: Light Cream (`#faf9f7`).
- Border: `1px solid Border`.
- Border-radius: 16px.
- Padding: 32px.
- Header card: numero domanda (verde, 48px) + counter "03 / 07" a destra.
- Immagine domanda: border-radius 12px, ombra soft, aspect-ratio 16/9, object-fit cover.
- Testo domanda: H3, dark, peso 700.

### Answer Option
- Sfondo: White (`#ffffff`).
- Border: `2px solid Border`.
- Border-radius: 12px.
- Padding: 16px 20px.
- Hover: border diventa Mars Green Light, ombra soft appare.
- Selezionato: border Mars Green, sfondo Mars Green Pale, checkmark verde.
- Corretto: border Safety Green, sfondo `#dcfce7`, check verde.
- Errato: border Safety Red, sfondo `#fee2e2`, X rossa.
- Transizione: `all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`.

### Progress Bar
- Track: altezza 8px, border-radius 999px, sfondo `#e5e5e5`.
- Fill: Mars Green, border-radius 999px.
- Animazione: `width` con `transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1)`.
- Sopra la barra: label "Domanda 3 di 7" in meta testo.

### Feedback Toast / Modal
- Corretto: sfondo Safety Green `#16A34A`, testo bianco, icona check cerchiata.
- Errato: sfondo Safety Red `#DC2626`, testo bianco, icona X cerchiata.
- Info: sfondo Mars Green, testo bianco.
- Posizione: top-center, slide-in dall'alto.
- Border-radius: 12px.
- Ombra: `0 8px 32px rgba(0,0,0,0.15)`.

### Result Screen
- Sfondo: Cream o Mars Green (gradiente sottile).
- Score grande al centro: numero in 72px Mars Green.
- Messaggio: serif, 28px.
- Card riepilogo: Light Cream, elenco risposte corrette/errate con icone colorate.
- Bottone "Riprova" outline, bottone "Torna all'indice" primary.

### Footer
- Sfondo: Dark (`#0a0a0a`).
- Testo: grigio chiaro `#9ca3af`.
- Logo Mars in bianco / scala di grigi.
- Links: hover in Mars Green Pale.

---

## 6. Animazioni & Transizioni
| Interazione | Effetto | Durata | Easing |
|-------------|---------|--------|--------|
| Card enter | fade-in + translateY(16px → 0) | 0.5s | ease-out |
| Button hover | scale(1.02) + ombra aumenta | 0.2s | ease |
| Answer select | border-color + background | 0.2s | cubic-bezier(0.4,0,0.2,1) |
| Progress fill | width expand | 0.6s | cubic-bezier(0.4,0,0.2,1) |
| Toast enter | slideDown + fadeIn | 0.3s | ease-out |
| Screen transition | fade + slideX | 0.4s | ease-in-out |
| Number count-up | animazione contatore | 1.5s | ease-out |

---

## 7. Dark Mode (opzionale)
- Sfondo: `#0f172a` (slate scuro)
- Card: `#1e293b`
- Testo: `#f8fafc`
- Mars Green diventa più luminoso: `#22c55e`
- Safety colors restano invariati.

---

## 8. Regole di Accessibilità
- Contrasto minimo WCAG AA per tutti i testi.
- Focus outline: `2px solid #2d6a4f` con offset 2px.
- Icone accompagnate sempre da testo o aria-label.
- Transizioni rispettano `prefers-reduced-motion`.
