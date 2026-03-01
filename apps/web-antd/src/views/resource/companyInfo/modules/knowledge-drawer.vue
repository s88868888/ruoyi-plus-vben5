<script setup lang="ts">
import type { BizProjectKnowledge } from '#/api/resource/knowledge';

import { ref, computed, h } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { message, Space, Button, Upload } from 'ant-design-vue';
import { DownloadOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons-vue';
import type { UploadChangeParam, UploadFile } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { knowledgeInfo, knowledgeUpdate, knowledgeUpload } from '#/api/resource/knowledge';
import SectionTitle from './section-title.vue';

const emit = defineEmits<{
  reload: [];
}>();

const mode = ref<'add' | 'edit' | 'view'>('add');
const knowledgeId = ref<number>();
const deptId = ref<number>();
const originalAttachmentUrl = ref('');
const originalAttachmentName = ref('');
const originalKnowledgeName = ref('');
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

const isViewMode = computed(() => mode.value === 'view');

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => {
    if (mode.value === 'view') return '查看项目知识';
    if (mode.value === 'edit') return '编辑项目知识';
    return '新增项目知识';
  }),
  closable: true,
  onOpenChange: async (visible) => {
    if (!visible) {
      await formApi.resetForm();
      originalAttachmentUrl.value = '';
      originalAttachmentName.value = '';
      originalKnowledgeName.value = '';
      fileList.value = [];
      return;
    }
    const data = drawerApi.getData<{ id?: number; deptId?: number; mode: 'add' | 'edit' | 'view' }>();
    if (data) {
      mode.value = data.mode;
      deptId.value = data.deptId;

      if ((data.mode === 'edit' || data.mode === 'view') && data.id) {
        knowledgeId.value = data.id;
        drawerApi.drawerLoading(true);
        try {
          const res = await knowledgeInfo(data.id);
          originalAttachmentUrl.value = res.attachmentUrl || '';
          originalAttachmentName.value = res.attachmentName || '';
          originalKnowledgeName.value = res.knowledgeName || '';
          const formData: any = { ...res };
          await formApi.setValues(formData);
        } finally {
          drawerApi.drawerLoading(false);
        }
      } else {
        knowledgeId.value = undefined;
        originalAttachmentUrl.value = '';
        originalAttachmentName.value = '';
        originalKnowledgeName.value = '';
        fileList.value = [];
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
      fieldName: 'knowledgeName',
      label: '知识名称',
      component: 'Input',
      rules: 'required',
      componentProps: {
        disabled: isViewMode.value || mode.value === 'edit',
        placeholder: '上传文件后自动填充',
      },
    },
    {
      fieldName: 'projectType',
      label: '挂标项目类型',
      component: 'Input',
      rules: 'required',
      componentProps: {
        disabled: isViewMode.value,
      },
    },
    {
      fieldName: 'description',
      label: '描述',
      component: 'Textarea',
      formItemClass: 'col-span-2',
      componentProps: {
        rows: 3,
        maxlength: 1000,
        showCount: true,
        disabled: isViewMode.value || mode.value === 'edit',
        placeholder: '上传文件后自动提取内容',
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

    // 新增模式必须上传文件
    if (mode.value === 'add' && fileList.value.length === 0) {
      message.error('请上传项目知识文档（仅支持 PDF 和 Word 格式）');
      return;
    }

    drawerApi.lock(true);
    const values = await formApi.getValues();

    if (mode.value === 'add') {
      // 新增：使用文件上传接口
      const formData = new FormData();
      formData.append('file', fileList.value[0].originFileObj as File);
      formData.append('projectType', values.projectType);
      formData.append('deptId', String(deptId.value));
      if (values.knowledgeName) {
        formData.append('knowledgeName', values.knowledgeName);
      }

      await knowledgeUpload(formData);
      message.success('上传成功');
    } else {
      // 编辑：使用普通更新接口
      const data = {
        ...values,
        id: knowledgeId.value,
        deptId: deptId.value,
        knowledgeName: originalKnowledgeName.value,
        attachmentUrl: originalAttachmentUrl.value,
        attachmentName: originalAttachmentName.value,
      };

      await knowledgeUpdate(data);
      message.success('修改成功');
    }

    emit('reload');
    drawerApi.close();
  } finally {
    drawerApi.lock(false);
  }
}

function handleFileChange(info: UploadChangeParam) {
  fileList.value = info.fileList.slice(-1); // 只保留最新的一个文件
}

function beforeUpload(file: UploadFile) {
  const isValidType = file.type === 'application/pdf'
    || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    || file.type === 'application/msword'
    || file.name?.endsWith('.pdf')
    || file.name?.endsWith('.docx')
    || file.name?.endsWith('.doc');

  if (!isValidType) {
    message.error('仅支持上传 PDF 和 Word 文档！');
    return false;
  }

  const isLt50M = (file.size || 0) / 1024 / 1024 < 50;
  if (!isLt50M) {
    message.error('文件大小不能超过 50MB！');
    return false;
  }

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
  <BasicDrawer class="w-[900px]">
    <Form />

    <!-- 文件上传区域（仅新增模式显示） -->
    <div v-if="mode === 'add'" class="px-6 pb-4">
      <div class="mb-2">
        <span class="text-red-500">*</span>
        <span class="text-sm font-medium ml-1">上传文档</span>
      </div>
      <Upload
        v-model:file-list="fileList"
        :before-upload="beforeUpload"
        :max-count="1"
        accept=".pdf,.doc,.docx"
        @change="handleFileChange"
      >
        <Button :disabled="uploading">
          <UploadOutlined />
          选择文件（仅支持 PDF 和 Word）
        </Button>
      </Upload>
      <div class="text-xs text-gray-500 mt-2">
        支持格式：PDF、Word（.doc/.docx），文件大小不超过 50MB
      </div>
    </div>

    <!-- 已有附件列表（编辑和查看模式显示） -->
    <div v-if="existingAttachments.length > 0 && mode !== 'add'" class="px-6 pb-4">
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
              v-if="!isViewMode"
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
