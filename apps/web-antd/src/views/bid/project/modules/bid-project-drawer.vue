<script setup lang="ts">
import type { BizBidProject } from '#/api/bid/project';

import { ref, computed } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { message } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { bidProjectInfo, bidProjectAdd, bidProjectUpdate } from '#/api/bid/project';

const emit = defineEmits<{
  reload: [];
}>();

const isEdit = ref(false);
const isView = ref(false);
const projectId = ref<number>();

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => {
    if (isView.value) return '查看招标项目';
    return isEdit.value ? '编辑招标项目' : '新增招标项目';
  }),
  onOpenChange: async (visible) => {
    if (!visible) {
      await formApi.resetForm();
      return;
    }
    const data = drawerApi.getData<{ id?: number; isEdit: boolean; isView?: boolean }>();
    if (data) {
      isEdit.value = data.isEdit;
      isView.value = data.isView || false;

      if ((data.isEdit || data.isView) && data.id) {
        projectId.value = data.id;
        drawerApi.drawerLoading(true);
        try {
          const res = await bidProjectInfo(data.id);
          // attachments 存储的是 ossId（逗号分隔），转换为数组给 FileUpload 组件
          // 过滤掉历史遗留的 URL，只保留纯数字的 ossId
          const formData: any = { ...res };
          if (formData.attachments && typeof formData.attachments === 'string') {
            formData.attachments = formData.attachments
              .split(',')
              .filter((item: string) => item && /^\d+$/.test(item));
          }
          await formApi.setValues(formData);

          // 查看模式下禁用所有字段
          if (data.isView) {
            formApi.setState({ disabled: true });
          } else {
            formApi.setState({ disabled: false });
          }
        } finally {
          drawerApi.drawerLoading(false);
        }
      } else {
        projectId.value = undefined;
        formApi.setState({ disabled: false });
        await formApi.setValues({
          status: 'following',
          projectSource: 'manual',
        });
      }
    }
  },
  onConfirm: async () => {
    if (!isView.value) {
      await handleSubmit();
    } else {
      drawerApi.close();
    }
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
      fieldName: 'projectName',
      component: 'Input',
      label: '项目名称',
      rules: 'required',
    },
    {
      fieldName: 'bidOrg',
      component: 'Input',
      label: '招标单位',
    },
    {
      fieldName: 'projectType',
      component: 'Select',
      label: '项目类型',
      componentProps: {
        options: [
          { label: '工程', value: 'engineering' },
          { label: '货物', value: 'goods' },
          { label: '服务', value: 'service' },
        ],
      },
    },
    {
      fieldName: 'budgetAmount',
      component: 'InputNumber',
      label: '预算金额(万元)',
      componentProps: {
        min: 0,
        precision: 2,
        class: 'w-full',
      },
    },
    {
      fieldName: 'publishDate',
      component: 'DatePicker',
      label: '发布日期',
      componentProps: {
        valueFormat: 'YYYY-MM-DD',
        class: 'w-full',
      },
    },
    {
      fieldName: 'deadline',
      component: 'DatePicker',
      label: '截止日期',
      componentProps: {
        valueFormat: 'YYYY-MM-DD',
        class: 'w-full',
      },
    },
    {
      fieldName: 'status',
      component: 'Select',
      label: '状态',
      componentProps: {
        options: [
          { label: '跟进中', value: 'following' },
          { label: '已投标', value: 'bid' },
          { label: '已中标', value: 'won' },
          { label: '未中标', value: 'lost' },
          { label: '已放弃', value: 'abandoned' },
        ],
      },
    },
    {
      fieldName: 'projectRegion',
      component: 'Input',
      label: '项目地区',
    },
    {
      fieldName: 'bidMethod',
      component: 'Select',
      label: '招标方式',
      componentProps: {
        options: [
          { label: '公开招标', value: 'public' },
          { label: '邀请招标', value: 'invite' },
          { label: '竞争性谈判', value: 'competitive' },
          { label: '询价采购', value: 'inquiry' },
          { label: '单一来源', value: 'single' },
        ],
      },
    },
    {
      fieldName: 'contactPerson',
      component: 'Input',
      label: '联系人',
    },
    {
      fieldName: 'contactPhone',
      component: 'Input',
      label: '联系电话',
    },
    {
      fieldName: 'sourceUrl',
      component: 'Input',
      label: '来源链接',
      componentProps: {
        placeholder: '请输入项目来源URL',
      },
    },
    {
      fieldName: 'projectDesc',
      component: 'Textarea',
      label: '项目描述',
      formItemClass: 'col-span-2',
      componentProps: {
        rows: 4,
      },
    },
    {
      fieldName: 'attachments',
      component: 'FileUpload',
      label: '相关附件',
      formItemClass: 'col-span-2',
      componentProps: {
        maxCount: 10,
        maxSize: 50,
        accept: 'application/pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,image/jpg,image/jpeg,image/png,.zip,.rar',
        multiple: true,
        disabled: isView.value,
        helpMessage: false,
      },
      help: '支持 PDF、Word、Excel、图片、压缩包等格式，单个文件不超过50MB，最多10个文件',
    },
    {
      fieldName: 'remark',
      component: 'Textarea',
      label: '备注',
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

    // FileUpload 返回 ossId 数组，过滤掉历史遗留的 URL，只保留纯数字 ossId
    let attachments = '';
    const rawAttachments = values.attachments;
    if (Array.isArray(rawAttachments)) {
      attachments = rawAttachments.filter((item: string) => /^\d+$/.test(item)).join(',');
    } else if (typeof rawAttachments === 'object' && rawAttachments) {
      attachments = Object.values(rawAttachments).filter((item: any) => /^\d+$/.test(item)).join(',');
    } else if (typeof rawAttachments === 'string') {
      attachments = rawAttachments.split(',').filter((item: string) => /^\d+$/.test(item)).join(',');
    }

    const data: Partial<BizBidProject> = {
      ...values,
      id: isEdit.value ? projectId.value : undefined,
      attachments,
    };

    if (isEdit.value) {
      await bidProjectUpdate(data);
      message.success('修改成功');
    } else {
      const res = await bidProjectAdd(data);
      projectId.value = res?.id;
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
  <BasicDrawer class="w-[1000px]">
    <Form />
  </BasicDrawer>
</template>
