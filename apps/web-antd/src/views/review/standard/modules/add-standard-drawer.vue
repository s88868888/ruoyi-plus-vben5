<script setup lang="ts">
import { ref, computed } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import {
  message, Steps, Upload, Switch, Input, Form, FormItem, Alert, Tag, Textarea, Button, Divider, Table, Select, Spin,
} from 'ant-design-vue';
import { InboxOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import {
  reviewStandardAdd,
  downloadRuleTemplate,
  parseRuleDocument,
  importRuleTemplatePreview,
  batchAddStandardRules,
  type ParsedRule,
} from '#/api/review/standard';
import { uploadApi } from '#/api/core/upload';
import { commonDownloadExcel } from '#/utils/file/download';

const emit = defineEmits<{ reload: [] }>();

const currentStep = ref(0);
const fileList = ref<any[]>([]);
const parsing = ref(false);
const parseProgress = ref('');

const formData = ref({
  name: '',
  isSystem: '0' as string,
  description: '',
});

const parsedRules = ref<(ParsedRule & { id: number })[]>([]);

const severityMap: Record<string, { label: string; color: string }> = {
  must: { label: '严重', color: 'red' },
  should: { label: '警告', color: 'orange' },
  suggest: { label: '提示', color: 'blue' },
};

const severityOptions = [
  { label: '严重', value: 'must' },
  { label: '警告', value: 'should' },
  { label: '提示', value: 'suggest' },
];

const EXCEL_EXTS = ['xlsx', 'xls'];

const severityWeightMap: Record<string, number> = {
  must: 90,
  should: 70,
  suggest: 40,
};
const AI_EXTS = ['doc', 'docx', 'pdf', 'txt'];
const MAX_FILE_MB = 150;

const columns = [
  { title: '序号', key: 'index', width: 50, align: 'center' as const },
  { title: '规则内容', dataIndex: 'content', key: 'content' },
  { title: '等级', dataIndex: 'severity', key: 'severity', width: 100, align: 'center' as const },
  { title: '分类', dataIndex: 'category', key: 'category', width: 140 },
  { title: '操作', key: 'action', width: 60, align: 'center' as const },
];

const ruleStats = computed(() => ({
  must: parsedRules.value.filter((r) => r.severity === 'must').length,
  should: parsedRules.value.filter((r) => r.severity === 'should').length,
  suggest: parsedRules.value.filter((r) => r.severity === 'suggest').length,
}));

function resetState() {
  currentStep.value = 0;
  fileList.value = [];
  parsing.value = false;
  parseProgress.value = '';
  formData.value = { name: '', isSystem: '0', description: '' };
  parsedRules.value = [];
}

function getExt(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function beforeUpload(file: File) {
  const ext = getExt(file.name);
  if (![...EXCEL_EXTS, ...AI_EXTS].includes(ext)) {
    message.error('仅支持 Excel 模板或 Word/PDF/TXT 规范文档');
    return Upload.LIST_IGNORE;
  }
  if (file.size / 1024 / 1024 > MAX_FILE_MB) {
    message.error(`文件大小不能超过 ${MAX_FILE_MB}MB`);
    return Upload.LIST_IGNORE;
  }
  fileList.value = [file];
  return false;
}

async function handleDownloadTemplate() {
  await commonDownloadExcel(downloadRuleTemplate, '审核规则导入模板');
}

async function runParse() {
  if (fileList.value.length === 0) {
    message.warning('请上传规范文件');
    return false;
  }
  const file: File = fileList.value[0] as File;
  const ext = getExt(file.name);
  parsing.value = true;

  try {
    let rules: ParsedRule[];
    if (EXCEL_EXTS.includes(ext)) {
      parseProgress.value = '正在解析 Excel 模板...';
      rules = await importRuleTemplatePreview(file);
    } else {
      parseProgress.value = '正在上传文档...';
      const uploadRes: any = await uploadApi(file);
      const ossId = uploadRes?.ossId;
      if (!ossId) throw new Error('上传失败，未返回 ossId');
      parseProgress.value = 'AI 正在分析文档并抽取规则...';
      rules = await parseRuleDocument(ossId);
    }
    parsedRules.value = (rules || []).map((r, i) => ({ ...r, id: i + 1 }));
    if (parsedRules.value.length === 0) {
      message.warning('未从文档中抽取到规则，请检查文件内容或使用模板填写');
      return false;
    }
    return true;
  } catch (e: any) {
    message.error(e?.message || '解析失败');
    return false;
  } finally {
    parsing.value = false;
  }
}
// PLACEHOLDER_SCRIPT_2

function deleteRule(id: number) {
  parsedRules.value = parsedRules.value.filter((r) => r.id !== id);
}

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => {
    const stepNames = ['填写信息并上传规范', '确认规则'];
    return `新增审核标准 - ${stepNames[currentStep.value]}`;
  }),
  onOpenChange: (visible) => {
    if (!visible) resetState();
  },
  onConfirm: async () => {
    if (currentStep.value === 0) {
      if (!formData.value.name.trim()) {
        message.warning('请输入规范名称');
        return;
      }
      const ok = await runParse();
      if (ok) currentStep.value = 1;
      return;
    }
    if (parsedRules.value.length === 0) {
      message.warning('没有可保存的规则');
      return;
    }
    const createdId = await reviewStandardAdd({
      name: formData.value.name,
      type: '1',
      isSystem: formData.value.isSystem,
      description: formData.value.description,
      version: 'v1.0',
      status: '0',
    } as any);
    if (createdId) {
      await batchAddStandardRules(createdId, parsedRules.value.map((r) => ({
        content: r.content,
        severity: r.severity,
        category: r.category,
        checkField: r.checkField,
        checkMethod: r.checkMethod,
        weight: r.weight ?? severityWeightMap[r.severity] ?? 50,
      })));
    } else {
      message.warning('标准已创建，但未返回 ID，规则未关联，请到详情页手动导入');
    }
    drawerApi.close();
    emit('reload');
  },
  confirmText: computed(() => (currentStep.value === 0 ? '开始解析' : '确认创建')),
  cancelText: computed(() => (currentStep.value === 0 ? '取消' : '上一步')),
  onCancel: () => {
    if (currentStep.value > 0) {
      currentStep.value--;
      return false;
    }
    return true;
  },
});
</script>

<template>
  <BasicDrawer class="w-[900px]">
    <Steps :current="currentStep" size="small" style="margin-bottom: 24px;">
      <Steps.Step title="填写信息并上传规范" />
      <Steps.Step title="确认规则" />
    </Steps>

    <!-- Step 1: 基本信息 + 上传 -->
    <div v-show="currentStep === 0">
      <Spin :spinning="parsing" :tip="parseProgress">
        <Form layout="vertical">
          <Divider orientation="left" class="section-title-divider">
            <span class="section-title">基本信息</span>
          </Divider>
          <div class="form-grid">
            <FormItem label="规范名称" required>
              <Input v-model:value="formData.name" placeholder="如：政府采购合同审核标准" />
            </FormItem>
            <FormItem label="是否通用">
              <Switch
                :checked="formData.isSystem === '1'"
                checked-children="是"
                un-checked-children="否"
                @change="(val: boolean) => (formData.isSystem = val ? '1' : '0')"
              />
            </FormItem>
            <FormItem label="补充说明（可选）" class="col-span-2">
              <Textarea v-model:value="formData.description" placeholder="适用范围、特殊注意事项等..." :rows="3" />
            </FormItem>
          </div>

          <Divider orientation="left" class="section-title-divider">
            <span class="section-title">上传规范文件</span>
          </Divider>
          <div class="form-grid">
            <FormItem required class="col-span-2" style="margin-bottom: 0;">
              <Upload.Dragger
                :file-list="fileList"
                :before-upload="beforeUpload"
                :max-count="1"
                @remove="() => (fileList = [])"
              >
                <p class="ant-upload-drag-icon"><InboxOutlined /></p>
                <p class="ant-upload-text">点击或拖拽规范文件到此区域</p>
                <p class="ant-upload-hint">
                  Excel 模板直接解析；Word/PDF/TXT 由 AI (qwen-long) 智能抽取。单文件 ≤ {{ MAX_FILE_MB }}MB
                </p>
              </Upload.Dragger>
              <div style="margin-top: 8px;">
                <Button type="link" size="small" style="padding: 0;" @click="handleDownloadTemplate">
                  <DownloadOutlined /> 下载规则导入模板
                </Button>
              </div>
              <Alert
                message="Excel 模板：结构化直接导入，无 AI 开销"
                description="Word/PDF/TXT：AI 抽取可能耗时 30~90 秒，请耐心等待"
                type="info"
                show-icon
                style="margin-top: 12px;"
              />
            </FormItem>
          </div>
        </Form>
      </Spin>
    </div>

    <!-- Step 2: 规则确认 -->
    <div v-show="currentStep === 1">
      <Alert
        show-icon
        type="success"
        style="margin-bottom: 12px;"
        :message="`已解析 ${parsedRules.length} 条规则，您可以编辑/删除后确认导入`"
      />
      <div class="rule-stats-bar">
        <Tag color="red">必须 {{ ruleStats.must }}</Tag>
        <Tag color="orange">应当 {{ ruleStats.should }}</Tag>
        <Tag color="blue">建议 {{ ruleStats.suggest }}</Tag>
      </div>
      <Table
        :columns="columns"
        :data-source="parsedRules"
        :pagination="false"
        row-key="id"
        size="small"
        :scroll="{ y: 420 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-if="column.key === 'content'">
            <Input v-model:value="record.content" size="small" />
          </template>
          <template v-if="column.key === 'severity'">
            <Select v-model:value="record.severity" :options="severityOptions" size="small" style="width: 90px;" />
          </template>
          <template v-if="column.key === 'category'">
            <Input v-model:value="record.category" size="small" placeholder="选填" />
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
.section-title-divider {
  margin: 4px 0 12px;
}

.section-title-divider :deep(.ant-divider-inner-text) {
  padding-left: 0;
}

.section-title-divider::before {
  display: none !important;
}

.section-title {
  padding-left: 8px;
  border-left: 3px solid hsl(var(--primary));
  font-weight: 600;
  font-size: 16px;
  line-height: 1.5;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 24px;
}

.col-span-2 {
  grid-column: span 2;
}

.rule-stats-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
</style>
