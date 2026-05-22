<script setup lang="ts">
import { ref, computed } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import {
  message, Form, FormItem, Input, Textarea, Select, Alert, Divider, Tag,
  Tooltip,
} from 'ant-design-vue';
import { InfoCircleOutlined } from '@ant-design/icons-vue';
import { reviewPromptAdd, reviewPromptUpdate } from '#/api/review/prompt';
import { reviewModelConfigList } from '#/api/review/modelConfig';
import type { ReviewModelConfig } from '#/api/review/modelConfig/model';

const emit = defineEmits<{ reload: [] }>();

const mode = ref<'add' | 'edit'>('add');
const formData = ref({
  id: undefined as number | string | undefined,
  name: '',
  type: '',
  systemPrompt: '',
  userPrompt: '',
  outputFormat: '',
  modelName: undefined as string | undefined,
  modelConfigId: undefined as number | string | undefined,
  ocrConfigId: undefined as number | string | undefined,
  temperature: 0.3,
  status: '0',
  remark: '',
});

// 模型配置下拉数据：分别拉 chat 和 ocr 用途，避免运营选错
const chatConfigs = ref<ReviewModelConfig[]>([]);
const ocrConfigs = ref<ReviewModelConfig[]>([]);
const loadingConfigs = ref(false);

const chatConfigOptions = computed(() => chatConfigs.value.map((c) => ({
  label: `${c.name}  ·  ${c.modelName}`,
  value: c.id,
  raw: c,
})));

const ocrConfigOptions = computed(() => ocrConfigs.value.map((c) => ({
  label: `${c.name}  ·  ${c.modelName}`,
  value: c.id,
  raw: c,
})));

async function loadModelConfigs() {
  loadingConfigs.value = true;
  try {
    const [chatList, ocrList] = await Promise.all([
      reviewModelConfigList({ enabled: '1', purpose: 'chat' }),
      reviewModelConfigList({ enabled: '1', purpose: 'ocr' }),
    ]);
    chatConfigs.value = chatList || [];
    ocrConfigs.value = ocrList || [];
  } finally {
    loadingConfigs.value = false;
  }
}

// 占位变量分两组：通用（所有模板都建议用）和 增强（治本地小模型不听话）
// 详细语义见后端文档 ruoyi-review/docs/提示词模板设计指南.md
const commonVars = [
  { key: '{rules}', desc: '审核规则列表（自动从关联标准中提取，含编号/字段/严重度/描述）' },
  { key: '{output_format}', desc: '输出格式定义（下方"输出格式要求"字段的内容）' },
  { key: '{form_data}', desc: '用户提交的表单/业务数据（外部系统传的 formSnapshot JSON）' },
  { key: '{knowledge_context}', desc: 'RAG 检索到的相似案例 / 模式 / 误判记录；无关联知识库时为空' },
];

const enhanceVars = [
  { key: '{rule_count}', desc: '本任务规则总数（数字）。用于约束 AI 必须返回 N 条 items，治"偷懒只返回部分"' },
  { key: '{field_whitelist}', desc: '编号 + 字段名 列表（每行一个）。用于约束 AI 只能用这些字段名，治"编造 xxx1/xxx2 后缀"' },
];

// 推荐的输出格式模板（点"填入推荐格式"按钮可一键填充）
const recommendedOutputFormat = `{
  "pass_status": "passed | partial | failed | need_review",
  "score": 0,
  "summary": "整体审核结论一句话",
  "items": [
    {
      "rule_id": 1,
      "field_name": "company_name",
      "match_status": "matched",
      "severity": "must",
      "form_value": "表单填写的值",
      "extracted_value": "AI从材料中提取到的值",
      "expected_value": "规则期望的值（可选）",
      "comment": "判定理由",
      "suggestion": "整改建议（可选）",
      "confidence": 90,
      "location": "材料定位（如：第3页签字栏，可选）"
    }
  ]
}`;

function applyRecommendedFormat() {
  if (formData.value.outputFormat && formData.value.outputFormat.trim().length > 0) {
    if (!window.confirm('当前已有内容，填入推荐格式将覆盖现有内容。继续？')) return;
  }
  formData.value.outputFormat = recommendedOutputFormat;
  message.success('已填入推荐格式');
}

function resetForm() {
  formData.value = {
    id: undefined,
    name: '',
    type: '',
    systemPrompt: '',
    userPrompt: '',
    outputFormat: '',
    modelName: undefined,
    modelConfigId: undefined,
    ocrConfigId: undefined,
    temperature: 0.3,
    status: '0',
    remark: '',
  };
}

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => mode.value === 'add' ? '新增提示词模板' : '编辑提示词模板'),
  onOpenChange: (visible) => {
    if (visible) {
      // 每次打开都拉一遍最新模型配置（确保新增的配置能立即出现在下拉里）
      loadModelConfigs();
      const data = drawerApi.getData<{ mode: 'add' | 'edit'; record?: any }>();
      mode.value = data?.mode || 'add';
      if (data?.mode === 'edit' && data.record) {
        formData.value = {
          id: data.record.id,
          name: data.record.name || '',
          type: data.record.type || '',
          systemPrompt: data.record.systemPrompt || '',
          userPrompt: data.record.userPrompt || '',
          outputFormat: data.record.outputFormat || '',
          modelName: data.record.modelName || undefined,
          modelConfigId: data.record.modelConfigId ?? undefined,
          ocrConfigId: data.record.ocrConfigId ?? undefined,
          temperature: data.record.temperature ?? 0.3,
          status: data.record.status || '0',
          remark: data.record.remark || '',
        };
      } else {
        resetForm();
      }
    }
  },
  onConfirm: async () => {
    if (!formData.value.name) {
      message.warning('请输入模板名称');
      return;
    }
    if (!formData.value.type) {
      message.warning('请输入类型编码（唯一标识）');
      return;
    }
    if (!formData.value.systemPrompt) {
      message.warning('请输入系统提示词');
      return;
    }
    if (!formData.value.userPrompt) {
      message.warning('请输入用户提示词');
      return;
    }

    drawerApi.setState({ confirmLoading: true });
    try {
      if (mode.value === 'edit') {
        await reviewPromptUpdate(formData.value);
        message.success('更新成功');
      } else {
        await reviewPromptAdd(formData.value);
        message.success('创建成功');
      }
      drawerApi.close();
      emit('reload');
    } catch {
      message.error('操作失败，请重试');
    } finally {
      drawerApi.setState({ confirmLoading: false });
    }
  },
});
</script>

<template>
  <BasicDrawer class="w-[860px]">
    <Form layout="vertical">
      <!-- 基本信息 -->
      <Divider orientation="left" class="section-title-divider">
        <span class="section-title">基本信息</span>
      </Divider>
      <div class="form-grid">
        <FormItem label="模板名称" required>
          <Input v-model:value="formData.name" placeholder="如：公司入会资料审核" />
        </FormItem>
        <FormItem label="类型编码（唯一标识）" required>
          <Input
            v-model:value="formData.type"
            placeholder="如：company_info"
            :disabled="mode === 'edit'"
          />
        </FormItem>
        <FormItem label="AI模型配置" class="col-span-2">
          <Select
            v-model:value="formData.modelConfigId"
            placeholder="选择「AI模型配置」（推荐，参数可在线编辑、热切换）"
            style="width: 100%;"
            allow-clear
            show-search
            option-filter-prop="label"
            :loading="loadingConfigs"
            :options="chatConfigOptions"
          />
          <div class="text-xs text-gray-400 mt-1">
            选择配置后，下方「AI模型」「温度」字段失效，由配置统一管理。
          </div>
        </FormItem>
        <FormItem label="OCR模型配置（扫描件PDF才会用到）" class="col-span-2">
          <Select
            v-model:value="formData.ocrConfigId"
            placeholder="选择 OCR 配置；不选则走全局兜底（首条 enabled 的 OCR 配置）"
            style="width: 100%;"
            allow-clear
            show-search
            option-filter-prop="label"
            :loading="loadingConfigs"
            :options="ocrConfigOptions"
          />
          <div class="text-xs text-gray-400 mt-1">
            仅当任务里有"扫描件PDF"时才会触发 OCR。打印件PDF走 PDFBox 抽文，与此无关。
          </div>
        </FormItem>
        <FormItem label="状态">
          <Select
            v-model:value="formData.status"
            style="width: 100%;"
            :options="[
              { label: '启用', value: '0' },
              { label: '停用', value: '1' },
            ]"
          />
        </FormItem>
        <FormItem label="备注">
          <Input v-model:value="formData.remark" placeholder="可选，对模板的补充说明" />
        </FormItem>
      </div>

      <!-- 系统提示词 -->
      <Divider orientation="left" class="section-title-divider">
        <div class="section-title-with-tip">
          <span class="section-title">系统提示词</span>
          <Tooltip
            placement="rightTop"
            overlay-class-name="vars-tooltip"
            :overlay-style="{ maxWidth: '640px', width: '640px' }"
          >
            <template #title>
              <div class="tip-block">
                <div class="tip-section-title">可用占位变量</div>
                <div class="tip-desc">在提示词中使用以下占位符，系统会在审核时自动替换为实际内容：</div>
              </div>
              <div class="tip-block">
                <div class="tip-sub-title">通用占位符（建议所有模板使用）</div>
                <div class="var-list">
                  <div v-for="v in commonVars" :key="v.key" class="var-item">
                    <Tag color="blue" class="var-tag">{{ v.key }}</Tag>
                    <span class="var-desc">{{ v.desc }}</span>
                  </div>
                </div>
              </div>
              <div class="tip-block">
                <div class="tip-sub-title">增强占位符（仅本地小模型不听话时使用）</div>
                <div class="var-list">
                  <div v-for="v in enhanceVars" :key="v.key" class="var-item">
                    <Tag color="orange" class="var-tag">{{ v.key }}</Tag>
                    <span class="var-desc">{{ v.desc }}</span>
                  </div>
                </div>
              </div>
              <div class="tip-block tip-warning">
                output_format 中 items[].match_status 取值（matched/mismatched/not_found/uncertain/missing）由模板自定义，业务可按需扩展。
              </div>
            </template>
            <InfoCircleOutlined class="format-tip-icon" />
          </Tooltip>
        </div>
      </Divider>
      <FormItem required>
        <Textarea
          v-model:value="formData.systemPrompt"
          placeholder="定义AI的角色和审核行为，可使用占位变量（点右侧 ⓘ 图标查看）。例如：&#10;你是一个专业的审核员，请根据以下规则审核提交的资料：&#10;{rules}&#10;&#10;参考知识：&#10;{knowledge_context}"
          :rows="10"
          style="font-family: 'SFMono-Regular', Consolas, monospace; font-size: 13px;"
        />
      </FormItem>

      <!-- 用户提示词 -->
      <Divider orientation="left" class="section-title-divider">
        <span class="section-title">用户提示词</span>
      </Divider>
      <FormItem required>
        <Textarea
          v-model:value="formData.userPrompt"
          placeholder="定义每次审核时发送给AI的用户消息。例如：&#10;请审核以下表单数据：&#10;{form_data}"
          :rows="6"
          style="font-family: 'SFMono-Regular', Consolas, monospace; font-size: 13px;"
        />
      </FormItem>

      <!-- 输出格式 -->
      <Divider orientation="left" class="section-title-divider">
        <div class="section-title-with-tip">
          <span class="section-title">输出格式要求</span>
          <Tooltip
            placement="leftTop"
            overlay-class-name="output-format-tooltip"
            :overlay-style="{ maxWidth: '720px', width: '720px' }"
          >
            <template #title>
              <div class="tip-block">
                <div class="tip-section-title">推荐格式</div>
                <pre class="tip-code">{{ recommendedOutputFormat }}</pre>
              </div>
              <div class="tip-grid">
                <div class="tip-block">
                  <div class="tip-section-title">字段说明</div>
                  <ul class="tip-fields">
                    <li><code>pass_status</code>：整体结论 - <code>passed</code> / <code>partial</code> / <code>failed</code> / <code>need_review</code></li>
                    <li><code>score</code>：综合得分 0-100</li>
                    <li><code>summary</code>：一句话总结</li>
                    <li><code>items[]</code>：每条规则一项，按数组顺序落库</li>
                    <li><code>items[].rule_id</code>：对应 review_standard_rule.id</li>
                    <li><code>items[].field_name</code>：snake_case，规则的 check_field</li>
                    <li><code>items[].severity</code>：<code>must</code> / <code>should</code> / <code>may</code></li>
                    <li><code>items[].confidence</code>：置信度 0-100</li>
                  </ul>
                </div>
                <div class="tip-block">
                  <div class="tip-section-title">match_status 取值</div>
                  <ul class="tip-fields">
                    <li><code>matched</code>：值一致，规则通过</li>
                    <li><code>mismatched</code>：值不一致（金额大小写、全半角差异都算）</li>
                    <li><code>not_found</code>：材料里找不到</li>
                    <li><code>uncertain</code>：图片模糊/字迹不清</li>
                    <li><code>missing</code>：提交的材料类型错误</li>
                  </ul>
                </div>
              </div>
              <div class="tip-block tip-warning">
                字段名 snake_case，数值用 number 不用 string。业务可按需扩展（location/page/box 等），ReviewAgent 不强解析未知字段。
              </div>
            </template>
            <InfoCircleOutlined class="format-tip-icon" />
          </Tooltip>
        </div>
      </Divider>
      <FormItem>
        <Textarea
          v-model:value="formData.outputFormat"
          :placeholder="`定义AI返回结果的JSON格式要求（可选，留空使用系统默认格式）。\n点右侧 ⓘ 图标查看推荐格式与字段说明。`"
          :rows="4"
          style="font-family: 'SFMono-Regular', Consolas, monospace; font-size: 13px;"
        />
        <div class="format-actions">
          <a-button size="small" type="link" @click="applyRecommendedFormat">
            填入推荐格式
          </a-button>
        </div>
      </FormItem>
    </Form>
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

.var-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.var-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.var-tag {
  flex-shrink: 0;
  margin: 1px 0 0;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
}

.var-desc {
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.88);
  line-height: 1.6;
}

.section-title-with-tip {
  display: flex;
  align-items: center;
  gap: 8px;
}

.format-tip-icon {
  color: #1890ff;
  cursor: pointer;
  font-size: 14px;
}

.format-tip-icon:hover {
  color: #096dd9;
}

.format-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.tip-block {
  margin-bottom: 14px;
}

.tip-block:last-child {
  margin-bottom: 0;
}

.tip-desc {
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.6;
  margin-top: 4px;
}

.tip-sub-title {
  font-weight: 600;
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.92);
  margin-bottom: 8px;
  padding-left: 6px;
  border-left: 2px solid #4096ff;
}

.tip-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 20px;
}

.tip-section-title {
  font-weight: 600;
  font-size: 13px;
  color: #ffffff;
  margin-bottom: 8px;
  padding-left: 8px;
  border-left: 3px solid #4096ff;
}

.tip-code {
  background: rgba(0, 0, 0, 0.55);
  color: #f8f8f2;
  padding: 12px 14px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.65;
  margin: 0;
  white-space: pre;
  overflow: auto;
  max-height: 320px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}

.tip-fields {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.85;
  color: rgba(255, 255, 255, 0.92);
}

.tip-fields li {
  margin-bottom: 3px;
}

.tip-fields code {
  background: rgba(255, 255, 255, 0.16);
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11.5px;
  color: #ffd666;
  font-family: 'SFMono-Regular', Consolas, monospace;
}

.tip-warning {
  padding: 8px 12px;
  background: rgba(250, 173, 20, 0.18);
  border-left: 3px solid #faad14;
  border-radius: 3px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.92);
  line-height: 1.6;
}
</style>

<style>
/* Tooltip 内部样式（ant-design-vue 把 tooltip 渲染在 body 下，scoped 选择器覆盖不到） */
.output-format-tooltip,
.vars-tooltip {
  max-width: 720px !important;
}

.output-format-tooltip .ant-tooltip-inner {
  width: 720px;
  max-width: 720px;
  padding: 16px 18px;
  background: rgba(33, 37, 43, 0.96);
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
}

.vars-tooltip .ant-tooltip-inner {
  width: 640px;
  max-width: 640px;
  padding: 14px 16px;
  background: rgba(33, 37, 43, 0.96);
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
}

.output-format-tooltip .ant-tooltip-arrow-content,
.output-format-tooltip .ant-tooltip-arrow::before,
.vars-tooltip .ant-tooltip-arrow-content,
.vars-tooltip .ant-tooltip-arrow::before {
  background: rgba(33, 37, 43, 0.96);
}
</style>

