<script setup lang="ts">
import type { BizFinanceInfo } from '#/api/resource/finance';

import { ref, computed, h } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { message, Space, Button } from 'ant-design-vue';
import { DownloadOutlined, DeleteOutlined } from '@ant-design/icons-vue';

import { useVbenForm } from '#/adapter/form';
import { financeInfo, financeAdd, financeUpdate } from '#/api/resource/finance';
import { ossInfo } from '#/api/system/oss';
import SectionTitle from './section-title.vue';
import { financeOptions } from './common-options';

const emit = defineEmits<{
  reload: [];
}>();

const mode = ref<'add' | 'edit' | 'view'>('add');
const financeId = ref<number>();
const deptId = ref<number>();
const originalAttachmentUrl = ref('');
const originalAttachmentName = ref('');
const existingAttachments = computed(() => {
  if (!originalAttachmentUrl.value || !originalAttachmentName.value) return [];
  const urls = originalAttachmentUrl.value.split(',');
  const names = originalAttachmentName.value.split(',');
  return urls.map((url, index) => ({
    url: url.trim(),
    name: names[index]?.trim() || '未命名',
  }));
});

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
      originalAttachmentUrl.value = '';
      originalAttachmentName.value = '';
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
          // FileUpload 使用 ossId 绑定，后端返回的是 URL，无法直接回显
          // 将附件信息分开存储，提交时再处理
          originalAttachmentUrl.value = res.attachmentUrl || '';
          originalAttachmentName.value = res.attachmentName || '';
          const formData: any = { ...res };
          // 不给 FileUpload 设置附件字段，避免将 URL 当成 ossId 传入
          delete formData.attachmentUrl;
          await formApi.setValues(formData);
        } finally {
          drawerApi.drawerLoading(false);
        }
      } else {
        financeId.value = undefined;
        originalAttachmentUrl.value = '';
        originalAttachmentName.value = '';
        await formApi.setValues({ deptId: data.deptId });
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
  schema: computed(() => [
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
      fieldName: 'financeName',
      label: '财务信息名称',
      component: 'Input',
      rules: 'required',
      componentProps: {
        maxlength: 60,
        showCount: true,
        disabled: isViewMode.value,
      },
    },
    {
      fieldName: 'infoType',
      label: '信息类型',
      component: 'AutoComplete',
      rules: 'required',
      componentProps: {
        options: financeOptions.infoType.map(v => ({ value: v })),
        placeholder: '请输入或选择信息类型',
        allowClear: true,
        disabled: isViewMode.value,
      },
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
        disabled: isViewMode.value,
      },
    },
    // ---- 附件资料 ----
    {
      component: 'Divider',
      fieldName: '_divider_attachment',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '附件资料' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'attachmentUrl',
      label: '附件',
      component: 'FileUpload',
      formItemClass: 'col-span-2',
      componentProps: {
        maxCount: 5,
        maxSize: 50,
        accept: 'application/pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,image/jpg,image/jpeg,image/png',
        multiple: true,
        disabled: isViewMode.value,
      },
      help: isViewMode.value && originalAttachmentUrl.value
        ? `当前附件：${originalAttachmentName.value || '未命名'}`
        : undefined,
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
        disabled: isViewMode.value,
      },
    },
  ]),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});

async function handleSubmit() {
  try {
    const { valid } = await formApi.validate();
    if (!valid) return;

    drawerApi.lock(true);
    const values = await formApi.getValues();

    // 处理附件字段
    // FileUpload 返回 ossId，需要通过 ossInfo 接口解析为 URL 和文件名
    let attachmentUrl = originalAttachmentUrl.value;
    let attachmentName = originalAttachmentName.value;
    const ossIds = values.attachmentUrl;

    if (ossIds && (Array.isArray(ossIds) ? ossIds.length > 0 : ossIds !== '')) {
      try {
        const ossFiles = await ossInfo(ossIds);
        if (ossFiles && ossFiles.length > 0) {
          attachmentUrl = ossFiles.map((f) => f.url).join(',');
          attachmentName = ossFiles.map((f) => f.originalName).join(',');
        }
      } catch (error) {
        // ossId 解析失败时保留原有附件信息
        console.error('附件解析失败:', error);
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

function handleDownloadAttachment(url: string) {
  window.open(url, '_blank');
}

function handleRemoveExistingAttachment(index: number) {
  const urls = originalAttachmentUrl.value.split(',');
  const names = originalAttachmentName.value.split(',');
  urls.splice(index, 1);
  names.splice(index, 1);
  originalAttachmentUrl.value = urls.join(',');
  originalAttachmentName.value = names.join(',');
}
</script>

<template>
  <BasicDrawer class="w-[900px]">
    <Form />

    <!-- 已有附件列表 -->
    <div v-if="existingAttachments.length > 0 && !isViewMode" class="px-6 pb-4">
      <div class="text-sm font-medium mb-2">已有附件：</div>
      <div class="space-y-2">
        <div
          v-for="(attachment, index) in existingAttachments"
          :key="index"
          class="flex items-center justify-between p-2 bg-gray-50 rounded"
        >
          <span class="text-sm truncate flex-1">{{ attachment.name }}</span>
          <Space>
            <Button
              size="small"
              type="link"
              @click="handleDownloadAttachment(attachment.url)"
            >
              <DownloadOutlined />
              下载
            </Button>
            <Button
              size="small"
              type="link"
              danger
              @click="handleRemoveExistingAttachment(index)"
            >
              <DeleteOutlined />
              删除
            </Button>
          </Space>
        </div>
      </div>
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
