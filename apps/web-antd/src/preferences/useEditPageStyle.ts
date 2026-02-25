/**
 * 编辑页面样式适配
 * 使用详情页偏好设置来动态调整编辑表单的外观
 */

import { computed } from 'vue';
import { useDetailPagePreference } from './userPreference';

export function useEditPageStyle() {
  const preference = useDetailPagePreference();

  // 表单容器样式（应用内容宽度和字体大小）
  const formContainerStyle = computed(() => ({
    fontSize: `${preference.fontSize}px`,
  }));

  // 表单项卡片样式（应用圆角）
  const formCardStyle = computed(() => ({
    borderRadius: `${preference.cardRadius}px`,
  }));

  // 表单输入框样式（应用圆角）
  const formInputStyle = computed(() => ({
    borderRadius: `${preference.cardRadius}px`,
  }));

  // 抽屉/模态框内容容器样式
  const drawerContentStyle = computed(() => ({
    fontSize: `${preference.fontSize}px`,
  }));

  // 抽屉/模态框宽度样式
  const drawerWidthStyle = computed(() => {
    if (preference.contentWidth > 0) {
      return {
        width: `${preference.contentWidth}px`,
        maxWidth: '100vw',
      };
    }
    return {};
  });

  return {
    preference,
    formContainerStyle,
    formCardStyle,
    formInputStyle,
    drawerContentStyle,
    drawerWidthStyle,
  };
}
