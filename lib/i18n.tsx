import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nManager, Platform } from "react-native";
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import { isRightToLeft, localeForLanguage, formatLocalDate, formatMoney, t } from "./i18n-core";
import type { Language, SupportedCurrency, TranslationKey, TranslationValues } from "./i18n-core";

export * from "./i18n-core";

const LANGUAGE_STORAGE_KEY = "movefix.preference.language.v1";

type LocalizationContextValue = {
  language: Language;
  currency: SupportedCurrency;
  locale: string;
  isRTL: boolean;
  ready: boolean;
  setLanguage: (language: Language) => Promise<void>;
  setCurrency: (currency: SupportedCurrency) => Promise<void>;
  translate: (key: TranslationKey, values?: TranslationValues) => string;
  formatMoney: (amount: number) => string;
  formatDate: (value: Date | string | number) => string;
};

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

export function LocalizationProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>("tr");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((saved) => {
        if (!active || !["tr", "en", "de", "fr", "ar", "ru"].includes(saved ?? "")) return;
        setLanguageState(saved as Language);
      })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const value = useMemo<LocalizationContextValue>(() => ({
    language,
    currency: "TRY",
    locale: localeForLanguage(language),
    isRTL: isRightToLeft(language),
    ready,
    setLanguage: async (nextLanguage) => {
      setLanguageState(nextLanguage);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
      if (Platform.OS !== "web" && I18nManager.isRTL !== isRightToLeft(nextLanguage)) {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(isRightToLeft(nextLanguage));
      }
    },
    setCurrency: async (currency) => { if (currency !== "TRY") throw new Error("UNSUPPORTED_TRANSACTION_CURRENCY"); },
    translate: (key, values) => t(key, language, values),
    formatMoney: (amount) => formatMoney(amount, language),
    formatDate: (date) => formatLocalDate(date, language),
  }), [language, ready]);

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) throw new Error("useLocalization must be used inside LocalizationProvider");
  return context;
}

export function useTranslation() {
  const localization = useLocalization();
  return { ...localization, t: localization.translate };
}
