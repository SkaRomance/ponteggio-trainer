# Security Headers

`vercel.json` now applies baseline hardening headers and a CSP that stays compatible with the current SPA build.

- Google Fonts are currently loaded from both `index.html` and the compiled app CSS, so the CSP allows `https://fonts.googleapis.com` in `style-src` and `https://fonts.gstatic.com` in `font-src`.
- The CSP keeps `'unsafe-inline'` in `style-src` because the current React app uses inline `style` props in multiple scenes and UI components. Tightening this would require moving those styles into CSS classes or CSS variables first.
- `Permissions-Policy` only disables clearly unused capabilities. It does not block fullscreen or WebXR-related capabilities because the runtime includes fullscreen controls and a WebXR session bridge.

If the app is tightened later, the clean path is:

1. Self-host the fonts or remove the duplicate external font imports.
2. Replace inline React `style` props with CSS-driven styling.
3. Then remove the external font allowlist entries and `'unsafe-inline'` from the CSP.
