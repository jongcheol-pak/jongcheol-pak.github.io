// OG(Open Graph) 이미지 빌드 타임 생성 유틸
// - satori 로 HTML 템플릿 → SVG 변환
// - @resvg/resvg-js 로 SVG → PNG 변환
// - Inter(라틴) 는 Google Fonts 에서 구형 UA 로 1회 fetch 후 메모리 캐시
// - Noto Sans KR(한글) 은 @fontsource/noto-sans-kr 번들의 korean 서브셋 WOFF 직접 로드

import satori from 'satori';
import { html as parseHtml } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { escapeXml } from './paths';

const require = createRequire(import.meta.url);

// 구형 Safari UA — Google Fonts 가 이 UA 에는 TTF 응답 (satori 는 woff2 미지원)
const LEGACY_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12) AppleWebKit/603.2.4 (KHTML, like Gecko) Version/10.1.1 Safari/603.2.4';

const fontCache = new Map<string, Promise<ArrayBuffer>>();

function extractFontUrl(css: string, preferredSubset: string): string | null {
  const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([\s\S]*?)\}/g)];
  const target = blocks.find((m) => m[1] === preferredSubset) ?? blocks[0];
  if (!target) return null;
  const urlMatch = target[2].match(/src:\s*url\(([^)]+)\)\s*format\(['"]?(?:truetype|woff)['"]?\)/);
  return urlMatch?.[1] ?? null;
}

interface FontSpec {
  family: string;
  weight: 400 | 700;
  subset: string;
}

function loadGoogleFont({ family, weight, subset }: FontSpec): Promise<ArrayBuffer> {
  const cacheKey = `${family}|${weight}|${subset}`;
  const cached = fontCache.get(cacheKey);
  if (cached) return cached;
  const p = (async () => {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
    const cssRes = await fetch(cssUrl, { headers: { 'User-Agent': LEGACY_UA } });
    if (!cssRes.ok) throw new Error(`${family} ${weight} css fetch failed: ${cssRes.status}`);
    const css = await cssRes.text();
    const url = extractFontUrl(css, subset);
    if (!url) {
      throw new Error(`${family} ${weight} font url not found. CSS head: ${css.slice(0, 300)}`);
    }
    const fontRes = await fetch(url);
    if (!fontRes.ok) throw new Error(`${family} ${weight} font fetch failed: ${fontRes.status}`);
    return fontRes.arrayBuffer();
  })();
  fontCache.set(cacheKey, p);
  return p;
}

function loadNotoSansKR(weight: 400 | 700): Promise<ArrayBuffer> {
  const cacheKey = `Noto Sans KR|${weight}|korean`;
  const cached = fontCache.get(cacheKey);
  if (cached) return cached;
  const p = (async () => {
    const pkgPath = require.resolve(
      `@fontsource/noto-sans-kr/files/noto-sans-kr-korean-${weight}-normal.woff`,
    );
    const buf = await readFile(pkgPath);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  })();
  fontCache.set(cacheKey, p);
  return p;
}

export interface OgImageParams {
  repoName: string;
  description: string | null;
}

// 저장소별 OG 이미지 PNG 바이트 (1200x630)
// Emerald Cybernetic 톤: void 배경(#0B0E11) + 에메랄드 타이틀 + 에메랄드 좌측 보더 + 에메랄드 상태 pill
export async function renderOgImage({ repoName, description }: OgImageParams): Promise<Uint8Array> {
  const [inter400, inter700, notoKr400, notoKr700] = await Promise.all([
    loadGoogleFont({ family: 'Inter', weight: 400, subset: 'latin' }),
    loadGoogleFont({ family: 'Inter', weight: 700, subset: 'latin' }),
    loadNotoSansKR(400),
    loadNotoSansKR(700),
  ]);

  const safeName = escapeXml(repoName);
  const safeDesc = description ? escapeXml(description.trim()) : '';

  const descBlock = safeDesc
    ? `<div style="display:flex;color:#9BA3AF;font-size:32px;margin-top:28px;line-height:1.4;max-width:980px;font-weight:400;">${safeDesc}</div>`
    : '';

  // void(#0B0E11) 배경 + 에메랄드 좌측 보더 + P-J-C 로고 + 상태 pill + 저장소 타이틀
  const markup = parseHtml(
    `<div style="display:flex;flex-direction:column;width:100%;height:100%;background:#0B0E11;padding:72px 88px;font-family:Inter,'Noto Sans KR';position:relative;border-left:12px solid #00FF9D;">` +
      `<div style="display:flex;align-items:center;gap:12px;color:#00FF9D;font-size:36px;font-weight:700;letter-spacing:0.3em;">P-J-C</div>` +
      `<div style="display:flex;position:absolute;right:80px;top:80px;background:rgba(0,255,157,0.12);color:#00FF9D;padding:6px 18px;font-size:22px;font-weight:500;letter-spacing:0.15em;border:1px solid rgba(0,255,157,0.3);border-radius:8px;">PROJECT</div>` +
      `<div style="display:flex;flex-direction:column;flex:1;justify-content:center;margin-top:40px;">` +
        `<div style="display:flex;color:#00FF9D;font-size:96px;font-weight:700;line-height:1.05;letter-spacing:-0.02em;">${safeName}</div>` +
        descBlock +
      `</div>` +
      `<div style="display:flex;color:#00BFA5;font-size:22px;font-weight:500;letter-spacing:0.1em;">jongcheol-pak.github.io</div>` +
    `</div>`,
  );

  const svg = await satori(markup, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Inter', data: inter400, weight: 400, style: 'normal' },
      { name: 'Inter', data: inter700, weight: 700, style: 'normal' },
      { name: 'Noto Sans KR', data: notoKr400, weight: 400, style: 'normal' },
      { name: 'Noto Sans KR', data: notoKr700, weight: 700, style: 'normal' },
    ],
  });

  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  })
    .render()
    .asPng();

  return png;
}
