// 글 파이프라인 스크립트(new-post, check-posts)가 같이 쓰는 도우미.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const NOTE_DIR = join(ROOT, 'note');

/** src/consts.ts의 CATEGORIES에서 카테고리 이름만 읽는다. (TS를 실행하지 않고 텍스트로 읽음) */
export function readCategories() {
	const src = readFileSync(join(ROOT, 'src/consts.ts'), 'utf8');
	const block = src.match(/CATEGORIES\s*=\s*\[([\s\S]*?)\]\s*as const/);
	if (!block) throw new Error('src/consts.ts에서 CATEGORIES를 찾지 못했습니다.');
	return [...block[1].matchAll(/name:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

/** note/ 아래의 .md, .mdx 파일 경로를 모두 돌려준다. */
export function listPostFiles(dir = NOTE_DIR) {
	const out = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...listPostFiles(full));
		else if (/\.mdx?$/i.test(entry.name)) out.push(full);
	}
	return out.sort();
}

/** 머리말(---로 감싼 YAML)과 본문을 나눈다. 머리말이 없거나 깨졌으면 error를 채운다. */
export function parseFrontmatter(text) {
	const m = text.replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!m) return { data: null, body: text, error: '맨 위에 --- 로 감싼 머리말이 없습니다.' };
	try {
		const data = parse(m[1]) ?? {};
		if (typeof data !== 'object' || Array.isArray(data)) {
			return { data: null, body: m[2], error: '머리말이 "키: 값" 형식이 아닙니다.' };
		}
		return { data, body: m[2], error: null };
	} catch (e) {
		return { data: null, body: m[2], error: `머리말 YAML을 읽지 못했습니다: ${e.message.split('\n')[0]}` };
	}
}

/** YAML 작은따옴표 문자열로 감싼다. */
export const yamlQuote = (s) => `'${String(s).replace(/'/g, "''")}'`;

/** 오늘 날짜(컴퓨터 시간대 기준)를 YYYY-MM-DD로. */
export function today() {
	const d = new Date();
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
