<script setup lang="ts">
import { ref, computed } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import {
  message, Steps, Upload, Alert, Tag, Button, Table,
} from 'ant-design-vue';
import { InboxOutlined, DownloadOutlined, LoadingOutlined } from '@ant-design/icons-vue';
import {
  downloadRuleTemplate,
  importRuleTemplatePreview,
  batchAddStandardRules,
} from '#/api/review/standard';

const emit = defineEmits<{ reload: [] }>();

const currentStep = ref(0);
const fileList = ref<any[]>([]);
const parsing = ref(false);
const standardId = ref<number | null>(null);

const parsedRules = ref<any[]>([]);

const severityMap: Record<string, { label: string; color: string }> = {
  must: { label: '严重', color: 'red' },
  should: { label: '警告', color: 'orange' },
  suggest: { label: '提示', color: 'blue' },
};

const severityWeightMap: Record<string, number> = {
  must: 90,
  should: 70,
  suggest: 40,
};

const columns = [
  { title: '规则内容', dataIndex: 'content', key: 'content' },
  { title: '等级', dataIndex: 'severity', key: 'severity', width: 80, align: 'center' as const },
  { title: '分类', dataIndex: 'category', key: 'category', width: 100, align: 'center' as const },
];

async function handleDownloadTemplate() {
  try {
    const blob = await downloadRuleTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '审核规则导入模板.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    message.error('模板下载失败');
  }
}

async function startParsing() {
  if (fileList.value.length === 0) return;
  parsing.value = true;
  try {
    const file = fileList.value[0] as File;
    const rules = await importRuleTemplatePreview(file);
    parsedRules.value = (rules || []).map((r: any, i: number) => ({ ...r, id: i + 1 }));
    if (parsedRules.value.length === 0) {
      message.warning('未从文件中解析到规则，请检查文件格式');
      currentStep.value = 0;
    } else {
      currentStep.value = 2;
    }
  } catch (e: any) {
    message.error(e?.message || '解析失败');
    currentStep.value = 0;
  } finally {
    parsing.value = false;
  }
}

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => {
    const stepNames = ['上传文件', '解析规则', '确认导入'];
    return `导入规则 - ${stepNames[currentStep.value]}`;
  }),
  onOpenChange: (visible) => {
    if (visible) {
      const data = drawerApi.getData<{ standardId: number }>();
      if (data?.standardId) standardId.value = data.standardId;
    } else {
      currentStep.value = 0;
      fileList.value = [];
      parsedRules.value = [];
      parsing.value = false;
      standardId.value = null;
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
      if (parsedRules.value.length === 0) {
        message.warning('没有可导入的规则');
        return;
      }
      if (!standardId.value) {
        message.error('缺少标准ID');
        return;
      }
      try {
        await batchAddStandardRules(standardId.value, parsedRules.value.map((r: any) => ({
          content: r.content,
          severity: r.severity,
          category: r.category,
          weight: r.weight ?? severityWeightMap[r.severity] ?? 50,
        })));
        emit('reload');
        drawerApi.close();
      } catch (e: any) {
        message.error(e?.message || '导入失败');
      }
    }
  },
});

function handleBeforeUpload(file: any) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const validExts = ['xls', 'xlsx'];
  if (!validExts.includes(ext)) {
    message.error('仅支持 Excel(.xls/.xlsx) 格式文件');
    return Upload.LIST_IGNORE;
  }
  if (file.size / 1024 / 1024 > 20) {
    message.error('文件大小不能超过 20MB');
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
      <Steps.Step title="解析规则" />
      <Steps.Step title="确认导入" />
    </Steps>

    <!-- 步骤1: 上传文件 -->
    <div v-if="currentStep === 0">
      <Alert class="mb-4" type="info" show-icon>
        <template #message>
          支持 Excel(.xls/.xlsx) 格式，请按模板格式填写规则后上传。
        </template>
      </Alert>

      <div class="mb-4">
        <Button type="link" class="p-0" @click="handleDownloadTemplate">
          <DownloadOutlined /> 下载导入模板
        </Button>
        <span class="ml-2 text-gray-400 text-xs">按模板格式整理规则，解析更准确</span>
      </div>

      <Upload.Dragger
        :file-list="fileList"
        :before-upload="handleBeforeUpload"
        :max-count="1"
        @remove="handleRemoveFile"
      >
        <p class="ant-upload-drag-icon"><InboxOutlined /></p>
        <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p class="ant-upload-hint">支持 .xls / .xlsx 格式，单个文件不超过 20MB</p>
      </Upload.Dragger>
    </div>

    <!-- 步骤2: 解析中 -->
    <div v-if="currentStep === 1" class="flex flex-col items-center justify-center py-12">
      <LoadingOutlined class="text-4xl text-blue-500 mb-4" />
      <p class="text-base text-gray-700">正在解析 Excel 文件...</p>
    </div>

    <!-- 步骤3: 确认导入 -->
    <div v-if="currentStep === 2">
      <Alert class="mb-4" type="success" show-icon>
        <template #message>
          共解析到 <span class="font-bold">{{ parsedRules.length }}</span> 条规则，请确认后导入。
        </template>
      </Alert>

      <Table
        :columns="columns"
        :data-source="parsedRules"
        :pagination="false"
        row-key="id"
        size="small"
        :scroll="{ y: 400 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'severity'">
            <Tag :color="severityMap[record.severity]?.color">
              {{ severityMap[record.severity]?.label || record.severity }}
            </Tag>
          </template>
        </template>
      </Table>
    </div>
  </BasicDrawer>
</template>
