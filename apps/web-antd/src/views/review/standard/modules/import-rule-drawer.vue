<script setup lang="ts">
import { ref, computed } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import {
  message, Steps, Upload, Alert, Tag, Button, Space, Table,
} from 'ant-design-vue';
import { InboxOutlined, DownloadOutlined, LoadingOutlined, CheckCircleOutlined } from '@ant-design/icons-vue';

const emit = defineEmits<{ reload: [] }>();

const currentStep = ref(0);
const fileList = ref<any[]>([]);
const parsing = ref(false);

const parsedRules = ref<any[]>([]);

const severityMap: Record<string, { label: string; color: string }> = {
  must: { label: '严重', color: 'red' },
  should: { label: '一般', color: 'orange' },
  suggest: { label: '提示', color: 'blue' },
};

const columns = [
  { title: '规则内容', dataIndex: 'content', key: 'content' },
  { title: '等级', dataIndex: 'severity', key: 'severity', width: 80, align: 'center' as const },
  { title: '分类', dataIndex: 'category', key: 'category', width: 100, align: 'center' as const },
];

function handleDownloadTemplate() {
  message.success('模板下载中...');
}

async function startParsing() {
  parsing.value = true;
  await new Promise(resolve => setTimeout(resolve, 2000));
  parsedRules.value = [
    { id: 1, content: '合同必须包含甲方全称及统一社会信用代码', severity: 'must', category: '主体信息' },
    { id: 2, content: '合同金额大写与小写必须完全一致', severity: 'must', category: '金额条款' },
    { id: 3, content: '服务期限必须明确起止日期', severity: 'must', category: '期限条款' },
    { id: 4, content: '违约责任条款应双向约定', severity: 'should', category: '违约条款' },
    { id: 5, content: '验收条款应明确验收方式和时限', severity: 'should', category: '验收条款' },
    { id: 6, content: '建议补充仲裁作为争议解决备选', severity: 'suggest', category: '争议解决' },
  ];
  parsing.value = false;
  currentStep.value = 2;
}

const [BasicDrawer] = useVbenDrawer({
  title: computed(() => {
    const stepNames = ['上传文件', 'AI解析规则', '确认导入'];
    return `导入规则 - ${stepNames[currentStep.value]}`;
  }),
  onOpenChange: (visible) => {
    if (!visible) {
      currentStep.value = 0;
      fileList.value = [];
      parsedRules.value = [];
      parsing.value = false;
    }
  },
  onConfirm: async () => {
    if (currentStep.value === 0) {
      if (fileList.value.length === 0) {
        message.warning('请上传文件');
        return;
      }
      currentStep.value = 1;
      startParsing();
      return;
    }
    if (currentStep.value === 1) {
      return;
    }
    if (currentStep.value === 2) {
      message.success(`成功导入 ${parsedRules.value.length} 条规则`);
      emit('reload');
    }
  },
});

function handleBeforeUpload(file: any) {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  const ext = file.name.split('.').pop()?.toLowerCase();
  const validExts = ['doc', 'docx', 'txt', 'xls', 'xlsx'];
  if (!validExts.includes(ext)) {
    message.error('仅支持 Word、TXT、Excel 格式文件');
    return Upload.LIST_IGNORE;
  }
  fileList.value = [file];
  return false;
}

function handleRemoveFile() {
  fileList.value = [];
}
</script>

<template>
  <BasicDrawer>
    <Steps :current="currentStep" size="small" class="mb-6">
      <Steps.Step title="上传文件" />
      <Steps.Step title="AI解析" />
      <Steps.Step title="确认导入" />
    </Steps>

    <!-- 步骤1: 上传文件 -->
    <div v-if="currentStep === 0">
      <Alert class="mb-4" type="info" show-icon>
        <template #message>
          支持 Word(.doc/.docx)、TXT、Excel(.xls/.xlsx) 格式，AI将自动分析文件内容并提取规则。
        </template>
      </Alert>

      <div class="mb-4">
        <Button type="link" class="p-0" @click="handleDownloadTemplate">
          <DownloadOutlined /> 下载导入模板
        </Button>
        <span class="ml-2 text-gray-400 text-xs">建议按模板格式整理规则，提取效果更佳</span>
      </div>

      <Upload.Dragger
        :file-list="fileList"
        :before-upload="handleBeforeUpload"
        :max-count="1"
        @remove="handleRemoveFile"
      >
        <p class="ant-upload-drag-icon"><InboxOutlined /></p>
        <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p class="ant-upload-hint">支持 Word、TXT、Excel 格式，单个文件不超过 20MB</p>
      </Upload.Dragger>
    </div>

    <!-- 步骤2: AI解析中 -->
    <div v-if="currentStep === 1" class="flex flex-col items-center justify-center py-12">
      <LoadingOutlined class="text-4xl text-blue-500 mb-4" />
      <p class="text-base text-gray-700">AI 正在分析文件内容并提取规则...</p>
      <p class="text-sm text-gray-400 mt-2">预计需要 10-30 秒，请耐心等待</p>
    </div>

    <!-- 步骤3: 确认导入 -->
    <div v-if="currentStep === 2">
      <Alert class="mb-4" type="success" show-icon>
        <template #message>
          AI 共提取到 <span class="font-bold">{{ parsedRules.length }}</span> 条规则，请确认后导入。
        </template>
      </Alert>

      <Table
        :columns="columns"
        :data-source="parsedRules"
        :pagination="false"
        row-key="id"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'severity'">
            <Tag :color="severityMap[record.severity]?.color">
              {{ severityMap[record.severity]?.label }}
            </Tag>
          </template>
        </template>
      </Table>
    </div>
  </BasicDrawer>
</template>
