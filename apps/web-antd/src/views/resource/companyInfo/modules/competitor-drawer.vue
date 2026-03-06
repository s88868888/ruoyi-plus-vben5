<script setup lang="ts">
import type { BizCompetitor } from '#/api/resource/competitor';

import { ref, computed, h } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { message, Space, Button, Upload } from 'ant-design-vue';
import { DownloadOutlined, DeleteOutlined, UploadOutlined, PaperClipOutlined } from '@ant-design/icons-vue';
import type { UploadChangeParam, UploadFile } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { competitorInfo, competitorAdd, competitorUpdate } from '#/api/resource/competitor';
import { requestClient } from '#/api/request';
import { useEditPageStyle } from '#/preferences/useEditPageStyle';
import SectionTitle from './section-title.vue';
import { competitorOptions } from './common-options';

const emit = defineEmits<{
  reload: [];
}>();

const { formContainerStyle, drawerWidthStyle } = useEditPageStyle();

const isEdit = ref(false);
const competitorId = ref<number>();
const deptId = ref<number>();
const originalAttachmentUrl = ref('');
const originalAttachmentName = ref('');
const fileList = ref<UploadFile[]>([]);
const uploading = ref(false);

const existingAttachments = computed(() => {
  if (!originalAttachmentUrl.value || !originalAttachmentName.value) return [];
  const urls = originalAttachmentUrl.value.split(',');
  const names = originalAttachmentName.value.split(',');
  return urls.map((url, index) => ({
    url: url.trim(),
    name: names[index]?.trim() || '未命名',
  }));
});

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => (isEdit.value ? '编辑竞争公司' : '新增竞争公司')),
  onOpenChange: async (visible) => {
    if (!visible) {
      await formApi.resetForm();
      originalAttachmentUrl.value = '';
      originalAttachmentName.value = '';
      fileList.value = [];
      return;
    }
    const data = drawerApi.getData<{ id?: number; deptId?: number; isEdit: boolean }>();
    if (data) {
      isEdit.value = data.isEdit;
      deptId.value = data.deptId;
      if (data.isEdit && data.id) {
        competitorId.value = data.id;
        drawerApi.drawerLoading(true);
        try {
          const res = await competitorInfo(data.id);
          originalAttachmentUrl.value = res.attachmentUrl || '';
          originalAttachmentName.value = res.attachmentName || '';
          await formApi.setValues(res);
        } finally {
          drawerApi.drawerLoading(false);
        }
      } else {
        competitorId.value = undefined;
        originalAttachmentUrl.value = '';
        originalAttachmentName.value = '';
        fileList.value = [];
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
    labelWidth: 140,
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
      fieldName: 'companyName',
      label: '公司名称',
      component: 'Input',
      rules: 'required',
    },
    {
      fieldName: 'companyType',
      label: '公司类型',
      component: 'AutoComplete',
      componentProps: {
        options: competitorOptions.companyType.map(v => ({ value: v })),
        placeholder: '请输入或选择公司类型',
        allowClear: true,
      },
    },
    {
      fieldName: 'competitorLevel',
      label: '竞争级别',
      component: 'Select',
      componentProps: {
        options: [
          { label: '强', value: '强' },
          { label: '中', value: '中' },
          { label: '弱', value: '弱' },
        ],
        placeholder: '请选择竞争级别',
        allowClear: true,
      },
    },
    {
      fieldName: 'registeredCapital',
      label: '注册资本（万元）',
      component: 'Input',
      componentProps: {
        placeholder: '请输入注册资本',
      },
    },
    {
      fieldName: 'foundedYear',
      label: '成立年份',
      component: 'Input',
      componentProps: {
        placeholder: '如：2010',
      },
    },
    {
      fieldName: 'province',
      label: '所在省份',
      component: 'Input',
    },
    {
      fieldName: 'city',
      label: '所在城市',
      component: 'Input',
    },
    {
      fieldName: 'website',
      label: '官网地址',
      component: 'Input',
      componentProps: {
        placeholder: '请输入官网地址',
      },
    },
    {
      fieldName: 'businessScope',
      label: '主营业务',
      component: 'Textarea',
      formItemClass: 'col-span-2',
      componentProps: {
        rows: 3,
        maxlength: 500,
        showCount: true,
      },
    },
    {
      fieldName: 'mainProducts',
      label: '主要产品/服务',
      component: 'Textarea',
      formItemClass: 'col-span-2',
      componentProps: {
        rows: 3,
        maxlength: 500,
        showCount: true,
      },
    },
    // ---- 竞争分析 ----
    {
      component: 'Divider',
      fieldName: '_divider_analysis',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '竞争分析' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'strengths',
      label: '竞争优势',
      component: 'Textarea',
      formItemClass: 'col-span-2',
      componentProps: {
        rows: 3,
        maxlength: 1000,
        showCount: true,
        placeholder: '请描述该竞争公司的主要竞争优势',
      },
    },
    {
      fieldName: 'weaknesses',
      label: '竞争劣势',
      component: 'Textarea',
      formItemClass: 'col-span-2',
      componentProps: {
        rows: 3,
        maxlength: 1000,
        showCount: true,
        placeholder: '请描述该竞争公司的主要竞争劣势',
      },
    },
    // ---- 联系信息 ----
    {
      component: 'Divider',
      fieldName: '_divider_contact',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '联系信息' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'contactPerson',
      label: '联系人',
      component: 'Input',
    },
    {
      fieldName: 'contactPhone',
      label: '联系电话',
      component: 'Input',
    },
    {
      fieldName: 'contactEmail',
      label: '联系邮箱',
      component: 'Input',
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
        maxlength: 500,
        showCount: true,
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

    // 合并已有附件（可能被删除过）
    const data: BizCompetitor = {
      ...values,
      id: isEdit.value ? competitorId.value : undefined,
      deptId: deptId.value,
      attachmentUrl: originalAttachmentUrl.value,
      attachmentName: originalAttachmentName.value,
    };

    if (isEdit.value) {
      await competitorUpdate(data);
      message.success('修改成功');
    } else {
      const res = await competitorAdd(data);
      competitorId.value = res?.id;
      isEdit.value = true;
      message.success('新增成功');

      // 新增后如有选择的文件则上传
      if (fileList.value.length > 0) {
        await uploadFiles(competitorId.value!);
      }
    }

    emit('reload');
  } finally {
    drawerApi.lock(false);
  }
}

async function uploadFiles(id: number) {
  try {
    uploading.value = true;
    const urls: string[] = [];
    const names: string[] = [];

    for (const file of fileList.value) {
      if (!file.originFileObj) continue;
      const formData = new FormData();
      formData.append('file', file.originFileObj);
      const res = await requestClient.post<{ url: string; originalName: string }>('/resource/oss/upload', formData);
      urls.push(res.url);
      names.push(res.originalName || file.name || '附件');
    }

    if (urls.length > 0) {
      const allUrls = [originalAttachmentUrl.value, ...urls].filter(Boolean).join(',');
      const allNames = [originalAttachmentName.value, ...names].filter(Boolean).join(',');
      await competitorUpdate({ id, deptId: deptId.value, attachmentUrl: allUrls, attachmentName: allNames });
      originalAttachmentUrl.value = allUrls;
      originalAttachmentName.value = allNames;
      fileList.value = [];
      message.success('附件上传成功');
    }
  } finally {
    uploading.value = false;
  }
}

function handleFileChange(info: UploadChangeParam) {
  fileList.value = info.fileList;
}

function beforeUpload() {
  return false; // 阻止自动上传
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
  <BasicDrawer class="w-[1000px]" :style="drawerWidthStyle">
    <div :style="formContainerStyle">
      <Form />
    </div>

    <!-- 附件上传区域 -->
    <div class="px-6 pb-4">
      <div class="mb-3">
        <h4 class="text-sm font-medium text-gray-700 mb-2">相关附件</h4>

        <!-- 已有附件列表 -->
        <div v-if="existingAttachments.length > 0" class="mb-3 space-y-2">
          <div
            v-for="(attachment, index) in existingAttachments"
            :key="index"
            class="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
          >
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <PaperClipOutlined class="text-gray-400 flex-shrink-0" />
              <span class="text-sm truncate">{{ attachment.name }}</span>
            </div>
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

        <!-- 上传新附件 -->
        <Upload
          v-model:file-list="fileList"
          :before-upload="beforeUpload"
          multiple
          @change="handleFileChange"
        >
          <Button :disabled="uploading">
            <UploadOutlined />
            上传附件
          </Button>
        </Upload>
        <div class="text-xs text-gray-500 mt-1">
          支持各类文件格式（PDF、Word、Excel、图片等）
        </div>

        <!-- 待上传文件列表（新增模式保存后自动上传） -->
        <div v-if="fileList.length > 0 && !isEdit" class="mt-2 text-xs text-blue-500">
          已选择 {{ fileList.length }} 个文件，保存后自动上传
        </div>
        <div v-if="fileList.length > 0 && isEdit" class="mt-2">
          <Button
            type="primary"
            size="small"
            :loading="uploading"
            @click="uploadFiles(competitorId!)"
          >
            立即上传
          </Button>
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
