<script setup lang="ts">
import type { BizPerformance } from '#/api/resource/performance';

import { ref, computed } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { Tabs, TabPane, message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { performanceInfo, performanceAdd, performanceUpdate } from '#/api/resource/performance';

const emit = defineEmits<{
  reload: [];
}>();

const isEdit = ref(false);
const performanceId = ref<number>();
const deptId = ref<number>();
const activeTab = ref('basic');

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => (isEdit.value ? '编辑业绩案例' : '新增业绩案例')),
  onOpenChange: async (visible) => {
    if (!visible) {
      await formApi.resetForm();
      activeTab.value = 'basic';
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
          await formApi.setValues(res);
        } finally {
          drawerApi.drawerLoading(false);
        }
      } else {
        performanceId.value = undefined;
        await formApi.setValues({ deptId: data.deptId, dataPermissionType: '1' });
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
      fieldName: 'ownerUnitNature',
      label: '业主单位性质',
      component: 'Input',
      rules: 'required',
    },
    {
      fieldName: 'ownerUnitName',
      label: '业主单位名称',
      component: 'Input',
      rules: 'required',
    },
    {
      fieldName: 'ownerUnitContact',
      label: '业主单位联系人',
      component: 'Input',
    },
    {
      fieldName: 'projectStatus',
      label: '项目状态',
      component: 'Input',
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
      fieldName: 'bidDate',
      label: '中标日期',
      component: 'DatePicker',
      componentProps: {
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
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
      fieldName: 'contractAmount',
      label: '合同金额（元）',
      component: 'InputNumber',
      componentProps: {
        min: 0,
      },
    },
    {
      fieldName: 'name',
      label: '项目名称',
      component: 'Input',
      rules: 'required',
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
      fieldName: 'projectScale',
      label: '工程规模',
      component: 'Input',
    },
    {
      fieldName: 'implementationDept',
      label: '实施部门',
      component: 'Input',
    },
    {
      fieldName: 'projectContent',
      label: '工程内容',
      component: 'Textarea',
      componentProps: {
        rows: 3,
      },
    },
    {
      fieldName: 'projectAnalysis',
      label: '工程分析',
      component: 'Textarea',
      componentProps: {
        rows: 3,
      },
    },
    {
      fieldName: 'otherFeatures',
      label: '其他工程特性描述',
      component: 'Textarea',
      componentProps: {
        rows: 3,
      },
    },
    {
      fieldName: 'processType',
      label: '工艺类型',
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
    {
      fieldName: 'remark',
      label: '备注',
      component: 'Textarea',
      componentProps: {
        rows: 3,
      },
    },
    {
      fieldName: 'bidPublicityLink',
      label: '中标公示链接',
      component: 'Input',
    },
    {
      fieldName: 'dataPermissionType',
      label: '数据权限类型',
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '私域', value: '1' },
          { label: '公域', value: '0' },
        ],
      },
    },
    {
      fieldName: 'bidNoticeAttachment',
      label: '中标通知附件',
      component: 'Upload',
      componentProps: {
        api: '/system/oss/upload',
        maxCount: 10,
        maxSize: 10,
        accept: 'image/*',
        multiple: true,
      },
    },
    {
      fieldName: 'contractAttachment',
      label: '合同附件',
      component: 'Upload',
      componentProps: {
        api: '/system/oss/upload',
        maxCount: 10,
        maxSize: 10,
        accept: 'image/*',
        multiple: true,
      },
    },
    {
      fieldName: 'contractImages',
      label: '合同图片',
      component: 'Upload',
      componentProps: {
        api: '/system/oss/upload',
        maxCount: 10,
        maxSize: 10,
        accept: 'image/*',
        multiple: true,
      },
    },
    {
      fieldName: 'acceptanceAttachment',
      label: '验收资料附件',
      component: 'Upload',
      componentProps: {
        api: '/system/oss/upload',
        maxCount: 10,
        maxSize: 10,
        accept: 'image/*',
        multiple: true,
      },
    },
    {
      fieldName: 'otherAttachment',
      label: '其他附件',
      component: 'Upload',
      componentProps: {
        api: '/system/oss/upload',
        maxCount: 10,
        maxSize: 10,
        accept: 'image/*',
        multiple: true,
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
    const data = {
      ...values,
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
  <BasicDrawer class="w-[1000px]">
    <Form />
  </BasicDrawer>
</template>
