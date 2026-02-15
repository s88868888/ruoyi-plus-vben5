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

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => (isEdit.value ? '编辑产品' : '新增产品')),
  onOpenChange: async (visible) => {
    if (!visible) {
      await formApi.resetForm();
      return;
    }
    const data = drawerApi.getData<{ id?: number; isEdit: boolean }>();
    if (data) {
      isEdit.value = data.isEdit;
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
        await formApi.setValues({ hasPurchaseContract: '0' });
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
      fieldName: 'productName',
      component: 'Input',
      label: '产品名称',
      rules: 'required',
    },
    {
      fieldName: 'productModel',
      component: 'Input',
      label: '产品型号',
    },
    {
      fieldName: 'quantity',
      component: 'InputNumber',
      label: '数量',
      componentProps: {
        min: 0,
        class: 'w-full',
      },
    },
    {
      fieldName: 'productCategory',
      component: 'Input',
      label: '产品分类',
    },
    {
      fieldName: 'useStartDate',
      component: 'DatePicker',
      label: '投入使用开始时间',
      componentProps: {
        valueFormat: 'YYYY-MM-DD',
        class: 'w-full',
      },
    },
    {
      fieldName: 'useEndDate',
      component: 'DatePicker',
      label: '投入使用结束时间',
      componentProps: {
        valueFormat: 'YYYY-MM-DD',
        class: 'w-full',
      },
    },
    {
      fieldName: 'hasPurchaseContract',
      component: 'RadioGroup',
      label: '是否有购买合同',
      componentProps: {
        options: [
          { label: '是', value: '1' },
          { label: '否', value: '0' },
        ],
      },
    },
    {
      fieldName: 'performanceDesc',
      component: 'Textarea',
      label: '性能说明',
      componentProps: {
        rows: 3,
      },
    },
    {
      fieldName: 'productImage',
      component: 'Input',
      label: '实物图片',
      componentProps: {
        placeholder: '请输入图片URL',
      },
    },
    {
      fieldName: 'relatedImages',
      component: 'Input',
      label: '相关图片',
      componentProps: {
        placeholder: '请输入图片URL，多个用逗号分隔',
      },
    },
    {
      fieldName: 'remark',
      component: 'Textarea',
      label: '备注',
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
    const data: Partial<BizProduct> = {
      ...values,
      id: isEdit.value ? productId.value : undefined,
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
    drawerApi.close();
  } finally {
    drawerApi.lock(false);
  }
}
</script>

<template>
  <BasicDrawer class="w-[700px]">
    <Form />
  </BasicDrawer>
</template>
