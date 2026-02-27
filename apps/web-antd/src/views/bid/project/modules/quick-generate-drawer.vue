<script setup lang="ts">
import { ref } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { message } from 'ant-design-vue';
import { InboxOutlined } from '@ant-design/icons-vue';
import { DraggerProps, Upload, UploadFile } from 'ant-design-vue';

import { quickGenerateFromPdf } from '#/api/bid/project';

const emit = defineEmits<{
  success: [projectId: number];
}>();

const loading = ref(false);
const fileList = ref<UploadFile[]>([]);
const enableAiAnalysis = ref(false);
const enableExtractScoringCriteria = ref(false);
const aiPrompt = ref('');

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: '快速生成招标项目',
  width: 500,
  onOpenChange: async (visible) => {
    if (!visible) {
      // 重置表单
      fileList.value = [];
      enableAiAnalysis.value = false;
      enableExtractScoringCriteria.value = false;
      aiPrompt.value = '';
      return;
    }
  },
  onConfirm: async () => {
    await handleSubmit();
  },
});

// 文件上传前的校验
function beforeUpload(file: File) {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    message.error('只能上传 PDF 文件！');
    return false;
  }
  const isLt50M = file.size / 1024 / 1024 < 50;
  if (!isLt50M) {
    message.error('文件大小不能超过 50MB！');
    return false;
  }
  // 清空之前的文件
  fileList.value = [];
  return false; // 阻止自动上传
}

// 文件状态改变
function handleChange(info: { file: UploadFile }) {
  if (info.file.status === 'done') {
    message.success(`${info.file.name} 文件上传成功`);
  } else if (info.file.status === 'error') {
    message.error(`${info.file.name} 文件上传失败`);
  }
}

async function handleSubmit() {
  // 校验文件
  if (fileList.value.length === 0 || !fileList.value[0]?.originFileObj) {
    message.warning('请先上传招标文件');
    return;
  }

  const file = fileList.value[0].originFileObj;
  if (!file) {
    message.warning('文件无效');
    return;
  }

  loading.value = true;
  try {
    const projectId = await quickGenerateFromPdf(
      {
        enableAiAnalysis: enableAiAnalysis.value,
        enableExtractScoringCriteria: enableExtractScoringCriteria.value,
        aiPrompt: aiPrompt.value || undefined,
      },
      file,
    );

    message.success('招标项目创建成功');
    drawerApi.close();
    emit('success', projectId);
  } catch (error) {
    console.error('创建失败:', error);
    message.error('创建失败，请重试');
  } finally {
    loading.value = false;
  }
}

// 暴露给外部调用的方法
function open() {
  drawerApi.open();
}

defineExpose({
  BasicDrawer,
  open,
});
</script>

<template>
  <BasicDrawer :loading="loading">
    <div class="quick-generate-form">
      <div class="upload-section">
        <p class="section-title">上传招标文件 (PDF)</p>
        <Upload
          v-model:file-list="fileList"
          :before-upload="beforeUpload"
          :max-count="1"
          accept=".pdf"
          @change="handleChange"
        >
          <Dragger :before-upload="beforeUpload">
            <p class="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p class="ant-upload-text">点击或拖拽招标文件到此处上传</p>
            <p class="ant-upload-hint">支持 PDF 格式，文件大小不超过 50MB</p>
          </Dragger>
        </Upload>
      </div>

      <div class="options-section">
        <p class="section-title">提取选项</p>
        <div class="checkbox-group">
          <a-checkbox v-model:checked="enableAiAnalysis">
            AI分析
            <span class="checkbox-desc">使用AI分析项目并生成分析报告</span>
          </a-checkbox>
          <a-checkbox v-model:checked="enableExtractScoringCriteria">
            提取评分标准
            <span class="checkbox-desc">从招标文件中提取评分标准</span>
          </a-checkbox>
        </div>
      </div>

      <div v-if="enableAiAnalysis" class="prompt-section">
        <p class="section-title">自定义提示词 (可选)</p>
        <a-textarea
          v-model:value="aiPrompt"
          placeholder="输入自定义AI分析提示词，不输入则使用默认提示词"
          :rows="4"
        />
      </div>
    </div>
  </BasicDrawer>
</template>

<style scoped>
.quick-generate-form {
  padding: 0 10px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 12px;
}

.upload-section {
  margin-bottom: 24px;
}

.options-section {
  margin-bottom: 24px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkbox-desc {
  display: block;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 2px;
  margin-left: 20px;
}

.prompt-section {
  margin-bottom: 16px;
}

:deep(.ant-upload-drag) {
  padding: 20px;
}
</style>
