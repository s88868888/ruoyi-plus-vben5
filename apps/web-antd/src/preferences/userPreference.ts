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
  /** 是否显示侧边锚点导航 */
  showAnchorNav: boolean;
  /** 导航模式：side=侧边导航，horizontal=横向菜单条 */
  navMode: 'horizontal' | 'side';
  /** 侧边导航左外边距(px) */
  anchorNavMarginLeft: number;
  /** 侧边导航右外边距(px) */
  anchorNavMarginRight: number;
  /** 侧边导航宽度(px) */
  anchorNavWidth: number;
}

export interface ListTablePreference {
  /** 表头背景色 */
  headerBgColor: string;
  /** 表头文字颜色 */
  headerTextColor: string;
  /** 表头上下内边距(px) */
  headerPaddingY: number;
  /** 单元格上下内边距(px) */
  cellPaddingY: number;
}

export interface UserPreference {
  detailPage: DetailPagePreference;
  listTable: ListTablePreference;
}

const DEFAULT_PREFERENCE: UserPreference = {
  detailPage: {
    cardRadius: 16,
    contentWidth: 0,
    fontSize: 14,
    showAnchorNav: true,
    navMode: 'side',
    anchorNavMarginLeft: 10,
    anchorNavMarginRight: 20,
    anchorNavWidth: 210,
  },
  listTable: {
    headerBgColor: '#2b3445',
    headerTextColor: '#f6f6f6',
    headerPaddingY: 8,
    cellPaddingY: 5,
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
        listTable: {
          ...DEFAULT_PREFERENCE.listTable,
          ...parsed.listTable,
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

/** 模块级响应式列表表格偏好状态，所有消费方共享同一个引用 */
const _listState = reactive<ListTablePreference>({
  ...DEFAULT_PREFERENCE.listTable,
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
      if (parsed.listTable) {
        Object.assign(_listState, {
          ...DEFAULT_PREFERENCE.listTable,
          ...parsed.listTable,
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
  watch(
    _listState,
    (val) => {
      if (_syncing) return;
      const userPref = getUserPreference();
      userPref.listTable = toRaw(val);
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

/**
 * 响应式获取列表表格偏好设置。
 * 返回的对象与所有调用方共享，任意一方修改立即全局生效，无需刷新。
 */
export function useListTablePreference(): ListTablePreference {
  return _listState;
}

/**
 * 保存列表表格偏好设置（同时更新响应式状态）
 */
export function setListTablePreference(
  preference: Partial<ListTablePreference>,
): void {
  Object.assign(_listState, preference);
}
