import type { TenantOption } from '#/api/core/auth';

import { ref } from 'vue';

import { defineStore } from 'pinia';

import { tenantList as tenantListApi } from '#/api/core/auth';

/**
 * 用于超级管理员切换租户
 */
export const useTenantStore = defineStore('app-tenant', () => {
  // 是否已经选中租户
  const checked = ref(false);
  // 是否开启租户功能
  const tenantEnable = ref(true);
  const tenantList = ref<TenantOption[]>([]);

  // 初始化 获取租户信息
  async function initTenant() {
    try {
      const { tenantEnabled, voList } = await tenantListApi();
      tenantEnable.value = tenantEnabled;
      tenantList.value = voList;
    } catch (error) {
      console.error('Failed to initialize tenant:', error);
      // 如果获取租户信息失败，默认关闭多租户功能
      tenantEnable.value = false;
      tenantList.value = [];
    }
  }

  async function setChecked(_checked: boolean) {
    checked.value = _checked;
  }

  function $reset() {
    checked.value = false;
    tenantEnable.value = true;
    tenantList.value = [];
  }

  return {
    $reset,
    checked,
    initTenant,
    setChecked,
    tenantEnable,
    tenantList,
  };
});
