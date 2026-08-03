# AUDIT GRAFICO — Ponteggio Trainer → Mars Compliance Theme

## 1. Architettura dell'App
Il progetto è un **simulatore 3D interattivo** (non un quiz testuale) basato su:
- React 18 + TypeScript + Vite
- React Three Fiber (@react-three/fiber) per rendering 3D
- React Three Drei per controlli camera, ambiente, testo 3D
- Zustand (stores/gameStore.ts, stores/inspectionStore.ts) per stato
- react-intl per internazionalizzazione (IT/EN/AR)

## 2. Struttura File Analizzati
```
src/
├── App.tsx              # Root component, routing per fasi, overlay
├── App.css              # Tema Industrial Brutalist (GIALL0/NER0)
├── index.css            # Base styles nero + Space Grotesk
├── main.tsx             # Entry point
├── components/
│   ├── ui/              # StartMenu, HealthBar, ScoreDisplay, PhaseSelector, LanguageSelector, DemoEndOverlay
│   └── game/            # Avatar3D, ComponentInspection, Component3DView, ControlsHelp, VideoTutorial
├── scenes/              # WarehouseScene, TransportScene, StorageScene, AssemblyScene, UseScene, DisassemblyScene, ReturnScene, PlaceholderScene
├── stores/              # gameStore.ts, inspectionStore.ts
└── i18n/                # Messaggi tradotti
```

## 3. Tema Attuale — Industrial Brutalist
| Elemento | Valore Attuale |
|----------|----------------|
| Font | Space Grotesk (tutto uppercase) |
| Background | `#050505` nero totale |
| Primary | `#ffcc00` giallo industriale |
| Bordi UI | 4px solid giallo |
| Ombre | Box-shadow spigolose 20px nero |
| Overlay | Sfondo nero pieno, bordi gialli |
| CRT | Scanline effect sovrapposto |
| Health bar | Giallo neon con glow |
| 3D text | Giallo `#FFCC00`, cyan `#00ffff`, verde neon `#00ff00` |
| Materiali 3D | Realistici (acciaio, legno, bronzo) — OK |

## 4. Tema Target — Mars Compliance
| Elemento | Valore Target |
|----------|---------------|
| Font | Inter (body) + Playfair Display (titoli) |
| Background | `#f5f2ed` cream |
| Primary | `#1a472a` verde smeraldo |
| Bordi UI | 1px solid `#d1cdc7` grigio chiaro |
| Ombre | Soft shadow 0 4px 24px rgba(0,0,0,0.06) |
| Overlay | Sfondo `rgba(10,10,10,0.85)` + blur, card bianca |
| CRT | RIMOSSO |
| Health bar | Gradient verde Mars |
| 3D text | Verde Mars `#1a472a`, safety green `#16A34A`, verde light `#2d6a4f` |
| Materiali 3D | Invariati (realistici) |

## 5. Mappatura Colori — UI vs Safety
### UI (Brand Mars)
- Header, bottoni, progress bar, badge → verde Mars `#1a472a`
- Card, modali, pannelli → bianco `#ffffff` su cream `#f5f2ed`
- Testo → `#0a0a0a` / `#333333` / `#555555`
- Bordi → `#d1cdc7`
- Overlay backdrop → `rgba(10,10,10,0.85)`

### Safety (Reale, oggetti 3D)
- Cartelli gialli reali → `#FFD700` (mantenuto nelle texture/illustrazioni)
- Giubbotti arancioni → `#FF6600` (mantenuto)
- Stato OK / checkmark → `#16A34A` (safety green)
- Stato errore / pericolo → `#DC2626` (safety red)
- Materiali 3D ponteggio → invariati (`#555`, `#2d5a9e`, `#777`, `#999`, `#8B4513`, `#ccaa00`, `#cd7f32`)

## 6. Criticità Identificate
1. **CRT Scanline**: effetto datato e in contrasto con l'eleganza Mars. Rimosso.
2. **Uppercase forzato**: il CSS globale impone `text-transform: uppercase`. Rimos-so.
3. **Bordi spessi gialli**: stile brutalist non allineato al brand minimalista. Sostituiti con bordi sottili grigi.
4. **Box-shadow spigolose**: 20px offset nero → sostituite con ombre soft diffuse.
5. **Colori 3D UI**: testo sovrapposto alla scena in giallo/cyan/verde neon → verde Mars.
6. **Font 3D**: Space Grotesk → Inter.
7. **Mancanza logo**: l'header ha solo testo, nessun logo Mars.

## 7. File da Modificare (in ordine di priorità)
1. `src/App.css` → sostituzione totale
2. `src/index.css` → sostituzione totale
3. `src/App.tsx` → modifice inline (colori overlay, logo header)
4. `src/scenes/WarehouseScene.tsx` → colori Text 3D + font
5. `src/scenes/*` (altre scene) → stesse modifiche Text 3D
6. `index.html` → font Google
7. `public/` → logo Mars asset
8. `src/i18n/*` → rimuovere uppercase dai testi (opzionale)

## 8. Output Prodotto
- `mars-theme/src/App.css` — nuovo tema CSS completo
- `mars-theme/src/index.css` — base styles Mars
- `mars-theme/INSTRUCTIONS-CLI.md` — guida passo-passo per l'agente CLI
