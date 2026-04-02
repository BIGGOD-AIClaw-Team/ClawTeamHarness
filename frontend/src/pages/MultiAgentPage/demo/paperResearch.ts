export const PAPER_RESEARCH_DEMO = {
  name: '论文检索与生成',
  description: '输入主题，自动搜索论文、分析摘要、生成综述',
  agents: [
    { id: 'coordinator', name: '协调者', role: 'coordinator', icon: '🎯' },
    { id: 'searcher', name: '搜索专家', role: 'searcher', icon: '🔍' },
    { id: 'analyzer', name: '分析师', role: 'analyzer', icon: '📊' },
    { id: 'writer', name: '撰写专家', role: 'writer', icon: '✍️' },
    { id: 'reviewer', name: '审核专家', role: 'reviewer', icon: '✅' },
  ],
  workflow: {
    type: 'sequential',
    steps: [
      { id: '1', name: '搜索论文', agent: 'searcher', output: 'search_results' },
      { id: '2', name: '分析摘要', agent: 'analyzer', input: 'search_results', output: 'analysis' },
      { id: '3', name: '生成综述', agent: 'writer', input: 'analysis', output: 'draft' },
      { id: '4', name: '质量审核', agent: 'reviewer', input: 'draft', output: 'final_report' },
    ]
  }
};
