<script setup lang="ts">
import { ref, watch } from 'vue';

import NumberFieldItem from '../number-field-item.vue';

defineOptions({
  name: 'PreferenceDetailPage',
});

const STORAGE_KEY = 'userPreference';

interface DetailPagePreference {
  cardRadius: number;
  contentWidth: number;
  fontSize: number;
}

const DEFAULT_PREFERENCE: DetailPagePreference = {
  cardRadius: 16,
  contentWidth: 0,
  fontSize: 14,
};

// 读取偏好设置
function getPreference(): DetailPagePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_PREFERENCE,
        ...parsed.detailPage,
      };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_PREFERENCE };
}

// 保存偏好设置
function savePreference(pref: DetailPagePreference) {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    const current = existing ? JSON.parse(existing) : {};
    current.detailPage = pref;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    // 通知响应式单例同步最新值，使页面实时生效
    window.dispatchEvent(new Event('userPreferenceChanged'));
  } catch {
    // ignore
  }
}

const preference = ref<DetailPagePreference>(getPreference());

// 监听变化并保存
watch(
  preference,
  (newVal) => {
    savePreference(newVal);
  },
  { deep: true },
);

const contentWidthMin = 0;
const contentWidthMax = 3840;
const cardRadiusMin = 0;
const cardRadiusMax = 32;
const fontSizeMin = 12;
const fontSizeMax = 20;
</script>

<template>
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
</template>
