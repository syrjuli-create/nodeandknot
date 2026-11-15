import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CATEGORIES } from './consts';

const categoryNames = CATEGORIES.map((c) => c.name) as [string, ...string[]];

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './note', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
			// 목록에만 쓰는 썸네일. 없으면 heroImage를 쓴다. (글 본문 위에는 나오지 않음)
			thumbnail: z.optional(image()),
			category: z.enum(categoryNames).default('기타'),
			// 글 하단에 #태그로 표시된다. 예: tags: ['코바늘', '버킷백']
			tags: z.array(z.string()).default([]),
			// true면 npm run dev에서만 보이고 배포(build)에서는 빠진다.
			draft: z.boolean().default(false),
		}),
});

export const collections = { blog };
