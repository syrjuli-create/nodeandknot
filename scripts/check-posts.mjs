#!/usr/bin/env node
// 발행 전 검사: note/ 의 글을 읽고 빌드 전에 알 수 있는 문제를 알려 준다.
// 같은 결과를 npm run dev 의 /preview/ 페이지에서도 볼 수 있다.
//
//   npm run check:posts                           → 모든 글
//   npm run check:posts -- note/berlin-scarf.md   → 특정 글만
//
// ✖ 오류가 하나라도 있으면 종료 코드 1 (빌드가 깨지거나 글이 잘못 보이는 문제)
// ⚠ 경고는 알려 주기만 한다 (SEO, 접근성, 용량 같은 권장 사항)
import { checkPosts, relPath } from './lib/check.mjs';

const targets = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const { results, orphans } = checkPosts(targets);

let errorCount = 0;
let warnCount = orphans.length;
for (const { rel, draft, problems } of results) {
	const errors = problems.filter((p) => p.level === 'error').length;
	errorCount += errors;
	warnCount += problems.length - errors;
	const mark = draft ? ' (초안)' : '';
	if (!problems.length) {
		console.log(`✔ ${rel}${mark}`);
		continue;
	}
	console.log(`${errors ? '✖' : '⚠'} ${rel}${mark}`);
	for (const p of problems) console.log(`    ${p.level === 'error' ? '✖' : '⚠'} ${p.msg}`);
}

if (orphans.length) {
	console.log('\n⚠ 어떤 글에서도 쓰지 않는 사진 (지워도 되는지 확인해 보세요)');
	for (const o of orphans) console.log(`    ${relPath(o)}`);
}

const drafts = results.filter((r) => r.draft).length;
console.log(
	`\n글 ${results.length}개 · 오류 ${errorCount}개 · 경고 ${warnCount}개` +
		(drafts ? ` · 초안 ${drafts}개 (배포에서 빠짐)` : '') +
		'\n자세히 보기: npm run dev 후 /preview/',
);
process.exit(errorCount ? 1 : 0);
