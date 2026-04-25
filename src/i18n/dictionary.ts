// 번역 사전 모듈 — 모든 컴포넌트/스크립트가 공용으로 사용

import ko from './ko.json';
import en from './en.json';

export type LangCode = 'ko' | 'en';

export const SUPPORTED_LANGS: readonly LangCode[] = ['ko', 'en'];

// localStorage 키: Layout.astro 의 inline 스크립트와 i18n.ts 가 공유
export const STORAGE_KEY = 'lang';

export const dictionaries = { ko, en } as const;

export function getCurrentLang(): LangCode {
  const lang = document.documentElement.lang;
  return lang === 'en' ? 'en' : 'ko';
}

export function formatTpl(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
}

// 상대 시간 포맷: 시안의 "2H AGO", "30M AGO" 같은 짧은 단위까지 지원
export function formatRelative(iso: string, lang: LangCode, now: number = Date.now()): string {
  const dict = dictionaries[lang];
  const date = new Date(iso);
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return dict.time_just_now;
  if (diffMin < 60) return formatTpl(dict.time_minutes_ago, { minutes: diffMin });
  if (diffHour < 24) return formatTpl(dict.time_hours_ago, { hours: diffHour });
  if (diffDays === 1) return dict.time_yesterday;
  if (diffDays < 30) return formatTpl(dict.time_days_ago, { days: diffDays });
  return date.toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', {
    month: lang === 'ko' ? 'long' : 'short',
    day: 'numeric',
  });
}
