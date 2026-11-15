#!/usr/bin/env node
// 새 글 만들기: note/<slug>.md 를 머리말이 채워진 초안(draft: true)으로 만든다.
//
//   npm run new                                   → 하나씩 물어본다
//   npm run new -- "베를린 스카프 제작기" --slug berlin-scarf --category 뜨개질 --tags "대바늘,스카프"
import { existsSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { NOTE_DIR, ROOT, readCategories, today, yamlQuote } from './lib/posts.mjs';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		slug: { type: 'string', short: 's' },
		category: { type: 'string', short: 'c' },
		tags: { type: 'string', short: 't' },
		description: { type: 'string', short: 'd' },
		help: { type: 'boolean', short: 'h' },
	},
});

if (values.help) {
	console.log(`사용법: npm run new -- "제목" --slug 영문-주소 --category 카테고리 [--tags "a,b"] [--description "한 줄 소개"]
빠진 값은 하나씩 물어봅니다.`);
	process.exit(0);
}

const categories = readCategories();
const interactive = process.stdin.isTTY;
const rl = interactive ? createInterface({ input: process.stdin, output: process.stdout }) : null;

function fail(msg) {
	console.error(`✖ ${msg}`);
	rl?.close();
	process.exit(1);
}

async function ask(question, validate) {
	if (!rl) fail(`${question} 값이 필요합니다. (터미널에서 실행하거나 옵션으로 넘겨 주세요. --help 참고)`);
	for (;;) {
		const answer = (await rl.question(question)).trim();
		const problem = validate(answer);
		if (!problem) return answer;
		console.log(`  ${problem}`);
	}
}

const checkTitle = (t) => (t ? null : '제목을 적어 주세요.');
const checkSlug = (s) => {
	if (!SLUG_RE.test(s)) return '주소는 영문 소문자, 숫자, - 만 쓸 수 있어요. 예: berlin-scarf';
	if (existsSync(join(NOTE_DIR, `${s}.md`)) || existsSync(join(NOTE_DIR, `${s}.mdx`)))
		return `note/${s}.md 가 이미 있어요. 다른 주소를 골라 주세요.`;
	return null;
};
const pickCategory = (c) => (/^\d+$/.test(c) ? categories[Number(c) - 1] : c);
const checkCategory = (c) =>
	categories.includes(pickCategory(c)) ? null : `카테고리는 ${categories.join(' / ')} 중 하나예요.`;

let title = positionals.join(' ').trim();
if (checkTitle(title)) title = await ask('제목: ', checkTitle);

let slug = values.slug?.trim() ?? '';
if (slug && checkSlug(slug)) fail(checkSlug(slug));
if (!slug) slug = await ask('주소(영문, 예: berlin-scarf): ', checkSlug);

let category = values.category?.trim() ?? '';
if (category && checkCategory(category)) fail(checkCategory(category));
if (!category) {
	const menu = categories.map((c, i) => `${i + 1}) ${c}`).join('  ');
	category = await ask(`카테고리 ${menu}: `, checkCategory);
}
category = pickCategory(category);

let description = values.description?.trim();
if (description === undefined && rl) description = (await rl.question('한 줄 소개(나중에 써도 돼요): ')).trim();

let tagsInput = values.tags;
if (tagsInput === undefined && rl) tagsInput = await rl.question('태그(쉼표로 구분, 나중에 써도 돼요): ');
const tags = (tagsInput ?? '')
	.split(',')
	.map((t) => t.trim().replace(/^#/, ''))
	.filter(Boolean);

rl?.close();

const file = join(NOTE_DIR, `${slug}.md`);
const content = `---
title: ${yamlQuote(title)}
description: ${yamlQuote(description ?? '')}
pubDate: '${today()}'
category: ${yamlQuote(category)}
tags: [${tags.map(yamlQuote).join(', ')}]
# 목록 썸네일로 쓸 사진. note/ 에 넣고 주석을 풀어 주세요.
# thumbnail: './${slug}-1.jpg'
# 다 쓰면 아래 줄을 지우거나 false로 바꾸면 발행돼요.
draft: true
---

## 첫 번째 소제목

`;

writeFileSync(file, content, 'utf8');

const rel = relative(ROOT, file).replace(/\\/g, '/');
console.log(`
✔ ${rel} 를 만들었어요. (초안: 배포에는 안 나가고 npm run dev 에서만 보여요)

  다음 단계
  1. ${rel} 에 글을 쓰고, 사진은 note/${slug}-*.jpg 처럼 넣어요.
  2. npm run check:posts 로 빠진 것이 없는지 확인해요.
  3. 머리말의 draft: true 줄을 지우면 발행돼요.
`);
