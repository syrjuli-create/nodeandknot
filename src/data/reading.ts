// 읽을거리 페이지에 보여 줄 외부 글 목록.
// 새 링크를 추가하려면 맨 위에 항목을 하나 더 넣으면 된다.

export interface ReadingItem {
	title: string;
	description: string;
	url: string;
	source: string;
	/** 읽을거리 왼쪽 메뉴의 분류 이름 (예: AI, 개발, 뜨개) */
	category: string;
}

export const READING: ReadingItem[] = [
	{
		title: '손가락 튕기기로 LLM 비용 줄이기',
		description: '토스에서 늘어나는 LLM 비용을 빠르게 줄이는 방법을 소개합니다.',
		url: 'https://toss.tech/article/snap-llm-cost-reduction',
		source: 'toss.tech',
		category: 'AI',
	},
];
