<script setup lang="ts">
import { InputNumber, Slider } from 'ant-design-vue';

import { useDetailPagePreference } from '#/preferences/userPreference';

const preference = useDetailPagePreference();
</script>

<template>
  <div class="mt-[16px] md:w-full lg:w-3/4 2xl:w-3/5">
    <h3 class="mb-6 text-base font-semibold">详情页设置</h3>

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
</style>
