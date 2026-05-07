<script setup lang="ts">
import { computed } from 'vue';

import { InputNumber, Radio, RadioGroup, Slider, Switch } from 'ant-design-vue';
import { ColorPicker } from 'vue3-colorpicker';

import { usePreferences } from '@vben/preferences';

import { useDetailPagePreference, useListTablePreference } from '#/preferences/userPreference';

import 'vue3-colorpicker/style.css';

const preference = useDetailPagePreference();
const listPref = useListTablePreference();

const { isDark } = usePreferences();
const theme = computed(() => {
  return isDark.value ? 'black' : 'white';
});
</script>

<template>
  <div class="mt-[16px] md:w-full lg:w-3/4 2xl:w-3/5">
    <h3 class="mb-6 text-base font-semibold">详情页设置</h3>

    <!-- 导航模式 -->
    <div class="setting-item">
      <div class="setting-label">
        导航模式
      </div>
      <div class="setting-desc">选择详情页的锚点导航展示方式</div>
      <div class="mt-2">
        <RadioGroup v-model:value="preference.navMode" size="small">
          <Radio value="side">侧边导航</Radio>
          <Radio value="horizontal">横向菜单条</Radio>
        </RadioGroup>
      </div>
    </div>

    <!-- 侧边锚点导航开关 -->
    <div class="setting-item">
      <div class="setting-label">
        显示导航
        <Switch v-model:checked="preference.showAnchorNav" size="small" />
      </div>
      <div class="setting-desc">关闭后隐藏锚点导航</div>
    </div>

    <!-- 侧边导航左边距 -->
    <div v-if="preference.showAnchorNav && preference.navMode === 'side'" class="setting-item">
      <div class="setting-label">
        导航左边距
        <span class="setting-value">{{ preference.anchorNavMarginLeft }}px</span>
      </div>
      <div class="setting-desc">侧边导航距左侧的间距</div>
      <div class="mt-2 flex items-center gap-4">
        <Slider
          v-model:value="preference.anchorNavMarginLeft"
          :max="60"
          :min="0"
          :step="2"
          class="flex-1"
        />
        <InputNumber
          v-model:value="preference.anchorNavMarginLeft"
          :max="60"
          :min="0"
          :step="2"
          size="small"
          class="w-[80px]"
        />
      </div>
    </div>

    <!-- 侧边导航右边距 -->
    <div v-if="preference.showAnchorNav && preference.navMode === 'side'" class="setting-item">
      <div class="setting-label">
        导航右边距
        <span class="setting-value">{{ preference.anchorNavMarginRight }}px</span>
      </div>
      <div class="setting-desc">侧边导航距右侧内容的间距</div>
      <div class="mt-2 flex items-center gap-4">
        <Slider
          v-model:value="preference.anchorNavMarginRight"
          :max="60"
          :min="0"
          :step="2"
          class="flex-1"
        />
        <InputNumber
          v-model:value="preference.anchorNavMarginRight"
          :max="60"
          :min="0"
          :step="2"
          size="small"
          class="w-[80px]"
        />
      </div>
    </div>

    <!-- 侧边导航宽度 -->
    <div v-if="preference.showAnchorNav && preference.navMode === 'side'" class="setting-item">
      <div class="setting-label">
        导航宽度
        <span class="setting-value">{{ preference.anchorNavWidth }}px</span>
      </div>
      <div class="setting-desc">侧边导航栏的宽度</div>
      <div class="mt-2 flex items-center gap-4">
        <Slider
          v-model:value="preference.anchorNavWidth"
          :max="400"
          :min="120"
          :step="5"
          class="flex-1"
        />
        <InputNumber
          v-model:value="preference.anchorNavWidth"
          :max="400"
          :min="120"
          :step="5"
          size="small"
          class="w-[80px]"
        />
      </div>
    </div>

    <!-- 内容最大宽度 -->
    <div class="setting-item">
      <div class="setting-label">
        内容最大宽度
        <span class="setting-value">
          {{ preference.contentWidth > 0 ? `${preference.contentWidth}px` : '铺满' }}
        </span>
      </div>
      <div class="setting-desc">设置内容区域最大宽度，0 表示铺满不限制</div>
      <div class="mt-2 flex items-center gap-4">
        <Slider
          v-model:value="preference.contentWidth"
          :max="3840"
          :min="0"
          :step="10"
          class="flex-1"
        />
        <InputNumber
          v-model:value="preference.contentWidth"
          :max="3840"
          :min="0"
          :step="10"
          size="small"
          class="w-[90px]"
        />
      </div>
    </div>

    <!-- 卡片圆角 -->
    <div class="setting-item">
      <div class="setting-label">
        卡片圆角
        <span class="setting-value">{{ preference.cardRadius }}px</span>
      </div>
      <div class="setting-desc">调整详情页所有卡片的圆角大小</div>
      <div class="mt-2 flex items-center gap-4">
        <Slider
          v-model:value="preference.cardRadius"
          :max="32"
          :min="0"
          :step="1"
          class="flex-1"
        />
        <InputNumber
          v-model:value="preference.cardRadius"
          :max="32"
          :min="0"
          :step="1"
          size="small"
          class="w-[80px]"
        />
      </div>
    </div>

    <!-- 内容字体大小 -->
    <div class="setting-item">
      <div class="setting-label">
        内容字体大小
        <span class="setting-value">{{ preference.fontSize }}px</span>
      </div>
      <div class="setting-desc">调整详情页卡片内容区域的字体大小</div>
      <div class="mt-2 flex items-center gap-4">
        <Slider
          v-model:value="preference.fontSize"
          :max="20"
          :min="12"
          :step="1"
          class="flex-1"
        />
        <InputNumber
          v-model:value="preference.fontSize"
          :max="20"
          :min="12"
          :step="1"
          size="small"
          class="w-[80px]"
        />
      </div>
    </div>

    <!-- ── 列表配置 ──────────────────────── -->
    <h3 class="mb-6 mt-8 text-base font-semibold">列表配置</h3>

    <!-- 表头背景色 -->
    <div class="setting-item">
      <div class="setting-label">
        表头背景色
        <span class="color-preview" :style="{ background: listPref.headerBgColor }" />
        <span class="setting-value">{{ listPref.headerBgColor }}</span>
      </div>
      <div class="setting-desc">列表表头的背景颜色</div>
      <div class="mt-2">
        <ColorPicker v-model:pure-color="listPref.headerBgColor" format="hex" :theme="theme" />
      </div>
    </div>

    <!-- 表头文字颜色 -->
    <div class="setting-item">
      <div class="setting-label">
        表头文字颜色
        <span class="color-preview" :style="{ background: listPref.headerTextColor }" />
        <span class="setting-value">{{ listPref.headerTextColor }}</span>
      </div>
      <div class="setting-desc">列表表头字段名的文字颜色</div>
      <div class="mt-2">
        <ColorPicker v-model:pure-color="listPref.headerTextColor" format="hex" :theme="theme" />
      </div>
    </div>

    <!-- 表头上下内边距 -->
    <div class="setting-item">
      <div class="setting-label">
        表头上下内边距
        <span class="setting-value">{{ listPref.headerPaddingY }}px</span>
      </div>
      <div class="setting-desc">列表表头单元格的上下 padding</div>
      <div class="mt-2 flex items-center gap-4">
        <Slider
          v-model:value="listPref.headerPaddingY"
          :max="24"
          :min="0"
          :step="1"
          class="flex-1"
        />
        <InputNumber
          v-model:value="listPref.headerPaddingY"
          :max="24"
          :min="0"
          :step="1"
          size="small"
          class="w-[80px]"
        />
      </div>
    </div>

    <!-- 单元格上下内边距 -->
    <div class="setting-item">
      <div class="setting-label">
        单元格上下内边距
        <span class="setting-value">{{ listPref.cellPaddingY }}px</span>
      </div>
      <div class="setting-desc">列表数据行单元格的上下 padding</div>
      <div class="mt-2 flex items-center gap-4">
        <Slider
          v-model:value="listPref.cellPaddingY"
          :max="24"
          :min="0"
          :step="1"
          class="flex-1"
        />
        <InputNumber
          v-model:value="listPref.cellPaddingY"
          :max="24"
          :min="0"
          :step="1"
          size="small"
          class="w-[80px]"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.setting-item {
  margin-bottom: 24px;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-value {
  font-size: 12px;
  color: hsl(var(--primary));
  font-weight: 600;
}

.setting-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.color-preview {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid #e0e0e0;
  flex-shrink: 0;
}
</style>
