<script setup lang="ts">
import type { BizQualification } from '#/api/resource/qualification';

import { ref, computed, h } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { qualificationInfo, qualificationAdd, qualificationUpdate } from '#/api/resource/qualification';
import SectionTitle from './section-title.vue';
import { qualificationOptions } from './common-options';

const emit = defineEmits<{
  reload: [];
}>();

const isEdit = ref(false);
const qualificationId = ref<number>();
const deptId = ref<number>();

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => (isEdit.value ? '编辑企业资质' : '新增企业资质')),
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
        qualificationId.value = data.id;
        drawerApi.drawerLoading(true);
        try {
          const res = await qualificationInfo(data.id);
          // 后端返回逗号分隔字符串，ImageUpload maxCount>1 需要数组
          if (res.certImages && typeof res.certImages === 'string') {
            res.certImages = res.certImages.split(',').filter(Boolean);
          }
          await formApi.setValues(res);
        } finally {
          drawerApi.drawerLoading(false);
        }
      } else {
        qualificationId.value = undefined;
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
    labelWidth: 120,
  },
  schema: [
    // ---- 证书信息 ----
    {
      component: 'Divider',
      fieldName: '_divider_cert',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '证书信息' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'certName',
      label: '证书名称',
      component: 'Input',
      rules: 'required',
      componentProps: {
        maxlength: 80,
        showCount: true,
      },
    },
    {
      fieldName: 'certNumber',
      label: '证书编号',
      component: 'Input',
      rules: 'required',
      componentProps: {
        maxlength: 80,
        showCount: true,
      },
    },
    {
      fieldName: 'certCategory',
      label: '证书类别',
      component: 'AutoComplete',
      rules: 'required',
      componentProps: {
        options: qualificationOptions.certCategory.map(v => ({ value: v })),
        placeholder: '请输入或选择证书类别',
        allowClear: true,
        showSearch: true,
        filterOption: (input: string, option: any) =>
          option.value.toLowerCase().includes(input.toLowerCase()),
      },
    },
    {
      fieldName: 'issuingAuthority',
      label: '发证机关',
      component: 'AutoComplete',
      rules: 'required',
      componentProps: {
        options: qualificationOptions.issuingAuthority.map(v => ({ value: v })),
        placeholder: '请输入或选择发证机关',
        allowClear: true,
        showSearch: true,
        filterOption: (input: string, option: any) =>
          option.value.toLowerCase().includes(input.toLowerCase()),
      },
    },
    {
      fieldName: 'certStatus',
      label: '证书状态',
      component: 'AutoComplete',
      componentProps: {
        options: qualificationOptions.certStatus.map(v => ({ value: v })),
        placeholder: '请输入或选择证书状态',
        allowClear: true,
        showSearch: true,
        filterOption: (input: string, option: any) =>
          option.value.toLowerCase().includes(input.toLowerCase()),
      },
    },
    // ---- 有效期 ----
    {
      component: 'Divider',
      fieldName: '_divider_validity',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '有效期' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'validStartDate',
      label: '有效期开始时间',
      component: 'DatePicker',
      rules: 'required',
      componentProps: {
        class: 'w-full',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
    },
    {
      fieldName: 'validEndDate',
      label: '有效期结束时间',
      component: 'DatePicker',
      componentProps: {
        class: 'w-full',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
    },
    // ---- 图片资料 ----
    {
      component: 'Divider',
      fieldName: '_divider_images',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '图片资料' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'certImages',
      label: '证书图片',
      component: 'ImageUpload',
      rules: 'required',
      formItemClass: 'col-span-2',
      componentProps: {
        maxCount: 30,
        maxSize: 10,
        accept: 'image/jpg,image/jpeg,image/png',
        multiple: true,
      },
      help: '最多上传30张，支持jpg、jpeg、png格式，单张最大10M',
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
    const data = {
      ...values,
      id: isEdit.value ? qualificationId.value : undefined,
      deptId: deptId.value,
      // ImageUpload maxCount>1 时返回数组，后端期望逗号分隔字符串
      certImages: Array.isArray(values.certImages)
        ? values.certImages.join(',')
        : values.certImages,
    };

    if (isEdit.value) {
      await qualificationUpdate(data);
      message.success('修改成功');
    } else {
      const res = await qualificationAdd(data);
      qualificationId.value = res?.id;
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
  <BasicDrawer class="w-[900px]">
    <Form />
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
