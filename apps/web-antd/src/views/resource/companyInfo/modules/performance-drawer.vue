<script setup lang="ts">
import type { BizPerformance } from '#/api/resource/performance';

import { ref, computed, h } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { performanceInfo, performanceAdd, performanceUpdate } from '#/api/resource/performance';
import { useEditPageStyle } from '#/preferences/useEditPageStyle';
import SectionTitle from './section-title.vue';

const emit = defineEmits<{
  reload: [];
}>();

const { formContainerStyle, drawerWidthStyle } = useEditPageStyle();

const isEdit = ref(false);
const performanceId = ref<number>();
const deptId = ref<number>();

// 需要做 数组⇄字符串 转换的图片/附件字段
const imageFields = [
  'bidNoticeAttachment',
  'contractAttachment',
  'contractImages',
  'acceptanceAttachment',
  'otherAttachment',
] as const;

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => (isEdit.value ? '编辑业绩案例' : '新增业绩案例')),
  onOpenChange: async (visible) => {
    if (!visible) {
      await formApi.resetForm();
      return;
    }
    const data = drawerApi.getData<{ id?: number; deptId?: number; isEdit: boolean }>();
    if (data) {
      isEdit.value = data.isEdit;
      deptId.value = data.deptId;
      if (data.isEdit && data.id) {
        performanceId.value = data.id;
        drawerApi.drawerLoading(true);
        try {
          const res = await performanceInfo(data.id);
          // 后端返回逗号分隔字符串，ImageUpload maxCount>1 需要数组
          for (const field of imageFields) {
            if (res[field] && typeof res[field] === 'string') {
              (res as any)[field] = (res[field] as string).split(',').filter(Boolean);
            }
          }
          await formApi.setValues(res);
        } finally {
          drawerApi.drawerLoading(false);
        }
      } else {
        performanceId.value = undefined;
        await formApi.setValues({ deptId: data.deptId });
      }
    }
  },
  onConfirm: async () => {
    await handleSubmit();
  },
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
      allowClear: true,
    },
    labelWidth: 140,
  },
  schema: [
    // ---- 基本信息 ----
    {
      component: 'Divider',
      fieldName: '_divider_basic',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '基本信息' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'name',
      label: '项目名称',
      component: 'Input',
      rules: 'required',
    },
    {
      fieldName: 'performanceCategory',
      label: '业绩分类',
      component: 'Input',
      rules: 'required',
    },
    {
      fieldName: 'projectProvince',
      label: '项目所在省份',
      component: 'Input',
      rules: 'required',
    },
    {
      fieldName: 'projectCity',
      label: '项目所在城市',
      component: 'Input',
    },
    {
      fieldName: 'projectStatus',
      label: '项目状态',
      component: 'Input',
    },
    {
      fieldName: 'projectScale',
      label: '工程规模',
      component: 'Input',
    },
    {
      fieldName: 'processType',
      label: '工艺类型',
      component: 'Input',
    },
    {
      fieldName: 'projectContent',
      label: '工程内容',
      component: 'Textarea',
      formItemClass: 'col-span-2',
      componentProps: {
        rows: 3,
      },
    },
    {
      fieldName: 'projectAnalysis',
      label: '工程分析',
      component: 'Textarea',
      formItemClass: 'col-span-2',
      componentProps: {
        rows: 3,
      },
    },
    {
      fieldName: 'otherFeatures',
      label: '其他工程特性描述',
      component: 'Textarea',
      formItemClass: 'col-span-2',
      componentProps: {
        rows: 3,
      },
    },
    // ---- 业主信息 ----
    {
      component: 'Divider',
      fieldName: '_divider_owner',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '业主信息' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'ownerUnitName',
      label: '业主单位名称',
      component: 'Input',
      rules: 'required',
    },
    {
      fieldName: 'ownerUnitNature',
      label: '业主单位性质',
      component: 'Input',
      rules: 'required',
    },
    {
      fieldName: 'ownerUnitContact',
      label: '业主单位联系人',
      component: 'Input',
    },
    // ---- 中标与合同 ----
    {
      component: 'Divider',
      fieldName: '_divider_bid',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '中标与合同' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'bidDate',
      label: '中标日期',
      component: 'DatePicker',
      componentProps: {
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
    },
    {
      fieldName: 'bidAmount',
      label: '中标金额',
      component: 'InputNumber',
      componentProps: {
        min: 0,
      },
    },
    {
      fieldName: 'bidUnitPrice',
      label: '中标单价',
      component: 'InputNumber',
      componentProps: {
        min: 0,
      },
    },
    {
      fieldName: 'signingDate',
      label: '签约日期',
      component: 'DatePicker',
      componentProps: {
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
    },
    {
      fieldName: 'contractAmount',
      label: '合同金额（元）',
      component: 'InputNumber',
      componentProps: {
        min: 0,
      },
    },
    {
      fieldName: 'bidPublicityLink',
      label: '中标公示链接',
      component: 'Input',
    },
    // ---- 施工信息 ----
    {
      component: 'Divider',
      fieldName: '_divider_construction',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '施工信息' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'startDate',
      label: '开工日期',
      component: 'DatePicker',
      componentProps: {
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
    },
    {
      fieldName: 'completionDate',
      label: '竣工日期',
      component: 'DatePicker',
      componentProps: {
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
    },
    {
      fieldName: 'constructionDept',
      label: '住建部门',
      component: 'Input',
    },
    {
      fieldName: 'taskUnit',
      label: '任务单位',
      component: 'Input',
    },
    {
      fieldName: 'implementationDept',
      label: '实施部门',
      component: 'Input',
    },
    {
      fieldName: 'projectManager',
      label: '项目负责人',
      component: 'Input',
    },
    {
      fieldName: 'technicalManager',
      label: '技术负责人',
      component: 'Input',
    },
    {
      fieldName: 'projectDirector',
      label: '项目经理',
      component: 'Input',
    },
    // ---- 图片附件 ----
    {
      component: 'Divider',
      fieldName: '_divider_attachments',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '图片附件' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'bidNoticeAttachment',
      label: '中标通知附件',
      component: 'ImageUpload',
      formItemClass: 'col-span-2',
      componentProps: {
        maxCount: 10,
        maxSize: 10,
        accept: 'image/jpg,image/jpeg,image/png',
        multiple: true,
      },
    },
    {
      fieldName: 'contractAttachment',
      label: '合同附件',
      component: 'ImageUpload',
      formItemClass: 'col-span-2',
      componentProps: {
        maxCount: 10,
        maxSize: 10,
        accept: 'image/jpg,image/jpeg,image/png',
        multiple: true,
      },
    },
    {
      fieldName: 'contractImages',
      label: '合同图片',
      component: 'ImageUpload',
      formItemClass: 'col-span-2',
      componentProps: {
        maxCount: 10,
        maxSize: 10,
        accept: 'image/jpg,image/jpeg,image/png',
        multiple: true,
      },
    },
    {
      fieldName: 'acceptanceAttachment',
      label: '验收资料附件',
      component: 'ImageUpload',
      formItemClass: 'col-span-2',
      componentProps: {
        maxCount: 10,
        maxSize: 10,
        accept: 'image/jpg,image/jpeg,image/png',
        multiple: true,
      },
    },
    {
      fieldName: 'otherAttachment',
      label: '其他附件',
      component: 'ImageUpload',
      formItemClass: 'col-span-2',
      componentProps: {
        maxCount: 10,
        maxSize: 10,
        accept: 'image/jpg,image/jpeg,image/png',
        multiple: true,
      },
    },
    // ---- 其他信息 ----
    {
      component: 'Divider',
      fieldName: '_divider_other',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '其他信息' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'remark',
      label: '备注',
      component: 'Textarea',
      formItemClass: 'col-span-2',
      componentProps: {
        rows: 3,
      },
    },
  ],
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});

async function handleSubmit() {
  try {
    const { valid } = await formApi.validate();
    if (!valid) return;

    drawerApi.lock(true);
    const values = await formApi.getValues();
    // ImageUpload maxCount>1 时返回数组，后端期望逗号分隔字符串
    const converted: Record<string, any> = {};
    for (const field of imageFields) {
      converted[field] = Array.isArray(values[field])
        ? values[field].join(',')
        : values[field];
    }
    const data = {
      ...values,
      ...converted,
      id: isEdit.value ? performanceId.value : undefined,
      deptId: deptId.value,
    };

    if (isEdit.value) {
      await performanceUpdate(data);
      message.success('修改成功');
    } else {
      const res = await performanceAdd(data);
      performanceId.value = res?.id;
      isEdit.value = true;
      message.success('新增成功');
    }

    emit('reload');
  } finally {
    drawerApi.lock(false);
  }
}
</script>

<template>
  <BasicDrawer class="w-[1000px]" :style="drawerWidthStyle">
    <div :style="formContainerStyle">
      <Form />
    </div>
  </BasicDrawer>
</template>

<style scoped>
:deep(.section-title-divider.ant-divider-horizontal.ant-divider-with-text)::before,
:deep(.section-title-divider.ant-divider-horizontal.ant-divider-with-text)::after {
  display: none;
}

:deep(.section-title-divider .ant-divider-inner-text) {
  padding-left: 0;
}
</style>
