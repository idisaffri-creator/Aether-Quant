/**
 * Lightweight i18n — English, Spanish, Chinese, Japanese.
 * No external deps. t(key) returns translated string.
 * Use <Translatable> component for inline replacement.
 */
import { useEffect, useState, useSyncExternalStore } from "react";

export type Locale = "en" | "es" | "zh" | "ja";

const STORAGE_KEY = "aether_locale";

const translations: Record<Locale, Record<string, string>> = {
  en: {
    "app.name": "Aether Energy",
    "app.tagline": "Algorithmic trading for energy commodities",
    "nav.terminal": "Terminal",
    "nav.agents": "Agents",
    "nav.features": "Features",
    "nav.pricing": "Pricing",
    "cta.launch": "Launch Dashboard",
    "cta.backtest": "Try a Backtest",
    "cta.signin": "Sign In",
    "cta.getstarted": "Get Started",
    "dashboard.title": "Dashboard",
    "dashboard.trades": "Trades executed",
    "dashboard.signals": "Signals processed",
    "dashboard.uptime": "Uptime",
    "trading.buy": "Buy",
    "trading.sell": "Sell",
    "trading.quantity": "Quantity",
    "trading.price": "Price",
    "trading.submit": "Submit Order",
    "common.loading": "Loading…",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.confirm": "Confirm",
    "common.error": "Something went wrong",
  },
  es: {
    "app.name": "Aether Energy",
    "app.tagline": "Trading algorítmico para materias primas energéticas",
    "nav.terminal": "Terminal",
    "nav.agents": "Agentes",
    "nav.features": "Características",
    "nav.pricing": "Precios",
    "cta.launch": "Abrir Panel",
    "cta.backtest": "Probar Backtest",
    "cta.signin": "Iniciar sesión",
    "cta.getstarted": "Empezar",
    "dashboard.title": "Panel",
    "dashboard.trades": "Operaciones ejecutadas",
    "dashboard.signals": "Señales procesadas",
    "dashboard.uptime": "Disponibilidad",
    "trading.buy": "Comprar",
    "trading.sell": "Vender",
    "trading.quantity": "Cantidad",
    "trading.price": "Precio",
    "trading.submit": "Enviar orden",
    "common.loading": "Cargando…",
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.delete": "Eliminar",
    "common.confirm": "Confirmar",
    "common.error": "Algo salió mal",
  },
  zh: {
    "app.name": "Aether Energy",
    "app.tagline": "能源大宗商品算法交易",
    "nav.terminal": "终端",
    "nav.agents": "代理",
    "nav.features": "功能",
    "nav.pricing": "价格",
    "cta.launch": "启动面板",
    "cta.backtest": "尝试回测",
    "cta.signin": "登录",
    "cta.getstarted": "开始使用",
    "dashboard.title": "面板",
    "dashboard.trades": "已执行交易",
    "dashboard.signals": "已处理信号",
    "dashboard.uptime": "正常运行时间",
    "trading.buy": "买入",
    "trading.sell": "卖出",
    "trading.quantity": "数量",
    "trading.price": "价格",
    "trading.submit": "提交订单",
    "common.loading": "加载中…",
    "common.save": "保存",
    "common.cancel": "取消",
    "common.delete": "删除",
    "common.confirm": "确认",
    "common.error": "出错了",
  },
  ja: {
    "app.name": "Aether Energy",
    "app.tagline": "エネルギー商品のアルゴリズム取引",
    "nav.terminal": "ターミナル",
    "nav.agents": "エージェント",
    "nav.features": "機能",
    "nav.pricing": "料金",
    "cta.launch": "ダッシュボードを開く",
    "cta.backtest": "バックテストを試す",
    "cta.signin": "サインイン",
    "cta.getstarted": "はじめる",
    "dashboard.title": "ダッシュボード",
    "dashboard.trades": "実行された取引",
    "dashboard.signals": "処理されたシグナル",
    "dashboard.uptime": "稼働率",
    "trading.buy": "買い",
    "trading.sell": "売り",
    "trading.quantity": "数量",
    "trading.price": "価格",
    "trading.submit": "注文を送信",
    "common.loading": "読み込み中…",
    "common.save": "保存",
    "common.cancel": "キャンセル",
    "common.delete": "削除",
    "common.confirm": "確認",
    "common.error": "問題が発生しました",
  },
};

let currentLocale: Locale = (typeof localStorage !== "undefined" && (localStorage.getItem(STORAGE_KEY) as Locale)) || "en";

function notify() {
  window.dispatchEvent(new Event("aether:locale"));
}

export function t(key: string, fallback?: string): string {
  return translations[currentLocale]?.[key] ?? translations.en[key] ?? fallback ?? key;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, locale);
  }
  notify();
}

export function getLocale(): Locale {
  return currentLocale;
}

export function useLocale() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("aether:locale", cb);
      return () => window.removeEventListener("aether:locale", cb);
    },
    () => currentLocale,
    () => currentLocale
  );
}

export const SUPPORTED_LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
];