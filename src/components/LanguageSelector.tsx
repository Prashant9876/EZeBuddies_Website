import { getLanguageOptions, useLanguage, type LanguageCode } from "@/lib/language";

type LanguageSelectorProps = {
  className?: string;
};

export function LanguageSelector({ className }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useLanguage();
  const options = getLanguageOptions();

  return (
    <label className={`inline-flex items-center gap-2 text-sm text-muted-foreground ${className ?? ""}`.trim()}>
      <span>{t("common.language")}:</span>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as LanguageCode)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring"
        aria-label={t("common.language")}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </label>
  );
}
