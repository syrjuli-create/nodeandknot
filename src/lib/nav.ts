import type { MarkdownHeading } from 'astro';
import { type CollectionEntry, getCollection } from 'astro:content';
import { CATEGORIES } from '../consts';
import { AI_PROJECTS } from '../data/ai-projects';

export type Post = CollectionEntry<'blog'>;

export interface NavItem {
	text: string;
	href: string;
	current?: boolean;
	indent?: boolean;
	count?: number;
}

export interface NavSection {
	label: string;
	items: NavItem[];
}

/** 모든 글을 최신순으로. */
export async function getPosts(): Promise<Post[]> {
	return (await getCollection('blog')).sort(
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
	);
}

export const postHref = (post: Post) => `/blog/${post.id}/`;
export const categoryHref = (slug: string) => `/blog/category/${slug}/`;

export function categorySlug(name: string): string {
	return CATEGORIES.find((c) => c.name === name)?.slug ?? 'etc';
}

/** 글이 하나 이상 있는 카테고리만. */
export function usedCategories(posts: Post[]) {
	return CATEGORIES.filter((c) => posts.some((p) => p.data.category === c.name));
}

/** "전체 / 뜨개질 / AI 개발" 카테고리 메뉴. current는 'all' 또는 카테고리 slug. */
export function categorySection(posts: Post[], current?: string): NavSection {
	return {
		label: '카테고리',
		items: [
			{ text: '전체', href: '/blog/', count: posts.length, current: current === 'all' },
			...usedCategories(posts).map((c) => ({
				text: c.name,
				href: categoryHref(c.slug),
				count: posts.filter((p) => p.data.category === c.name).length,
				current: current === c.slug,
			})),
		],
	};
}

export function postsSection(label: string, posts: Post[], currentId?: string): NavSection {
	return {
		label,
		items: posts.map((p) => ({
			text: p.data.title,
			href: postHref(p),
			current: p.id === currentId,
		})),
	};
}

export const AI_PROJECTS_HREF = '/ai-projects/';

/** "AI로 만들고 있는것들" 메뉴. current는 지금 보고 있는 도구의 slug. */
export function aiProjectsSection(current?: string): NavSection {
	return {
		label: 'AI로 만들고 있는것들',
		items: AI_PROJECTS.map((p) => ({
			text: p.title,
			href: `${AI_PROJECTS_HREF}#${p.slug}`,
			current: p.slug === current,
		})),
	};
}

/** 본문 소제목(h2, h3)으로 목차를 만든다. 소제목이 없으면 null. */
export function tocSection(headings: MarkdownHeading[]): NavSection | null {
	const items = headings
		.filter((h) => h.depth === 2 || h.depth === 3)
		.map((h) => ({ text: h.text, href: `#${h.slug}`, indent: h.depth === 3 }));
	return items.length > 0 ? { label: '목차', items } : null;
}
