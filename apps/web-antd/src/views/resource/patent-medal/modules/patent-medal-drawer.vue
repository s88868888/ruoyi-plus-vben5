<script setup lang="ts">
import type { BizPatentMedal } from '#/api/resource/patent-medal';

import { ref, computed } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  patentMedalInfo,
  patentMedalAdd,
  patentMedalUpdate,
} from '#/api/resource/patent-medal';

const emit = defineEmits<{
  reload: [];
}>();

const isEdit = ref(false);
const patentId = ref<number>();
const deptId = ref<number>();

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => (isEdit.value ? '编辑专利奖章' : '新增专利奖章')),
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
        patentId.value = data.id;
        drawerApi.drawerLoading(true);
        try {
          const res = await patentMedalInfo(data.id);
          await formApi.setValues(res);
        } finally {
          drawerApi.drawerLoading(false);
        }
      } else {
        patentId.value = undefined;
        await formApi.setValues({ status: '0', deptId: data.deptId });
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
      fieldName: 'patentName',
      component: 'Input',
      label: '专利名称',
      rules: 'required',
    },
    {
      fieldName: 'patentType',
      component: 'Select',
      label: '专利类型',
      rules: 'required',
      componentProps: {
        options: [
          { label: '发明专利', value: '1' },
          { label: '实用新型专利', value: '2' },
          { label: '外观设计专利', value: '3' },
        ],
      },
    },
    {
      fieldName: 'patentNumber',
      component: 'Input',
      label: '专利号',
    },
    {
      fieldName: 'authorizationDate',
      component: 'DatePicker',
      label: '授权公告日',
      componentProps: {
        valueFormat: 'YYYY-MM-DD',
        class: 'w-full',
      },
    },
    {
      fieldName: 'patentee',
      component: 'Input',
      label: '专利权人',
    },
    {
      fieldName: 'inventor',
      component: 'Input',
      label: '设计人/发明人',
    },
    {
      fieldName: 'field',
      component: 'Input',
      label: '所属领域',
    },
    {
      fieldName: 'patentAbstract',
      component: 'Textarea',
      label: '专利摘要',
      componentProps: {
        rows: 3,
      },
    },
    {
      fieldName: 'patentImage',
      component: 'Input',
      label: '专利图片',
      componentProps: {
        placeholder: '请输入图片URL',
      },
    },
    {
      fieldName: 'certificateImage',
      component: 'Input',
      label: '证书图片',
      componentProps: {
        placeholder: '请输入图片URL',
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
    {
      fieldName: 'status',
      component: 'RadioGroup',
      label: '状态',
      componentProps: {
        options: [
          { label: '有效', value: '0' },
          { label: '无效', value: '1' },
        ],
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
    const data: Partial<BizPatentMedal> = {
      ...values,
      id: isEdit.value ? patentId.value : undefined,
      deptId: deptId.value,
    };

    if (isEdit.value) {
      await patentMedalUpdate(data);
      message.success('修改成功');
    } else {
      const res = await patentMedalAdd(data);
      patentId.value = res?.id;
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
  <BasicDrawer class="w-[800px]">
    <Form />
  </BasicDrawer>
</template>
