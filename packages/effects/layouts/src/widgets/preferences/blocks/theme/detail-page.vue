<script setup lang="ts">
import { ref, watch } from 'vue';

import NumberFieldItem from '../number-field-item.vue';
import SelectItem from '../select-item.vue';
import SwitchItem from '../switch-item.vue';

defineOptions({
  name: 'PreferenceDetailPage',
});

const STORAGE_KEY = 'userPreference';

interface DetailPagePreference {
  cardRadius: number;
  contentWidth: number;
  fontSize: number;
  showAnchorNav: boolean;
  navMode: 'horizontal' | 'side';
  anchorNavMarginLeft: number;
  anchorNavMarginRight: number;
  anchorNavWidth: number;
}

interface ListTablePreference {
  headerBgColor: string;
  headerTextColor: string;
  headerPaddingY: number;
  cellPaddingY: number;
}

const DEFAULT_DETAIL: DetailPagePreference = {
  cardRadius: 16,
  contentWidth: 1500,
  fontSize: 14,
  showAnchorNav: true,
  navMode: 'horizontal',
  anchorNavMarginLeft: 20,
  anchorNavMarginRight: 0,
  anchorNavWidth: 210,
};

const DEFAULT_LIST: ListTablePreference = {
  headerBgColor: '#2b3445',
  headerTextColor: '#f6f6f6',
  headerPaddingY: 8,
  cellPaddingY: 8,
};

// 读取偏好设置
function getDetailPreference(): DetailPagePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_DETAIL, ...parsed.detailPage };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_DETAIL };
}

function getListPreference(): ListTablePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_LIST, ...parsed.listTable };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_LIST };
}

// 保存偏好设置
function savePreference(
  detail: DetailPagePreference,
  list: ListTablePreference,
) {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    const current = existing ? JSON.parse(existing) : {};
    current.detailPage = detail;
    current.listTable = list;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    // 通知响应式单例同步最新值，使页面实时生效
    window.dispatchEvent(new Event('userPreferenceChanged'));
  } catch {
    // ignore
  }
}

const preference = ref<DetailPagePreference>(getDetailPreference());
const listPref = ref<ListTablePreference>(getListPreference());

// 监听变化并保存
watch(
  [preference, listPref],
  ([newDetail, newList]) => {
    savePreference(newDetail, newList);
  },
  { deep: true },
);

const contentWidthMin = 0;
const contentWidthMax = 3840;
const cardRadiusMin = 0;
const cardRadiusMax = 32;
const fontSizeMin = 12;
const fontSizeMax = 20;
const anchorNavWidthMin = 120;
const anchorNavWidthMax = 400;
const anchorNavMarginMin = 0;
const anchorNavMarginMax = 200;
const paddingMin = 0;
const paddingMax = 24;
</script>

<template>
  <SwitchItem
    v-model="preference.showAnchorNav"
    tip="开启后在详情页显示锚点导航"
  >
    锚点导航
  </SwitchItem>
  <SelectItem
    v-if="preference.showAnchorNav"
    v-model="preference.navMode"
    :items="[
      { label: '侧边导航', value: 'side' },
      { label: '横向菜单条', value: 'horizontal' },
    ]"
  >
    导航模式
    <template #tip>侧边导航在左侧显示，横向菜单条固定在头部下方</template>
  </SelectItem>
  <NumberFieldItem
    v-if="preference.showAnchorNav && preference.navMode === 'side'"
    v-model="preference.anchorNavWidth"
    :max="anchorNavWidthMax"
    :min="anchorNavWidthMin"
    :step="5"
  >
    导航宽度
  </NumberFieldItem>
  <NumberFieldItem
    v-if="preference.showAnchorNav && preference.navMode === 'side'"
    v-model="preference.anchorNavMarginLeft"
    :max="anchorNavMarginMax"
    :min="anchorNavMarginMin"
    :step="2"
    tip="导航距左侧的间距"
  >
    导航左边距
  </NumberFieldItem>
  <NumberFieldItem
    v-if="preference.showAnchorNav && preference.navMode === 'side'"
    v-model="preference.anchorNavMarginRight"
    :max="anchorNavMarginMax"
    :min="anchorNavMarginMin"
    :step="2"
    tip="导航距右侧内容的间距"
  >
    导航右边距
  </NumberFieldItem>
  <NumberFieldItem
    v-model="preference.contentWidth"
    :max="contentWidthMax"
    :min="contentWidthMin"
    :step="10"
    tip="0 表示铺满不限制"
  >
    内容最大宽度
  </NumberFieldItem>
  <NumberFieldItem
    v-model="preference.cardRadius"
    :max="cardRadiusMax"
    :min="cardRadiusMin"
    :step="1"
  >
    卡片圆角
  </NumberFieldItem>
  <NumberFieldItem
    v-model="preference.fontSize"
    :max="fontSizeMax"
    :min="fontSizeMin"
    :step="1"
  >
    内容字体大小
  </NumberFieldItem>

  <!-- 列表表格配置 -->
  <div class="list-table-section">
    <div class="list-table-title">列表配置</div>

    <!-- 表头背景色 -->
    <div class="color-item">
      <div class="color-label">表头背景色</div>
      <div class="color-control">
        <input
          v-model="listPref.headerBgColor"
          type="color"
          class="color-input"
        />
        <span class="color-value">{{ listPref.headerBgColor }}</span>
      </div>
    </div>

    <!-- 表头文字颜色 -->
    <div class="color-item">
      <div class="color-label">表头文字颜色</div>
      <div class="color-control">
        <input
          v-model="listPref.headerTextColor"
          type="color"
          class="color-input"
        />
        <span class="color-value">{{ listPref.headerTextColor }}</span>
      </div>
    </div>
  </div>

  <NumberFieldItem
    v-model="listPref.headerPaddingY"
    :max="paddingMax"
    :min="paddingMin"
    :step="1"
    tip="列表表头单元格的上下 padding"
  >
    表头上下内边距
  </NumberFieldItem>
  <NumberFieldItem
    v-model="listPref.cellPaddingY"
    :max="paddingMax"
    :min="paddingMin"
    :step="1"
    tip="列表数据行单元格的上下 padding"
  >
    单元格上下内边距
  </NumberFieldItem>
</template>

<style scoped>
.list-table-section {
  margin-top: 16px;
  margin-bottom: 4px;
  padding-top: 12px;
  border-top: 1px solid hsl(var(--border));
}

.list-table-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
  margin-bottom: 12px;
}

.color-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  margin-bottom: 4px;
}

.color-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
}

.color-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-input {
  width: 28px;
  height: 28px;
  border: none;
  padding: 0;
  border-radius: 4px;
  cursor: pointer;
  background: none;
}

.color-value {
  font-size: 12px;
  color: hsl(var(--primary));
  font-weight: 600;
  font-family: monospace;
}
</style>
