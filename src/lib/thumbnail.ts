// 외부 README 이미지(GitHub raw 등) 를 빌드 타임에 fetch → sharp 로 800w/WebP 변환 →
// `public/thumbs/<repo>.webp` 로 저장. Astro 가 dist/thumbs/ 로 자동 복사한다 (C-4).
//
// 변환 실패(네트워크/private/포맷 미지원) 시 null → 호출자(buildCardData) 에서 원본 URL 폴백,
// 그래도 미정이면 ProjectCard.astro 가 `Thumbnail.jpg` 폴백.
//
// 모듈 스코프 캐시로 같은 빌드 내 중복 호출 방지.
import sharp from 'sharp';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const THUMBS_DIR = 'public/thumbs';
const MAX_WIDTH = 800;
const WEBP_QUALITY = 80;

const cache = new Map<string, Promise<string | null>>();
let dirEnsured = false;

function ensureDir(): void {
  if (dirEnsured) return;
  if (!existsSync(THUMBS_DIR)) {
    mkdirSync(THUMBS_DIR, { recursive: true });
  }
  dirEnsured = true;
}

// 파일명 안전화 — 저장소 이름이 보통 영숫자/하이픈/언더바라 거의 그대로지만 방어적으로 sanitize
function sanitizeRepoName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function localizeThumbnail(
  repoName: string,
  imageUrl: string | null,
): Promise<string | null> {
  if (!imageUrl) return Promise.resolve(null);
  // 이미 로컬/상대 경로면 그대로 (예: 폴백 Thumbnail.jpg)
  if (!/^https?:\/\//i.test(imageUrl)) return Promise.resolve(imageUrl);

  const cached = cache.get(repoName);
  if (cached) return cached;

  const p = (async () => {
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      const img = sharp(buf);
      const meta = await img.metadata();
      // withoutEnlargement: 작은 이미지를 강제 확대하지 않음 (해상도 손실 방지)
      const pipeline =
        meta.width && meta.width > MAX_WIDTH
          ? img.resize({ width: MAX_WIDTH, withoutEnlargement: true })
          : img;
      const webpBuf = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();

      ensureDir();
      const fileName = `${sanitizeRepoName(repoName)}.webp`;
      writeFileSync(join(THUMBS_DIR, fileName), webpBuf);
      // 카드는 root 절대 경로로 사용 (user pages base = '/')
      return `/thumbs/${fileName}`;
    } catch (err) {
      console.error(`[thumbnail] failed to localize ${imageUrl} for ${repoName}:`, err);
      return null;
    }
  })();
  cache.set(repoName, p);
  return p;
}
