<script setup lang="ts">
import type { BizQualification } from '#/api/resource/qualification';

import { ref, computed } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { qualificationInfo, qualificationAdd, qualificationUpdate } from '#/api/resource/qualification';

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
          await formApi.setValues(res);
        } finally {
          drawerApi.drawerLoading(false);
        }
      } else {
        qualificationId.value = undefined;
        await formApi.setValues({ deptId: data.deptId, dataPermissionType: '0' });
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
      fieldName: 'certImages',
      label: '证书图片',
      component: 'Upload',
      rules: 'required',
      componentProps: {
        api: '/system/oss/upload',
        maxCount: 30,
        maxSize: 10,
        accept: 'image/jpg,image/jpeg,image/png',
        multiple: true,
      },
      help: '最多上传30张，支持jpg、jpeg、png格式，单张最大10M',
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
      fieldName: 'certCategory',
      label: '证书类别',
      component: 'Input',
      rules: 'required',
      componentProps: {
        maxlength: 80,
        showCount: true,
      },
    },
    {
      fieldName: 'issuingAuthority',
      label: '发证机关',
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
    {
      fieldName: 'dataPermissionType',
      label: '数据权限类型',
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '公域', value: '0' },
          { label: '私域', value: '1' },
        ],
      },
    },
    {
      fieldName: 'certStatus',
      label: '证书状态',
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
    const data = {
      ...values,
      id: isEdit.value ? qualificationId.value : undefined,
      deptId: deptId.value,
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
  <BasicDrawer class="w-[800px]">
    <Form />
  </BasicDrawer>
</template>
