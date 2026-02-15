<script setup lang="ts">
import type { BizFinanceInfo } from '#/api/resource/finance';

import { ref, computed } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { financeInfo, financeAdd, financeUpdate } from '#/api/resource/finance';

const emit = defineEmits<{
  reload: [];
}>();

const mode = ref<'add' | 'edit' | 'view'>('add');
const financeId = ref<number>();
const deptId = ref<number>();

const isViewMode = computed(() => mode.value === 'view');

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => {
    if (mode.value === 'view') return '查看财务信息';
    if (mode.value === 'edit') return '编辑财务信息';
    return '新增财务信息';
  }),
  closable: true,
  onOpenChange: async (visible) => {
    if (!visible) {
      await formApi.resetForm();
      return;
    }
    const data = drawerApi.getData<{ id?: number; deptId?: number; mode: 'add' | 'edit' | 'view' }>();
    if (data) {
      mode.value = data.mode;
      deptId.value = data.deptId;

      if ((data.mode === 'edit' || data.mode === 'view') && data.id) {
        financeId.value = data.id;
        drawerApi.drawerLoading(true);
        try {
          const res = await financeInfo(data.id);
          // 处理附件回显
          const formData: any = { ...res };
          if (res.attachmentUrl) {
            formData.attachmentUrl = res.attachmentUrl;
          }
          await formApi.setValues(formData);

          // 查看模式禁用所有字段
          if (data.mode === 'view') {
            formApi.setSchemaByPath('*', { componentProps: { disabled: true } });
          } else {
            formApi.setSchemaByPath('*', { componentProps: { disabled: false } });
          }
        } finally {
          drawerApi.drawerLoading(false);
        }
      } else {
        financeId.value = undefined;
        await formApi.setValues({ deptId: data.deptId, dataPermissionType: '0' });
        formApi.setSchemaByPath('*', { componentProps: { disabled: false } });
      }
    }
  },
  onConfirm: async () => {
    if (!isViewMode.value) {
      await handleSubmit();
    }
  },
  footer: computed(() => {
    if (isViewMode.value) {
      return {
        showConfirmButton: false,
        showCancelButton: true,
        cancelText: '关闭',
      };
    }
    return {
      showConfirmButton: true,
      showCancelButton: true,
      confirmText: '确定',
      cancelText: '取消',
    };
  }),
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
      allowClear: true,
    },
    labelWidth: 120,
  },
  schema: [
    {
      fieldName: 'financeName',
      label: '财务信息名称',
      component: 'Input',
      rules: 'required',
      componentProps: {
        maxlength: 60,
        showCount: true,
      },
    },
    {
      fieldName: 'infoType',
      label: '信息类型',
      component: 'Input',
      rules: 'required',
    },
    {
      fieldName: 'financeDate',
      label: '时间',
      component: 'DatePicker',
      rules: 'required',
      componentProps: {
        class: 'w-full',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
    },
    {
      fieldName: 'dataPermissionType',
      label: '数据权限类型',
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '私密', value: '0' },
          { label: '公开', value: '1' },
        ],
      },
    },
    {
      fieldName: 'attachmentUrl',
      label: '附件',
      component: 'Upload',
      componentProps: {
        api: '/system/oss/upload',
        maxCount: 1,
        maxSize: 50,
        accept: 'application/pdf',
      },
      help: '单个PDF文件，最大50M',
    },
    {
      fieldName: 'remark',
      label: '备注',
      component: 'Textarea',
      componentProps: {
        rows: 3,
      },
    },
  ],
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1',
});

async function handleSubmit() {
  try {
    const { valid } = await formApi.validate();
    if (!valid) return;

    drawerApi.lock(true);
    const values = await formApi.getValues();

    // 处理附件字段
    let attachmentUrl = '';
    let attachmentName = '';
    if (values.attachmentUrl) {
      if (typeof values.attachmentUrl === 'string') {
        // 编辑时已有附件
        attachmentUrl = values.attachmentUrl;
        // 如果有原始的attachmentName，保留它
        const currentValues = await formApi.getValues();
        attachmentName = currentValues.attachmentName || '';
      } else if (Array.isArray(values.attachmentUrl) && values.attachmentUrl.length > 0) {
        // 新上传的附件
        const file = values.attachmentUrl[0];
        attachmentUrl = file.url || file.response?.data?.url || '';
        attachmentName = file.name || '';
      }
    }

    const data = {
      ...values,
      id: mode.value === 'edit' ? financeId.value : undefined,
      deptId: deptId.value,
      attachmentUrl,
      attachmentName,
    };

    if (mode.value === 'edit') {
      await financeUpdate(data);
      message.success('修改成功');
    } else {
      const res = await financeAdd(data);
      financeId.value = res?.id;
      mode.value = 'edit';
      message.success('新增成功');
    }

    emit('reload');
    drawerApi.close();
  } finally {
    drawerApi.lock(false);
  }
}
</script>

<template>
  <BasicDrawer class="w-[800px]">
    <Form />
  </BasicDrawer>
</template>
