/**
 * 用户偏好设置管理
 * 用于存储用户在系统中的个人偏好设置
 */

import { effectScope, reactive, toRaw, watch } from 'vue';

export interface DetailPagePreference {
  /** 卡片圆角(px) */
  cardRadius: number;
  /** 内容最大宽度(px)，0 表示铺满不限制 */
  contentWidth: number;
  /** 内容字体大小(px) */
  fontSize: number;
}

export interface UserPreference {
  detailPage: DetailPagePreference;
}

const DEFAULT_PREFERENCE: UserPreference = {
  detailPage: {
    cardRadius: 16,
    contentWidth: 0,
    fontSize: 14,
  },
};

const STORAGE_KEY = 'userPreference';

/**
 * 获取用户偏好设置
 */
export function getUserPreference(): UserPreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_PREFERENCE,
        detailPage: {
          ...DEFAULT_PREFERENCE.detailPage,
          ...parsed.detailPage,
        },
      };
    }
  } catch {
    // 忽略解析错误
  }
  return DEFAULT_PREFERENCE;
}

/**
 * 保存用户偏好设置
 */
export function setUserPreference(preference: UserPreference): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
}

/**
 * 获取详情页偏好设置（非响应式，仅供初始化使用）
 */
export function getDetailPagePreference(): DetailPagePreference {
  return getUserPreference().detailPage;
}

// ─── 响应式单例 ───────────────────────────────────────────────────────────────

/** 模块级响应式详情页偏好状态，所有消费方共享同一个引用 */
const _state = reactive<DetailPagePreference>({
  ...DEFAULT_PREFERENCE.detailPage,
});

/** 是否正在从 storage 同步（防止 watch 和事件监听器形成循环） */
let _syncing = false;

function _syncFromStorage() {
  _syncing = true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.detailPage) {
        Object.assign(_state, {
          ...DEFAULT_PREFERENCE.detailPage,
          ...parsed.detailPage,
        });
      }
    }
  } catch {
    // ignore
  }
  _syncing = false;
}

// 初始化：从 localStorage 读取
_syncFromStorage();

// 在 detached scope 中监听状态变更，自动持久化到 localStorage
const _scope = effectScope(true);
_scope.run(() => {
  watch(
    _state,
    (val) => {
      if (_syncing) return;
      const userPref = getUserPreference();
      userPref.detailPage = toRaw(val);
      setUserPreference(userPref);
    },
    { deep: true },
  );
});

// 监听来自设置面板（packages/ 内）的变更通知
if (typeof window !== 'undefined') {
  window.addEventListener('userPreferenceChanged', _syncFromStorage);
}

/**
 * 响应式获取详情页偏好设置。
 * 返回的对象与所有调用方共享，任意一方修改立即全局生效，无需刷新。
 */
export function useDetailPagePreference(): DetailPagePreference {
  return _state;
}

/**
 * 保存详情页偏好设置（同时更新响应式状态）
 */
export function setDetailPagePreference(
  preference: Partial<DetailPagePreference>,
): void {
  Object.assign(_state, preference);
}
