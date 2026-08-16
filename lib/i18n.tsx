import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nManager, Platform } from "react-native";
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import { isRightToLeft, localeForLanguage, formatLocalDate, formatMoney, t } from "./i18n-core";
import type { Language, SupportedCurrency, TranslationKey, TranslationValues } from "./i18n-core";
import { requiresFxQuote } from "@/shared/currency-policy";

export * from "./i18n-core";

const LANGUAGE_STORAGE_KEY = "movefix.preference.language.v1";
const CURRENCY_STORAGE_KEY = "movefix.preference.currency.v1";

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
  const [currency, setCurrencyState] = useState<SupportedCurrency>("TRY");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([AsyncStorage.getItem(LANGUAGE_STORAGE_KEY), AsyncStorage.getItem(CURRENCY_STORAGE_KEY)])
      .then(([savedLanguage, savedCurrency]) => {
        if (!active) return;
        if (["tr", "en", "de", "fr", "ar", "ru"].includes(savedLanguage ?? "")) {
          setLanguageState(savedLanguage as Language);
        }
        // A non-TRY value can only originate from a future server-verified FX
        // rollout. Legacy/local values must not silently relabel TRY balances.
        if (savedCurrency === "TRY") setCurrencyState("TRY");
      })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const value = useMemo<LocalizationContextValue>(() => ({
    language,
    currency,
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
    setCurrency: async (nextCurrency) => {
      if (requiresFxQuote(nextCurrency)) throw new Error("CURRENCY_CONVERSION_NOT_CONFIGURED");
      setCurrencyState(nextCurrency);
      await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, nextCurrency);
    },
    translate: (key, values) => t(key, language, values),
    formatMoney: (amount) => formatMoney(amount, language),
    formatDate: (date) => formatLocalDate(date, language),
  }), [currency, language, ready]);

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
