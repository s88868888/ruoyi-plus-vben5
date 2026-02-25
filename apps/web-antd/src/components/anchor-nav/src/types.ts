/**
 * 锚点导航项
 */
export interface AnchorNavItem {
  /** 锚点 key，对应目标元素的 id */
  key: string;
  /** 显示标题 */
  title: string;
  /** 子项（有子项时当前项作为分组标题，不可点击） */
  children?: AnchorNavItem[];
}
