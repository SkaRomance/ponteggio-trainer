import { useGameStore } from '../../stores/gameStore';
import { locales } from '../../i18n';
import type { Locale } from '../../i18n';

export default function LanguageSelector() {
  const { locale, setLocale } = useGameStore();

  return (
    <div className="language-selector">
      <select 
        value={locale} 
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="lang-select"
      >
        {Object.entries(locales).map(([code, { name }]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
