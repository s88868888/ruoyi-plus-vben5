<script setup lang="ts">
import type { BizAiPromptTemplate } from '#/api/bid/promptTemplate';

import { ref, computed, h } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { promptTemplateInfo, promptTemplateAdd, promptTemplateUpdate } from '#/api/bid/promptTemplate';
import SectionTitle from '#/views/resource/companyInfo/modules/section-title.vue';
import { useEditPageStyle } from '#/preferences/useEditPageStyle';

const emit = defineEmits<{
  success: [];
}>();

const isEdit = ref(false);
const templateId = ref<number>();
const { formContainerStyle, drawerWidthStyle } = useEditPageStyle();

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => (isEdit.value ? '编辑AI提示词模板' : '新增AI提示词模板')),
  onOpenChange: async (visible) => {
    if (!visible) {
      await formApi.resetForm();
      return;
    }
    const data = drawerApi.getData<{ id?: number; isEdit: boolean }>();
    if (data) {
      isEdit.value = data.isEdit;
      if (data.isEdit && data.id) {
        templateId.value = data.id;
        drawerApi.drawerLoading(true);
        try {
          const res = await promptTemplateInfo(data.id);
          await formApi.setValues(res);
        } finally {
          drawerApi.drawerLoading(false);
        }
      } else {
        templateId.value = undefined;
        await formApi.setValues({
          isSystem: '0',
          status: '0',
          sortOrder: 0,
        });
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
    labelWidth: 130,
  },
  schema: [
    {
      component: 'Divider',
      fieldName: '_divider_basic',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '基础信息' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'templateName',
      component: 'Input',
      label: '模板名称',
      rules: 'required',
    },
    {
      fieldName: 'templateType',
      component: 'ApiSelect',
      label: '模板类型',
      rules: 'required',
      componentProps: {
        api: '/system/dict/data/type/ai_prompt_template_type',
        labelField: 'dictLabel',
        valueField: 'dictValue',
      },
    },
    {
      component: 'Divider',
      fieldName: '_divider_prompt',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '提示词内容' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'promptContent',
      component: 'Textarea',
      label: '提示词内容',
      rules: 'required',
      formItemClass: 'col-span-2',
      componentProps: {
        rows: 12,
        placeholder: '请输入提示词内容，可使用变量占位符如 {project_name}、{bid_org} 等',
      },
    },
    {
      component: 'Divider',
      fieldName: '_divider_config',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '模板配置' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'sortOrder',
      component: 'InputNumber',
      label: '排序号',
      componentProps: {
        min: 0,
        class: 'w-full',
      },
    },
    {
      fieldName: 'status',
      component: 'RadioGroup',
      label: '状态',
      componentProps: {
        options: [
          { label: '正常', value: '0' },
          { label: '停用', value: '1' },
        ],
      },
    },
    {
      fieldName: 'remark',
      component: 'Textarea',
      label: '备注',
      componentProps: {
        rows: 3,
      },
      formItemClass: 'col-span-2',
    },
  ],
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});

async function handleSubmit() {
  try {
    const { valid } = await formApi.validate();
    if (!valid) return;

    const values = formApi.getValues() as BizAiPromptTemplate;

    if (isEdit.value && templateId.value) {
      values.id = templateId.value;
      await promptTemplateUpdate(values);
      message.success('修改成功');
    } else {
      await promptTemplateAdd(values);
      message.success('新增成功');
    }

    drawerApi.close();
    emit('success');
  } catch (error) {
    console.error('提交失败:', error);
  }
}

defineExpose({
  BasicDrawer,
});
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
