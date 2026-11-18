// 글 검사 규칙. npm run check:posts 와 dev 전용 /preview/ 페이지가 같이 쓴다.
//
// level 'error' : 빌드가 깨지거나 글이 잘못 보이는 문제
// level 'warn'  : SEO, 접근성, 용량 같은 권장 사항
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { NOTE_DIR, ROOT, listPostFiles, parseFrontmatter, readCategories } from './posts.mjs';

// content.config.ts 스키마에 있는 키. 여기에 없는 키는 Astro가 조용히 버린다.
const KNOWN_KEYS = new Set([
	'title',
	'subtitle',
	'description',
	'pubDate',
	'updatedDate',
	'heroImage',
	'thumbnail',
	'category',
	'tags',
	'draft',
]);
// 검색 결과에 보이는 소개글 길이 기준(한글 기준 대략).
export const DESC_MIN = 30;
export const DESC_MAX = 120;
const BIG_IMAGE = 1024 * 1024;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif|svg)$/i;

export const relPath = (p) => relative(ROOT, p).replace(/\\/g, '/');

function isValidDate(v) {
	if (v instanceof Date) return !Number.isNaN(v.valueOf());
	return typeof v === 'string' && !Number.isNaN(new Date(v).valueOf());
}

/** 코드 블록 안의 ![...](...) 는 이미지가 아니므로 빼고 본다. */
function stripCode(body) {
	return body.replace(/^(```|~~~)[\s\S]*?^\1/gm, '').replace(/`[^`\n]*`/g, '');
}

function findImages(body) {
	const images = [];
	const text = stripCode(body);
	for (const m of text.matchAll(/!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g)) {
		images.push({ alt: m[1].trim(), src: m[2] });
	}
	for (const m of text.matchAll(/<img\b[^>]*>/gi)) {
		const src = m[0].match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
		const alt = m[0].match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1];
		if (src) images.push({ alt: (alt ?? '').trim(), src });
	}
	return images;
}

/** 로컬 이미지 경로를 실제 파일 경로로. 외부 URL이면 null. */
function localPath(file, src) {
	if (/^(https?:)?\/\//i.test(src) || src.startsWith('data:')) return null;
	if (src.startsWith('/')) return join(ROOT, 'public', decodeURI(src));
	return resolve(dirname(file), decodeURI(src.split(/[?#]/)[0]));
}

function checkFile(file, categories, usedImages) {
	const result = { file, rel: relPath(file), data: null, draft: false, problems: [] };
	const error = (msg) => result.problems.push({ level: 'error', msg });
	const warn = (msg) => result.problems.push({ level: 'warn', msg });

	if (!existsSync(file)) {
		error('파일이 없습니다.');
		return result;
	}

	const { data, body, error: fmError } = parseFrontmatter(readFileSync(file, 'utf8'));
	if (fmError) {
		error(fmError);
		return result;
	}
	result.data = data;

	const isDraft = data.draft === true;
	result.draft = isDraft;
	if ('draft' in data && typeof data.draft !== 'boolean') error(`draft 는 true 또는 false 여야 해요. (지금: ${data.draft})`);

	for (const key of Object.keys(data)) {
		if (!KNOWN_KEYS.has(key)) warn(`머리말의 '${key}' 는 사이트에서 쓰지 않는 키라 무시돼요. 오타가 아닌지 확인해 주세요.`);
	}

	// 제목
	if (typeof data.title !== 'string' || !data.title.trim()) error('title(제목)이 없어요.');

	// 소개글
	if (typeof data.description !== 'string') error('description(한 줄 소개)이 없어요.');
	else {
		const len = [...data.description.trim()].length;
		if (len === 0) (isDraft ? warn : error)('description(한 줄 소개)이 비어 있어요. 검색 결과와 공유 미리보기에 쓰여요.');
		else if (len < DESC_MIN) warn(`description이 ${len}자로 짧아요. ${DESC_MIN}~${DESC_MAX}자면 검색 결과에 잘 보여요.`);
		else if (len > DESC_MAX) warn(`description이 ${len}자로 길어요. 검색 결과에서 ${DESC_MAX}자쯤에서 잘릴 수 있어요.`);
	}

	// 날짜
	if (data.pubDate === undefined) error("pubDate(발행일)가 없어요. 예: pubDate: '2026-11-15'");
	else if (!isValidDate(data.pubDate)) error(`pubDate '${data.pubDate}' 를 날짜로 읽을 수 없어요. 예: '2026-11-15'`);
	else if (!isDraft && new Date(data.pubDate) > new Date()) warn('pubDate가 미래 날짜예요. 목록 맨 위에 계속 떠 있게 돼요.');
	if (data.updatedDate !== undefined) {
		if (!isValidDate(data.updatedDate)) error(`updatedDate '${data.updatedDate}' 를 날짜로 읽을 수 없어요.`);
		else if (isValidDate(data.pubDate) && new Date(data.updatedDate) < new Date(data.pubDate))
			warn('updatedDate가 pubDate보다 앞이에요.');
	}

	// 카테고리
	if (data.category === undefined) warn(`category가 없어서 '기타'로 분류돼요. (${categories.join(' / ')})`);
	else if (!categories.includes(data.category))
		error(`category '${data.category}' 는 없는 카테고리예요. ${categories.join(' / ')} 중 하나로 써 주세요.`);

	// 태그
	if (data.tags !== undefined) {
		if (!Array.isArray(data.tags) || data.tags.some((t) => typeof t !== 'string'))
			error("tags 는 ['코바늘', '버킷백'] 처럼 글자 목록이어야 해요.");
		else {
			const lower = data.tags.map((t) => t.trim().toLowerCase());
			const dup = lower.filter((t, i) => lower.indexOf(t) !== i);
			if (dup.length) warn(`tags에 같은 태그가 두 번 있어요: ${[...new Set(dup)].join(', ')}`);
			if (data.tags.some((t) => t.trim().startsWith('#'))) warn('tags에 # 은 빼고 써 주세요. 화면에서 자동으로 붙어요.');
		}
	}

	// 대표 이미지 / 썸네일
	for (const key of ['heroImage', 'thumbnail']) {
		if (data[key] === undefined) continue;
		if (typeof data[key] !== 'string') {
			error(`${key} 는 './사진.jpg' 처럼 경로여야 해요.`);
			continue;
		}
		const p = localPath(file, data[key]);
		if (!p) error(`${key} 는 note/ 안의 사진이어야 해요. (외부 주소는 쓸 수 없어요)`);
		else if (!existsSync(p)) error(`${key} 사진 '${data[key]}' 를 찾을 수 없어요.`);
		else usedImages.add(p);
	}

	// 본문 이미지
	for (const img of findImages(body)) {
		const p = localPath(file, img.src);
		if (p) {
			if (!existsSync(p)) {
				error(`본문 사진 '${img.src}' 를 찾을 수 없어요.`);
				continue;
			}
			usedImages.add(p);
			const size = statSync(p).size;
			if (size > BIG_IMAGE) warn(`'${img.src}' 가 ${(size / 1024 / 1024).toFixed(1)}MB예요. 저장소가 커지니 줄여서 넣는 걸 추천해요.`);
		}
		if (!img.alt) warn(`'${img.src}' 에 설명(alt)이 없어요. ![여기에 설명](${img.src}) 처럼 적어 주세요.`);
	}

	// 본문
	const text = stripCode(body).replace(/!\[[^\]]*\]\([^)]*\)/g, '').trim();
	if (!text) (isDraft ? warn : error)('본문이 비어 있어요.');
	if (/^#\s/m.test(stripCode(body))) warn('본문에 # (h1) 소제목이 있어요. 제목과 겹치니 ## 부터 써 주세요.');
	if (!isDraft && /^##\s*첫 번째 소제목\s*$/m.test(body)) warn("'첫 번째 소제목' 이 그대로 남아 있어요.");

	return result;
}

/**
 * 글들을 검사한다. files를 비우면 note/ 의 모든 글을 보고, 그때만 쓰지 않는 사진(orphans)도 찾는다.
 * 돌려주는 값: { results: [{ file, rel, data, draft, problems }], orphans: [경로] }
 */
export function checkPosts(files = []) {
	const categories = readCategories();
	const all = files.length === 0;
	const targets = all ? listPostFiles() : files.map((f) => resolve(ROOT, f));
	const usedImages = new Set();
	const results = targets.map((file) => checkFile(file, categories, usedImages));

	// 같은 제목
	const titles = new Map();
	for (const r of results) {
		const t = typeof r.data?.title === 'string' ? r.data.title.trim() : '';
		if (t) titles.set(t, [...(titles.get(t) ?? []), r]);
	}
	for (const [title, list] of titles) {
		if (list.length < 2) continue;
		for (const r of list) {
			const others = list.filter((o) => o !== r).map((o) => o.rel).join(', ');
			r.problems.push({ level: 'warn', msg: `'${title}' 와 같은 제목의 글이 또 있어요: ${others}` });
		}
	}

	// 어떤 글에서도 쓰지 않는 사진
	const orphans = [];
	if (all) {
		const walk = (dir) => {
			for (const e of readdirSync(dir, { withFileTypes: true })) {
				const full = join(dir, e.name);
				if (e.isDirectory()) walk(full);
				else if (IMAGE_EXT.test(extname(e.name)) && !usedImages.has(full)) orphans.push(full);
			}
		};
		walk(NOTE_DIR);
	}

	// 오류 먼저, 그다음 경고
	for (const r of results) r.problems.sort((a, b) => (a.level === b.level ? 0 : a.level === 'error' ? -1 : 1));
	return { results, orphans };
}
