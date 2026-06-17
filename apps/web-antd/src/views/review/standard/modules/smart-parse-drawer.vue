<script setup lang="ts">
import { ref, computed } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import {
  message, Steps, Upload, Alert, Tag, Button, Space, Table, Input, Select,
} from 'ant-design-vue';
import { InboxOutlined, LoadingOutlined, CheckCircleOutlined, DeleteOutlined, BulbOutlined } from '@ant-design/icons-vue';
import {
  parseRuleDocument,
  importRuleTemplatePreview,
  batchAddStandardRules,
} from '#/api/review/standard';
import { uploadApi } from '#/api/core/upload';

const emit = defineEmits<{ reload: [] }>();

const currentStep = ref(0);
const fileList = ref<any[]>([]);
const parsing = ref(false);
const parseProgress = ref('');
const standardId = ref<number | null>(null);

const parsedRules = ref<any[]>([]);

const EXCEL_EXTS = ['xlsx', 'xls'];

const severityWeightMap: Record<string, number> = {
  must: 90,
  should: 70,
  suggest: 40,
};

const severityOptions = [
  { label: '严重', value: 'must' },
  { label: '警告', value: 'should' },
  { label: '提示', value: 'suggest' },
];

const categoryOptions = [
  { label: '主体信息', value: '主体信息' },
  { label: '基本信息', value: '基本信息' },
  { label: '金额条款', value: '金额条款' },
  { label: '期限条款', value: '期限条款' },
  { label: '付款条款', value: '付款条款' },
  { label: '验收条款', value: '验收条款' },
  { label: '违约条款', value: '违约条款' },
  { label: '知识产权', value: '知识产权' },
  { label: '保密条款', value: '保密条款' },
  { label: '争议解决', value: '争议解决' },
  { label: '格式规范', value: '格式规范' },
  { label: '其他', value: '其他' },
];

const severityMap: Record<string, { label: string; color: string }> = {
  must: { label: '严重', color: 'red' },
  should: { label: '警告', color: 'orange' },
  suggest: { label: '提示', color: 'blue' },
};

const columns = [
  { title: '序号', key: 'index', width: 50, align: 'center' as const },
  { title: '规则内容', dataIndex: 'content', key: 'content' },
  { title: '等级', dataIndex: 'severity', key: 'severity', width: 100, align: 'center' as const },
  { title: '分类', dataIndex: 'category', key: 'category', width: 120, align: 'center' as const },
  { title: '操作', key: 'action', width: 60, align: 'center' as const },
];

const ruleStats = computed(() => ({
  must: parsedRules.value.filter(r => r.severity === 'must').length,
  should: parsedRules.value.filter(r => r.severity === 'should').length,
  suggest: parsedRules.value.filter(r => r.severity === 'suggest').length,
}));

async function startParsing() {
  if (fileList.value.length === 0) {
    message.warning('请先上传文档');
    return;
  }
  const file: File = fileList.value[0] as File;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  parsing.value = true;
  parseProgress.value = '正在分析文档结构...';
  try {
    let rules: any[];
    if (EXCEL_EXTS.includes(ext)) {
      parseProgress.value = '解析 Excel 模板...';
      rules = await importRuleTemplatePreview(file);
    } else {
      parseProgress.value = '上传文档到服务器...';
      const uploadRes: any = await uploadApi(file);
      const ossId = uploadRes?.ossId;
      if (!ossId) throw new Error('上传失败，未返回 ossId');
      parseProgress.value = 'AI 正在抽取审核规则（qwen-long）...';
      rules = await parseRuleDocument(ossId);
    }
    parsedRules.value = (rules || []).map((r: any, i: number) => ({
      ...r,
      id: i + 1,
      editing: false,
    }));
    if (parsedRules.value.length === 0) {
      message.warning('未从文档中抽取到规则');
    }
    currentStep.value = 2;
  } catch (e: any) {
    message.error(e?.message || '解析失败');
    currentStep.value = 0;
  } finally {
    parsing.value = false;
  }
}

function deleteRule(id: number) {
  parsedRules.value = parsedRules.value.filter(r => r.id !== id);
}

function handleReParse() {
  currentStep.value = 1;
  parsedRules.value = [];
  startParsing();
}

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => {
    const stepNames = ['上传规范文档', 'AI智能解析', '确认规则'];
    return `智能解析 - ${stepNames[currentStep.value]}`;
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
      parseProgress.value = '';
      standardId.value = null;
    }
  },
  onConfirm: async () => {
    if (currentStep.value === 0) {
      if (fileList.value.length === 0) {
        message.warning('请上传规范文档');
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
        message.error('缺少 standardId，无法保存');
        return;
      }
      try {
        await batchAddStandardRules(standardId.value, parsedRules.value.map((r: any) => ({
          content: r.content,
          severity: r.severity,
          category: r.category,
          checkField: r.checkField,
          checkMethod: r.checkMethod,
          weight: r.weight ?? severityWeightMap[r.severity] ?? 50,
        })));
        emit('reload');
        drawerApi.close();
      } catch (e: any) {
        message.error(e?.message || '保存失败');
      }
    }
  },
});

function handleBeforeUpload(file: any) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const validExts = ['doc', 'docx', 'pdf', 'txt', 'xlsx', 'xls'];
  if (!validExts.includes(ext)) {
    message.error('仅支持 Word、PDF、TXT、Excel 格式文件');
    return Upload.LIST_IGNORE;
  }
  if (file.size / 1024 / 1024 > 150) {
    message.error('文件大小不能超过 150MB');
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
  <BasicDrawer class="w-[800px]">
    <Steps :current="currentStep" size="small" class="mb-6">
      <Steps.Step title="上传文档" />
      <Steps.Step title="AI解析" />
      <Steps.Step title="确认规则" />
    </Steps>

    <!-- 步骤1: 上传文档 -->
    <div v-if="currentStep === 0">
      <Alert class="mb-4" type="info" show-icon>
        <template #message>
          <span>上传包含审核要求的规范文档（如规章制度、管理办法、招标要求等），AI将自动提取结构化审核规则。</span>
        </template>
        <template #description>
          支持 Word(.doc/.docx)、PDF、TXT 格式，建议上传条目清晰的规范性文件，提取效果更佳。
        </template>
      </Alert>

      <Upload.Dragger
        :file-list="fileList"
        :before-upload="handleBeforeUpload"
        :max-count="1"
        @remove="handleRemoveFile"
      >
        <p class="ant-upload-drag-icon"><InboxOutlined /></p>
        <p class="ant-upload-text">点击或拖拽规范文档到此区域</p>
        <p class="ant-upload-hint">AI将自动分析文档内容，提取审核规则并分类评级</p>
      </Upload.Dragger>

      <div class="parse-examples">
        <p class="parse-examples-title"><BulbOutlined /> 适合解析的文档示例：</p>
        <ul class="parse-examples-list">
          <li>政府采购合同管理办法.docx</li>
          <li>招标文件格式要求.pdf</li>
          <li>企业财务报销制度.doc</li>
          <li>ISO质量管理体系标准.pdf</li>
        </ul>
      </div>
    </div>

    <!-- 步骤2: AI解析中 -->
    <div v-if="currentStep === 1" class="parse-loading">
      <LoadingOutlined class="parse-loading-icon" />
      <p class="parse-loading-text">AI 正在智能解析规范文档...</p>
      <p class="parse-loading-progress">{{ parseProgress }}</p>
      <div class="parse-loading-steps">
        <div class="parse-step-item">
          <CheckCircleOutlined v-if="parseProgress !== '正在分析文档结构...'" class="text-green-500" />
          <LoadingOutlined v-else class="text-blue-500" />
          <span>分析文档结构</span>
        </div>
        <div class="parse-step-item">
          <CheckCircleOutlined v-if="parseProgress === '正在分类和评级...'" class="text-green-500" />
          <LoadingOutlined v-else-if="parseProgress === '正在提取审核要点...'" class="text-blue-500" />
          <span :class="{ 'text-gray-300': parseProgress === '正在分析文档结构...' }">提取审核要点</span>
        </div>
        <div class="parse-step-item">
          <LoadingOutlined v-if="parseProgress === '正在分类和评级...'" class="text-blue-500" />
          <span :class="{ 'text-gray-300': parseProgress !== '正在分类和评级...' }">分类和评级</span>
        </div>
      </div>
    </div>

    <!-- 步骤3: 确认规则 -->
    <div v-if="currentStep === 2">
      <Alert class="mb-4" type="success" show-icon>
        <template #message>
          AI 共提取到 <span class="font-bold">{{ parsedRules.length }}</span> 条规则，您可以编辑后确认导入。
        </template>
      </Alert>

      <div class="rule-stats-bar">
        <Tag color="red">必须 {{ ruleStats.must }}</Tag>
        <Tag color="orange">应当 {{ ruleStats.should }}</Tag>
        <Tag color="blue">建议 {{ ruleStats.suggest }}</Tag>
        <Button type="link" size="small" @click="handleReParse">重新解析</Button>
      </div>

      <Table
        :columns="columns"
        :data-source="parsedRules"
        :pagination="false"
        row-key="id"
        size="small"
        :scroll="{ y: 400 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-if="column.key === 'content'">
            <Input v-model:value="record.content" size="small" />
          </template>
          <template v-if="column.key === 'severity'">
            <Select v-model:value="record.severity" :options="severityOptions" size="small" style="width: 80px;" />
          </template>
          <template v-if="column.key === 'category'">
            <Select v-model:value="record.category" :options="categoryOptions" size="small" style="width: 100px;" />
          </template>
          <template v-if="column.key === 'action'">
            <Button type="link" size="small" danger @click="deleteRule(record.id)">
              <DeleteOutlined />
            </Button>
          </template>
        </template>
      </Table>
    </div>
  </BasicDrawer>
</template>

<style scoped>
.parse-examples {
  margin-top: 24px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.parse-examples-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
  margin-bottom: 8px;
}

.parse-examples-list {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: #909399;
  line-height: 2;
}

.parse-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
}

.parse-loading-icon {
  font-size: 40px;
  color: #1677ff;
  margin-bottom: 16px;
}

.parse-loading-text {
  font-size: 16px;
  color: rgba(0, 0, 0, 0.88);
  margin-bottom: 8px;
}

.parse-loading-progress {
  font-size: 13px;
  color: #1677ff;
  margin-bottom: 24px;
}

.parse-loading-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 24px;
  background: #fafafa;
  border-radius: 8px;
}

.parse-step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

.rule-stats-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
</style>