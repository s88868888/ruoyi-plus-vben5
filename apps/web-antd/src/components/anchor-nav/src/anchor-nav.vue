<script setup lang="ts">
import type { AnchorNavItem } from './types';

import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    /** 导航项列表，支持分组 */
    items: AnchorNavItem[];
    /** 滚动容器元素 */
    container?: HTMLElement | null;
    /** 滚动偏移量（距顶部多少像素时判定为激活） */
    offset?: number;
  }>(),
  {
    container: null,
    offset: 20,
  },
);

const activeKey = ref('');

/** 展平所有可点击的叶子项 */
const flatItems = computed(() => {
  const result: AnchorNavItem[] = [];
  for (const item of props.items) {
    if (item.children && item.children.length > 0) {
      result.push(...item.children);
    } else {
      result.push(item);
    }
  }
  return result;
});

/** 点击滚动到指定锚点 */
function scrollToSection(key: string) {
  const el = document.getElementById(key);
  if (!el) return;

  activeKey.value = key;

  const container = props.container;
  if (container) {
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    container.scrollTo({
      top: container.scrollTop + elRect.top - containerRect.top - props.offset,
      behavior: 'smooth',
    });
  } else {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/** 监听滚动，更新激活项 */
function handleScroll() {
  const container = props.container;
  if (!container) return;

  const containerTop = container.getBoundingClientRect().top;
  let current = '';

  for (const item of flatItems.value) {
    const el = document.getElementById(item.key);
    if (!el) continue;
    if (el.getBoundingClientRect().top - containerTop <= props.offset + 20) {
      current = item.key;
    }
  }

  if (current) {
    activeKey.value = current;
  }
}

let cleanup: (() => void) | null = null;

function setupScrollListener() {
  cleanup?.();
  cleanup = null;

  const container = props.container;
  if (container) {
    container.addEventListener('scroll', handleScroll, { passive: true });
    cleanup = () => container.removeEventListener('scroll', handleScroll);
    handleScroll();
  }
}

onMounted(() => {
  if (flatItems.value.length > 0 && !activeKey.value) {
    activeKey.value = flatItems.value[0]!.key;
  }
  nextTick(setupScrollListener);
});

onBeforeUnmount(() => {
  cleanup?.();
});

watch(
  () => props.container,
  () => {
    nextTick(setupScrollListener);
  },
);
</script>

<template>
  <nav class="anchor-nav">
    <template v-for="item in items" :key="item.key">
      <!-- 分组模式：有子项 -->
      <template v-if="item.children && item.children.length">
        <div class="anchor-nav-group">
          <div class="anchor-nav-group-title">{{ item.title }}</div>
          <div
            v-for="child in item.children"
            :key="child.key"
            class="anchor-nav-item"
            :class="{ 'anchor-nav-item-active': activeKey === child.key }"
            @click="scrollToSection(child.key)"
          >
            <span class="anchor-nav-dot" />
            <span class="anchor-nav-text">{{ child.title }}</span>
          </div>
        </div>
      </template>
      <!-- 扁平模式：无子项 -->
      <template v-else>
        <div
          class="anchor-nav-item"
          :class="{ 'anchor-nav-item-active': activeKey === item.key }"
          @click="scrollToSection(item.key)"
        >
          <span class="anchor-nav-dot" />
          <span class="anchor-nav-text">{{ item.title }}</span>
        </div>
      </template>
    </template>
  </nav>
</template>

<style scoped>
.anchor-nav {
  width: 140px;
  flex-shrink: 0;
  position: sticky;
  top: 20px;
  align-self: flex-start;
  padding: 12px 0;
}

.anchor-nav-group {
  margin-bottom: 4px;
}

.anchor-nav-group-title {
  font-size: 13px;
  color: #909399;
  padding: 10px 0 4px 16px;
  line-height: 20px;
  font-weight: 500;
}

.anchor-nav-item {
  display: flex;
  align-items: center;
  padding: 7px 12px 7px 16px;
  cursor: pointer;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.55);
  transition: all 0.2s;
  border-left: 2px solid transparent;
  line-height: 20px;
}

.anchor-nav-item:hover {
  color: hsl(var(--primary));
}

.anchor-nav-item-active {
  color: hsl(var(--primary));
  border-left-color: hsl(var(--primary));
  font-weight: 500;
}

.anchor-nav-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  margin-right: 8px;
  flex-shrink: 0;
}

.anchor-nav-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
