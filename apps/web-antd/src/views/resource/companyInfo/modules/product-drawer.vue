<script setup lang="ts">
import type { BizProduct } from '#/api/resource/product';

import { ref, computed } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { productInfo, productAdd, productUpdate } from '#/api/resource/product';

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
    {
      fieldName: 'productImage',
      label: '实物图片',
      component: 'Upload',
      componentProps: {
        api: '/system/oss/upload',
        maxCount: 1,
        maxSize: 5,
        accept: 'image/*',
      },
    },
    {
      fieldName: 'relatedImages',
      label: '相关图片',
      component: 'Upload',
      componentProps: {
        api: '/system/oss/upload',
        maxCount: 9,
        maxSize: 5,
        accept: 'image/*',
        multiple: true,
      },
    },
    {
      fieldName: 'performanceDesc',
      label: '性能说明',
      component: 'Textarea',
      componentProps: {
        rows: 4,
      },
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
  <BasicDrawer class="w-[800px]">
    <Form />
  </BasicDrawer>
</template>
