/**
 * 编辑页面全局样式适配
 * 动态应用详情页偏好设置到编辑表单
 */

import { watch } from 'vue';
import { useDetailPagePreference } from './userPreference';

export function setupEditPageStyleAdapter() {
  const preference = useDetailPagePreference();

  // 创建或获取样式元素
  let styleElement = document.getElementById('edit-page-style-adapter');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'edit-page-style-adapter';
    document.head.appendChild(styleElement);
  }

  // 更新样式
  function updateStyles() {
    // 计算抽屉/模态框的宽度
    const drawerWidth = preference.contentWidth > 0
      ? `${preference.contentWidth}px`
      : 'auto';

    const css = `
      /* 抽屉宽度适配 */
      .ant-drawer-content-wrapper {
        width: ${drawerWidth} !important;
        max-width: 100vw !important;
      }

      /* 模态框宽度适配 */
      .ant-modal {
        width: ${drawerWidth} !important;
        max-width: 100vw !important;
      }

      /* 表单容器 */
      .vben-form-wrapper {
        font-size: ${preference.fontSize}px !important;
      }

      /* Ant Design 表单项 */
      .ant-form-item {
        font-size: ${preference.fontSize}px !important;
      }

      .ant-form-item-label > label {
        font-size: ${preference.fontSize}px !important;
      }

      /* 输入框、选择框等 */
      .ant-input,
      .ant-input-number,
      .ant-select-selector,
      .ant-picker,
      .ant-textarea-show-count > textarea.ant-input {
        border-radius: ${preference.cardRadius}px !important;
        font-size: ${preference.fontSize}px !important;
      }

      /* 下拉菜单 */
      .ant-select-dropdown {
        font-size: ${preference.fontSize}px !important;
      }

      .ant-select-item {
        border-radius: ${preference.cardRadius}px !important;
      }

      /* 日期选择器 */
      .ant-picker-panel {
        border-radius: ${preference.cardRadius}px !important;
        font-size: ${preference.fontSize}px !important;
      }

      /* 抽屉内容 */
      .ant-drawer-content-wrapper {
        font-size: ${preference.fontSize}px !important;
      }

      .ant-drawer-body {
        font-size: ${preference.fontSize}px !important;
      }

      /* 模态框内容 */
      .ant-modal-content {
        font-size: ${preference.fontSize}px !important;
      }

      .ant-modal-body {
        font-size: ${preference.fontSize}px !important;
      }

      /* 按钮 */
      .ant-btn {
        border-radius: ${preference.cardRadius}px !important;
        font-size: ${preference.fontSize}px !important;
      }

      /* 卡片 */
      .ant-card {
        border-radius: ${preference.cardRadius}px !important;
        font-size: ${preference.fontSize}px !important;
      }

      /* 分割线 */
      .ant-divider {
        font-size: ${preference.fontSize}px !important;
      }

      /* 标签 */
      .ant-tag {
        border-radius: ${preference.cardRadius}px !important;
        font-size: ${preference.fontSize}px !important;
      }

      /* 消息提示 */
      .ant-message-notice-content {
        font-size: ${preference.fontSize}px !important;
        border-radius: ${preference.cardRadius}px !important;
      }

      /* 通知 */
      .ant-notification-notice {
        border-radius: ${preference.cardRadius}px !important;
        font-size: ${preference.fontSize}px !important;
      }

      /* 步骤条 */
      .ant-steps {
        font-size: ${preference.fontSize}px !important;
      }

      .ant-steps-item-title {
        font-size: ${preference.fontSize}px !important;
      }

      /* 表格 */
      .ant-table {
        font-size: ${preference.fontSize}px !important;
      }

      .ant-table-cell {
        border-radius: ${preference.cardRadius}px !important;
      }

      /* 文本域 */
      .ant-input-textarea > textarea {
        border-radius: ${preference.cardRadius}px !important;
        font-size: ${preference.fontSize}px !important;
      }

      /* 开关 */
      .ant-switch {
        border-radius: ${preference.cardRadius}px !important;
      }

      /* 复选框和单选框 */
      .ant-checkbox-inner,
      .ant-radio-inner {
        border-radius: ${preference.cardRadius}px !important;
      }

      /* 加载中 */
      .ant-spin-dot-item {
        border-radius: ${preference.cardRadius}px !important;
      }

      /* 空状态 */
      .ant-empty-description {
        font-size: ${preference.fontSize}px !important;
      }

      /* 提示文本 */
      .ant-form-item-explain {
        font-size: ${preference.fontSize * 0.9}px !important;
      }

      /* 标题 */
      h1, h2, h3, h4, h5, h6 {
        font-size: inherit !important;
      }
    `;

    styleElement!.textContent = css;
  }

  // 初始化样式
  updateStyles();

  // 监听偏好设置变化，实时更新样式
  watch(
    () => [preference.cardRadius, preference.fontSize, preference.contentWidth],
    () => {
      updateStyles();
    },
    { deep: true }
  );

  return {
    updateStyles,
  };
}
