// "AI로 만들고 있는것들" 페이지와 왼쪽 메뉴에 보여 줄 도구 목록.
// 새 도구를 추가하려면 맨 위에 항목을 하나 더 넣으면 된다.

export interface AiProject {
	/** 페이지 안 위치(#id)와 왼쪽 메뉴 링크에 쓰는 이름 */
	slug: string;
	title: string;
	description: string;
	url: string;
	/** 예: '테스트 버전'. 없으면 배지를 달지 않는다. */
	status?: string;
	/** Claude 아티팩트처럼 쓰려면 Claude 로그인이 필요한 도구 */
	needsClaudeLogin?: boolean;
}

export const AI_PROJECTS: AiProject[] = [
	{
		slug: 'knit-pattern',
		title: '사진 한 장으로 뜨개 도안 만들기',
		description:
			'뜨개 작품 사진을 올리면 AI가 도안을 쓰고 단마다 코수를 검산해 줘요. 실 색과 색별 높이(cm)를 고르면 완성 예상 이미지도 그려 줘요.',
		url: 'https://claude.ai/artifact/HboY15qMBBYXQwetdTcdKX',
		status: '테스트 버전',
		needsClaudeLogin: true,
	},
];
