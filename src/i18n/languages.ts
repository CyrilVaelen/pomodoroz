import { locale as getSystemLocale } from "@tauri-apps/plugin-os";
import { LanguageCode } from "store/settings/types";
import { isTauri } from "utils/environment";

export const supportedLanguages: Array<{
  code: LanguageCode;
  label: string;
}> = [
  { code: "en", label: "English / English" },
  { code: "es", label: "Spanish / Español" },
  { code: "zh", label: "Chinese / 中文" },
  { code: "ja", label: "Japanese / 日本語" },
  { code: "pt", label: "Portuguese (Brazil) / Português (Brasil)" },
  { code: "de", label: "German / Deutsch" },
  { code: "fr", label: "French / Français" },
];

export const fallbackLanguage: LanguageCode = "en";

export const normalizeLanguageCode = (
  language?: string
): LanguageCode => {
  if (!language) {
    return fallbackLanguage;
  }

  const normalized = language.toLowerCase().split("-")[0];
  const isSupported = supportedLanguages.some(
    (option) => option.code === normalized
  );

  return isSupported ? (normalized as LanguageCode) : fallbackLanguage;
};

const detectBrowserLanguage = (): string | undefined => {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  const [primaryLanguage] = navigator.languages || [];

  return primaryLanguage || navigator.language;
};

export const detectSystemLanguageSync = (): LanguageCode =>
  normalizeLanguageCode(detectBrowserLanguage());

export const detectSystemLanguage = async (): Promise<LanguageCode> => {
  if (!isTauri()) {
    return detectSystemLanguageSync();
  }

  try {
    const locale = await getSystemLocale();
    return normalizeLanguageCode(locale || detectBrowserLanguage());
  } catch {
    return detectSystemLanguageSync();
  }
};
