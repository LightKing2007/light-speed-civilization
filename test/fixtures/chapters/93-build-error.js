/* 故障演练（不进正片）：章节构建失败。预览里显示「构建失败」错误画面，正式导出必须拦下。 */
export default {
  id: '93', slug: 'build-error', title: '故障：构建失败', dur: 2, card: null, stamps: [], caps: [],
  async build() { throw new Error('故意的构建错误：找不到道具模块'); },
};
