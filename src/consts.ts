// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'Node & Knot';
export const SITE_DESCRIPTION = '낮에는 AI를, 밤에는 뜨개질을. AI 개발자의 뜨개질 일기';

// 문의·개인정보처리방침에 표시되는 연락처. 비워 두면 '준비 중'으로 표시된다.
export const CONTACT_EMAIL = '';

// 글 카테고리. 글 머리말에 category: '뜨개질' 처럼 이름을 적는다.
// 적지 않으면 '기타'로 분류된다. slug는 주소(/blog/category/<slug>/)에 쓰인다.
export const CATEGORIES = [
	{ name: '뜨개질', slug: 'knitting' },
	{ name: 'AI 개발', slug: 'ai' },
	{ name: '기타', slug: 'etc' },
] as const;

export type CategoryName = (typeof CATEGORIES)[number]['name'];

// Google 애널리틱스(GA4) 측정 ID. 예: 'G-ABC123XYZ'
// 비워 두면 방문 분석 코드가 들어가지 않는다. 배포 빌드에서만 동작한다(npm run dev에서는 꺼짐).
export const GA_MEASUREMENT_ID = 'G-79HVTEG8VP';
