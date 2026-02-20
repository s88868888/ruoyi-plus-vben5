<script setup lang="ts">
import type { BizProduct } from '#/api/resource/product';

import { ref, computed, h } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { productInfo, productAdd, productUpdate } from '#/api/resource/product';
import SectionTitle from './section-title.vue';

const emit = defineEmits<{
  reload: [];
}>();

const isEdit = ref(false);
const productId = ref<number>();
const deptId = ref<number>();

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => (isEdit.value ? '编辑产品' : '新增产品')),
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
        productId.value = data.id;
        drawerApi.drawerLoading(true);
        try {
          const res = await productInfo(data.id);
          // 后端返回逗号分隔字符串，ImageUpload maxCount>1 需要数组
          if (res.relatedImages && typeof res.relatedImages === 'string') {
            res.relatedImages = res.relatedImages.split(',').filter(Boolean);
          }
          await formApi.setValues(res);
        } finally {
          drawerApi.drawerLoading(false);
        }
      } else {
        productId.value = undefined;
        await formApi.setValues({ deptId: data.deptId, hasPurchaseContract: '0' });
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
      fieldName: 'productName',
      label: '产品名称',
      component: 'Input',
      rules: 'required',
    },
    {
      fieldName: 'productModel',
      label: '产品型号',
      component: 'Input',
    },
    {
      fieldName: 'productCategory',
      label: '产品分类',
      component: 'Input',
    },
    {
      fieldName: 'quantity',
      label: '数量',
      component: 'InputNumber',
      componentProps: {
        min: 0,
        class: 'w-full',
      },
    },
    {
      fieldName: 'useStartDate',
      label: '投入使用开始时间',
      component: 'DatePicker',
      componentProps: {
        class: 'w-full',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
    },
    {
      fieldName: 'useEndDate',
      label: '投入使用结束时间',
      component: 'DatePicker',
      componentProps: {
        class: 'w-full',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
    },
    {
      fieldName: 'hasPurchaseContract',
      label: '是否有购买合同',
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '否', value: '0' },
          { label: '是', value: '1' },
        ],
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
      fieldName: 'productImage',
      label: '实物图片',
      component: 'ImageUpload',
      formItemClass: 'col-span-2',
      componentProps: {
        maxCount: 1,
        maxSize: 10,
        accept: 'image/jpg,image/jpeg,image/png',
        helpMessage: false,
      },
    },
    {
      fieldName: 'relatedImages',
      label: '相关图片',
      component: 'ImageUpload',
      formItemClass: 'col-span-2',
      componentProps: {
        maxCount: 9,
        maxSize: 10,
        accept: 'image/jpg,image/jpeg,image/png',
        multiple: true,
      },
    },
    // ---- 补充信息 ----
    {
      component: 'Divider',
      fieldName: '_divider_extra',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '补充信息' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'performanceDesc',
      label: '性能说明',
      component: 'Textarea',
      formItemClass: 'col-span-2',
      componentProps: {
        rows: 4,
      },
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
      id: isEdit.value ? productId.value : undefined,
      deptId: deptId.value,
      // ImageUpload maxCount>1 时返回数组，后端期望逗号分隔字符串
      relatedImages: Array.isArray(values.relatedImages)
        ? values.relatedImages.join(',')
        : values.relatedImages,
    };

    if (isEdit.value) {
      await productUpdate(data);
      message.success('修改成功');
    } else {
      const res = await productAdd(data);
      productId.value = res?.id;
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
