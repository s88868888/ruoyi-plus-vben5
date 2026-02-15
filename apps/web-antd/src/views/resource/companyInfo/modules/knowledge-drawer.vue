<script setup lang="ts">
import type { BizProjectKnowledge } from '#/api/resource/knowledge';

import { ref, computed } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { knowledgeInfo, knowledgeAdd, knowledgeUpdate } from '#/api/resource/knowledge';

const emit = defineEmits<{
  reload: [];
}>();

const mode = ref<'add' | 'edit' | 'view'>('add');
const knowledgeId = ref<number>();
const deptId = ref<number>();

const isViewMode = computed(() => mode.value === 'view');

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => {
    if (mode.value === 'view') return '查看项目知识';
    if (mode.value === 'edit') return '编辑项目知识';
    return '新增项目知识';
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
        knowledgeId.value = data.id;
        drawerApi.drawerLoading(true);
        try {
          const res = await knowledgeInfo(data.id);
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
        knowledgeId.value = undefined;
        await formApi.setValues({ deptId: data.deptId, dataPermissionType: '1' });
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
      fieldName: 'projectType',
      label: '挂标项目类型',
      component: 'Input',
      rules: 'required',
    },
    {
      fieldName: 'attachmentUrl',
      label: '附件',
      component: 'Upload',
      rules: 'required',
      componentProps: {
        api: '/system/oss/upload',
        maxCount: 1,
        maxSize: 150,
        accept: 'application/pdf,.docx',
      },
      help: '支持1个pdf、docx文件，单个文件最大150M',
    },
    {
      fieldName: 'description',
      label: '描述',
      component: 'Textarea',
      componentProps: {
        rows: 3,
        maxlength: 1000,
        showCount: true,
      },
    },
    {
      fieldName: 'dataPermissionType',
      label: '数据权限类型',
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '私域', value: '0' },
          { label: '公域', value: '1' },
        ],
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
    let knowledgeName = '';
    if (values.attachmentUrl) {
      if (typeof values.attachmentUrl === 'string') {
        // 编辑时已有附件
        attachmentUrl = values.attachmentUrl;
        // 如果有原始的attachmentName，保留它
        const currentValues = await formApi.getValues();
        attachmentName = currentValues.attachmentName || '';
        knowledgeName = currentValues.knowledgeName || '';
      } else if (Array.isArray(values.attachmentUrl) && values.attachmentUrl.length > 0) {
        // 新上传的附件
        const file = values.attachmentUrl[0];
        attachmentUrl = file.url || file.response?.data?.url || '';
        attachmentName = file.name || '';
        // 从文件名提取知识名称（去掉扩展名）
        knowledgeName = attachmentName.replace(/\.(pdf|docx)$/i, '');
      }
    }

    const data = {
      ...values,
      id: mode.value === 'edit' ? knowledgeId.value : undefined,
      deptId: deptId.value,
      knowledgeName,
      attachmentUrl,
      attachmentName,
    };

    if (mode.value === 'edit') {
      await knowledgeUpdate(data);
      message.success('修改成功');
    } else {
      const res = await knowledgeAdd(data);
      knowledgeId.value = res?.id;
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
