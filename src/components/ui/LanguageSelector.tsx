import { useGameStore } from '../../stores/gameStore';
import { locales, selectableLocales } from '../../i18n';
import type { Locale } from '../../i18n';

export default function LanguageSelector() {
  const { locale, setLocale } = useGameStore();

  if (selectableLocales.length <= 1) {
    return null;
  }

  return (
    <div className="language-selector">
      <select 
        value={locale} 
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="lang-select"
      >
        {selectableLocales.map((code) => (
          <option key={code} value={code}>
            {locales[code].name}
          </option>
        ))}
      </select>
    </div>
  );
}
