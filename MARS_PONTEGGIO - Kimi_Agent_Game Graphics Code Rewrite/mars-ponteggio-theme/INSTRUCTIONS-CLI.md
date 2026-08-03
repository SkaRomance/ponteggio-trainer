# ISTRUZIONI CLI — Trasformazione Tema Mars Compliance per Ponteggio Trainer

## Obiettivo
Trasformare il simulatore 3D "Ponteggio Trainer" dal tema **Industrial Brutalist** (giallo/nero/CRT scanline/uppercase/Space Grotesk) al tema **Mars Compliance** (cream/verde smeraldo/Inter+Playfair/minimalista).

## Regola Fondamentale — Safety Colors 3D
I colori realistici dei materiali 3D (acciaio, legno, bronzo, alluminio, rame) **NON devono essere toccati**. Si modificano SOLO:
- Colori UI sovrapposta (testo 3D, HUD, pannelli)
- Colori degli stati (OK/errato/selezionato)
- Font del testo 3D

---

## FILE DA MODIFICARE

### 1. `src/index.css` — SOSTITUZIONE TOTALE
**Azione**: Sovrascrivere completamente il file con il contenuto fornito in `mars-theme/src/index.css`.

Cambiamenti principali:
- Background: `#1a1a1a` → `#f5f2ed` (cream Mars)
- Font: `'Space Grotesk'` → `'Inter'`
- Color testo: implicito scuro → `#0a0a0a`

---

### 2. `src/App.css` — SOSTITUZIONE TOTALE
**Azione**: Sovrascrivere completamente il file con il contenuto fornito in `mars-theme/src/App.css`.

Cambiamenti principali:
- Variabili CSS: giallo `#ffcc00` → verde `#1a472a`
- Sfondo nero `#050505` → cream `#f5f2ed`
- Rimosso: `text-transform: uppercase` globale
- Rimosso: CRT scanline effect
- Font: Space Grotesk → Inter + Playfair Display
- Header: bordo giallo spesso 4px → bordo sottile grigio 1px + sfondo bianco
- Bottoni: box-shadow spigolosa brutalist → pill shape con ombre soft
- Overlay: sfondo nero pieno → `rgba(10,10,10,0.85)` + `backdrop-filter: blur(8px)`
- Overlay content: bordo giallo 4px → bordo grigio 1px + sfondo bianco + border-radius 16px
- Progress bar: giallo → verde Mars
- Health bar: giallo neon → gradiente verde Mars
- Menu: bordo giallo 10px spesso → bordo grigio sottile 1px + shadow soft

---

### 3. `src/App.tsx` — MODIFICHE MIRATE

#### Riga 75-90: Game Over Overlay
Trovare il blocco `isGameOver` e sostituire lo stile inline dell'overlay:

**PRIMA:**
```tsx
<div className="overlay-content" style={{ border: '4px solid var(--danger-red)' }}>
  <h1 style={{ color: 'var(--danger-red)', fontSize: 'clamp(2rem, 8vw, 4rem)', fontWeight: 900, marginBottom: '1.5rem' }}>
```

**DOPO:**
```tsx
<div className="overlay-content" data-variant="danger">
  <h1>
```

Le classi CSS `.overlay-content` e `.overlay-content h1` nel nuovo `App.css` gestiscono già lo stile. Il `data-variant="danger"` attiva il colore rosso sull'h1 tramite regola CSS:
```css
.overlay-content[data-variant="danger"] h1 { color: var(--safety-red); }
```

#### Riga 95-117: Completed Overlay
Trovare il blocco `currentPhase === 'completed'`:

**PRIMA:**
```tsx
<div className="overlay-content">
  <h1 style={{ color: 'var(--mars-yellow)', fontSize: 'clamp(2rem, 8vw, 4rem)', fontWeight: 900, marginBottom: '1.5rem' }}>
```

**DOPO:**
```tsx
<div className="overlay-content">
  <h1>
```

Le classi CSS `.overlay-content h1` impostano già il colore verde Mars.

#### Riga 124-135: Header
Aggiungere il logo Mars a sinistra del titolo, prima di `<h1 className="game-title">`:

**DOPO:**
```tsx
<header className="game-header">
  <div className="header-left">
    <img 
      src="/logo-mars.png" 
      alt="MARS" 
      style={{ height: 32, width: 'auto', marginRight: 12 }} 
    />
    <h1 className="game-title">
      <FormattedMessage id="app.title" defaultMessage="MARS-Safe Ponteggio Trainer" />
    </h1>
    <LanguageSelector />
  </div>
  ...
```

**Nota**: Copiare il file logo fornito dall'utente in `public/logo-mars.png`. Per la versione su sfondo scuro (overlay), usare `public/logo-mars-white.png`.

#### Riga 149-164: Warehouse Progress
Lo stile inline sulla progress bar è già gestito dalle classi CSS. Verificare che la struttura HTML usi le classi:
- `.warehouse-progress` ✓ (già presente)
- `.progress-bar` ✓ (già presente)
- `.progress-fill` ✓ (già presente)

Non servono modifiche se le classi sono già quelle.

---

### 4. `src/scenes/WarehouseScene.tsx` — MODIFICHE COLORI 3D UI

#### Colori testo 3D sovrapposto (NON materiali dei componenti!)
Trovare tutte le occorrenze di `<Text ...>` e modificare solo queste props:

**PRIMA:**
```tsx
<Text fontSize={0.8} color="#FFCC00" font="Space Grotesk" anchorX="center">
  LOGISTICA E ISPEZIONE
</Text>
<Text position={[0, -0.8, 0]} fontSize={0.3} color="#ffffff" font="Space Grotesk">
  AREA VERIFICA COMPONENTI D.LGS 81/08
</Text>
```

**DOPO:**
```tsx
<Text fontSize={0.8} color="#1a472a" font="Inter" anchorX="center">
  LOGISTICA E ISPEZIONE
</Text>
<Text position={[0, -0.8, 0]} fontSize={0.3} color="#555555" font="Inter">
  AREA VERIFICA COMPONENTI D.LGS 81/08
</Text>
```

**PRIMA:**
```tsx
<Text position={[0, 1.2, 0]} fontSize={0.2} color="#00ff00" font="Space Grotesk">✓ OK</Text>
```

**DOPO:**
```tsx
<Text position={[0, 1.2, 0]} fontSize={0.2} color="#16A34A" font="Inter">✓ OK</Text>
```

**PRIMA:**
```tsx
<Text position={[0, 0, 0.02]} fontSize={0.15} color="#00ffff" font="Space Grotesk">[E] ISPEZIONA</Text>
```

**DOPO:**
```tsx
<Text position={[0, 0, 0.02]} fontSize={0.15} color="#2d6a4f" font="Inter">[E] ISPEZIONA</Text>
```

#### Materiali 3D realistici — NON TOCCARE
I colori dei materiali dei componenti ponteggio devono restare invariati:
- `'#555'` basetta (grigio acciaio)
- `'#2d5a9e'` telaio (blu industriale)
- `'#777'` impalcato
- `'#999'` corrente/traverso/diagonale
- `'#8B4513'` fermapiede/tavola (marrone legno)
- `'#ccaa00'` mantovana (oro/giallo realistico)
- `'#cd7f32'` palina_terra/messa_a_terra (bronzo)

Questi sono oggetti reali e il loro colore è significativo per la sicurezza.

#### Ambiente 3D
L'ambiente industriale (pavimento `#1a1a1a`, mura `#222`, gridHelper) può essere mantenuto così com'è — è realistico per un magazzino. Alternativamente, se si vuole un look più "Mars", si può schiarire leggermente:
- Pavimento: `#1a1a1a` → `#2a2a2a` (opzionale)
- Mura: `#222` → `#333` (opzionale)

---

### 5. Altri file scena (`TransportScene`, `StorageScene`, `AssemblyScene`, `UseScene`, `DisassemblyScene`, `ReturnScene`, `PlaceholderScene`)

**Azione**: Cercare in ogni file scena le stesse occorrenze di:
- `color="#FFCC00"` o `#ffcc00` → sostituire con `#1a472a`
- `color="#00ff00"` → sostituire con `#16A34A`
- `color="#00ffff"` → sostituire con `#2d6a4f`
- `font="Space Grotesk"` → sostituire con `font="Inter"`

I colori dei materiali 3D reali NON vanno toccati.

---

### 6. Componenti UI — Verifica classi CSS

I componenti UI (`StartMenu`, `HealthBar`, `ScoreDisplay`, `PhaseSelector`, `ComponentInspection`, `DemoEndOverlay`, `ControlsHelp`, `VideoTutorial`) dovrebbero già usare le classi CSS definite in `App.css`:
- `.start-menu`, `.menu-content`, `.menu-title`, `.start-btn`
- `.overlay-container`, `.overlay-content`
- `.inspection-modal`, `.inspection-header`, `.inspection-content`
- `.btn-usable`, `.btn-damaged`
- `.instructions-panel`
- `.phase-nav`, `.phase-btn`
- `.language-selector`

**Se un componente ha stili inline** (style={{ ... }}) che sovrascrivono le classi CSS, sostituire quegli stili inline con le classi CSS equivalenti, oppure rimuovere gli stili inline se le classi CSS sono già sufficienti.

---

### 7. `index.html` — Font Google

**Azione**: Aggiungere nel `<head>` il link ai font Mars (se non già presente):

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
```

**Rimuovere** (se presente) il vecchio link a Space Grotesk:
```html
<!-- RIMUOVERE -->
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;500;700;900&display=swap" rel="stylesheet">
```

---

### 8. Logo Mars — Asset

**Azione**: 
1. Copiare il logo fornito dall'utente (`LOGO MARS.png`) in:
   - `public/logo-mars.png` (versione colorata per sfondo chiaro)
   - `public/logo-mars-white.png` (versione bianca per header dark/overlay)
2. Se necessario, convertire in SVG per migliore qualità (opzionale).

---

### 9. `src/i18n` — Eventuali testi uppercase

**Azione**: Se i testi di traduzione sono in MAIUSCOLO (es. "GAME OVER", "HAI COMMESSO ERRORI CRITICI"), convertirli in formato normale con prima lettera maiuscola:
- `"GAME OVER"` → `"Game Over"`
- `"HAI COMMESSO ERRORI CRITICI NELLA SICUREZZA"` → `"Hai commesso errori critici nella sicurezza"`

Il nuovo tema NON forza più l'uppercase via CSS.

---

## CHECKLIST FINALE

- [ ] `src/index.css` sovrascritto con tema Mars
- [ ] `src/App.css` sovrascritto con tema Mars
- [ ] `src/App.tsx` — colori inline overlay cambiati in classi CSS
- [ ] `src/App.tsx` — logo Mars aggiunto nell'header
- [ ] `src/scenes/WarehouseScene.tsx` — colori Text 3D cambiati a verde Mars
- [ ] `src/scenes/*` — altre scene controllate per colori Text 3D
- [ ] Font Space Grotesk rimosso da `index.html`, Inter + Playfair Display aggiunti
- [ ] Logo Mars copiato in `public/`
- [ ] Testi i18n convertiti da uppercase a formato normale (opzionale)
- [ ] Colori materiali 3D reali NON modificati
- [ ] Build testata con `npm run build`
