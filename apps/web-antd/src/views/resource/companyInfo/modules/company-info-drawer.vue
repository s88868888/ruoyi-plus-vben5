<script setup lang="ts">
import type { BizCompanyInfo } from '#/api/resource/companyInfo';

import { ref, computed } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';

import { IconifyIcon } from '@vben/icons';

import { companyInfoAdd, companyInfoUpdate } from '#/api/resource/companyInfo';
import { useEditPageStyle } from '#/preferences/useEditPageStyle';
import {
  businessLicenseSchema,
  enterpriseInfoSchema,
  bankInfoSchema,
  otherInfoSchema,
} from '../data';

const emit = defineEmits<{
  success: [];
}>();

const { formContainerStyle, drawerWidthStyle } = useEditPageStyle();

// 当前编辑的分区
const currentSection = ref<string>('license');
const companyData = ref<BizCompanyInfo>({});
const deptId = ref<number>();

// 根据分区获取表单配置
const formSchema = computed(() => {
  switch (currentSection.value) {
    case 'license':
      return businessLicenseSchema();
    case 'enterprise':
      return enterpriseInfoSchema();
    case 'bank':
      return bankInfoSchema();
    case 'other':
      return otherInfoSchema();
    default:
      return businessLicenseSchema();
  }
});

// 分区图标
const sectionIcon = computed(() => {
  switch (currentSection.value) {
    case 'license':
      return 'material-symbols-light:license';
    case 'enterprise':
      return 'material-symbols-light:enterprise';
    case 'bank':
      return 'material-symbols-light:account-balance';
    case 'other':
      return 'material-symbols-light:info';
    default:
      return 'material-symbols-light:info';
  }
});

// 分区标题
const sectionTitle = computed(() => {
  switch (currentSection.value) {
    case 'license':
      return '编辑营业执照信息';
    case 'enterprise':
      return '编辑企业信息';
    case 'bank':
      return '编辑开户信息';
    case 'other':
      return '编辑其他信息';
    default:
      return '编辑信息';
  }
});

// 表单
const [BasicForm, formApi] = useVbenForm({
  commonConfig: {
    labelWidth: 120,
    componentProps: { class: 'w-full' },
  },
  schema: formSchema.value,
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});

// 打开抽屉
function open(section: string, data: BizCompanyInfo, dept: number) {
  currentSection.value = section;
  companyData.value = data;
  deptId.value = dept;

  // 更新表单配置
  formApi.setState({ schema: formSchema.value });

  // 设置表单值
  setTimeout(() => {
    formApi.setValues(data);
  }, 100);

  drawerApi.open();
}

// 提交
async function handleSubmit() {
  try {
    const values = await formApi.getValues();

    const submitData: BizCompanyInfo = {
      ...companyData.value,
      ...values,
      deptId: deptId.value,
    };

    if (submitData.id) {
      await companyInfoUpdate(submitData);
    } else {
      await companyInfoAdd(submitData);
    }

    emit('success');
    drawerApi.close();
  } catch (error) {
    console.error('保存失败:', error);
  }
}

const [BasicDrawer, drawerApi] = useVbenDrawer({
  onConfirm: handleSubmit,
});

// 暴露方法
defineExpose({
  open,
});
</script>

<template>
  <BasicDrawer :title="sectionTitle" class="w-[900px]" :style="drawerWidthStyle">
    <template #headerPrefix>
      <IconifyIcon :icon="sectionIcon" class="text-lg text-primary" />
    </template>
    <div :style="formContainerStyle">
      <BasicForm />
    </div>
  </BasicDrawer>
</template>

<style scoped>
/* 分栏标题：去掉横线，统一左对齐 */
:deep(.section-title-divider.ant-divider-horizontal.ant-divider-with-text)::before,
:deep(.section-title-divider.ant-divider-horizontal.ant-divider-with-text)::after {
  display: none;
}

:deep(.section-title-divider .ant-divider-inner-text) {
  padding-left: 0;
}
</style>
