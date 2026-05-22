<script setup lang="ts">
import { computed, h, ref } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import {
  message, Modal, Form, FormItem, Input, InputNumber, Select, Textarea, Divider, Alert, InputPassword,
  Switch, Tooltip,
} from 'ant-design-vue';
import { InfoCircleOutlined } from '@ant-design/icons-vue';
import { reviewModelConfigAdd, reviewModelConfigUpdate, reviewModelConfigTest } from '#/api/review/modelConfig';

const emit = defineEmits<{ reload: [] }>();

const mode = ref<'add' | 'edit'>('add');

interface FormState {
  id?: number | string;
  name: string;
  code: string;
  purpose: 'chat' | 'ocr';
  provider: 'ollama' | 'dashscope' | 'paddleocr' | 'qwen-vl-ocr';
  modelName: string;
  baseUrl: string;
  apiKey: string;
  numCtx?: number;
  numPredict?: number;
  maxTokens?: number;
  temperature: number;
  topP: number;
  timeoutMs: number;
  kvCacheType: string;
  extraOptions: string;
  enabled: string;
  remark: string;
}

const defaultForm = (): FormState => ({
  id: undefined,
  name: '',
  code: '',
  purpose: 'chat',
  provider: 'ollama',
  modelName: '',
  baseUrl: 'http://192.168.169.205:11434',
  apiKey: '',
  numCtx: 32768,
  numPredict: 8000,
  maxTokens: undefined,
  temperature: 0.2,
  topP: 0.8,
  timeoutMs: 300000,
  kvCacheType: '',
  extraOptions: '{"format":"json","think":false}',
  enabled: '1',
  remark: '',
});

const formData = ref<FormState>(defaultForm());

const isOllama = computed(() => formData.value.provider === 'ollama');
const isDashScope = computed(() => formData.value.provider === 'dashscope');
const isPaddleOcr = computed(() => formData.value.provider === 'paddleocr');
const isQwenVlOcr = computed(() => formData.value.provider === 'qwen-vl-ocr');
const isOcrPurpose = computed(() => formData.value.purpose === 'ocr');

// purpose 切换：自动切到第一个匹配的 provider
function applyPurposeDefaults(p: FormState['purpose']) {
  if (p === 'ocr') {
    if (formData.value.provider !== 'paddleocr' && formData.value.provider !== 'qwen-vl-ocr') {
      applyProviderDefaults('paddleocr');
    }
  } else {
    if (formData.value.provider !== 'ollama' && formData.value.provider !== 'dashscope') {
      applyProviderDefaults('ollama');
    }
  }
}

function applyProviderDefaults(p: FormState['provider']) {
  if (p === 'ollama') {
    formData.value = {
      ...formData.value,
      provider: 'ollama',
      baseUrl: formData.value.baseUrl || 'http://192.168.169.205:11434',
      apiKey: '',
      numCtx: formData.value.numCtx ?? 32768,
      numPredict: formData.value.numPredict ?? 8000,
      maxTokens: undefined,
      temperature: formData.value.temperature ?? 0.2,
      topP: formData.value.topP ?? 0.8,
      timeoutMs: formData.value.timeoutMs ?? 300000,
      extraOptions: formData.value.extraOptions || '{"format":"json","think":false}',
    };
  } else if (p === 'dashscope') {
    formData.value = {
      ...formData.value,
      provider: 'dashscope',
      baseUrl: '',
      apiKey: formData.value.apiKey || '${DASHSCOPE_API_KEY}',
      numCtx: undefined,
      numPredict: undefined,
      maxTokens: formData.value.maxTokens ?? 8192,
      temperature: formData.value.temperature ?? 0.3,
      topP: formData.value.topP ?? 0.8,
      timeoutMs: formData.value.timeoutMs ?? 120000,
      extraOptions: formData.value.extraOptions || '',
    };
  } else if (p === 'paddleocr') {
    formData.value = {
      ...formData.value,
      provider: 'paddleocr',
      modelName: formData.value.modelName || 'paddlex-ocr',
      baseUrl: formData.value.baseUrl?.includes('11434') || !formData.value.baseUrl
        ? 'http://192.168.169.205:8086/ocr'
        : formData.value.baseUrl,
      apiKey: '',
      numCtx: undefined,
      numPredict: undefined,
      maxTokens: undefined,
      temperature: 0,
      topP: 0,
      timeoutMs: 60000,
      extraOptions: formData.value.extraOptions
        || '{"confidenceThreshold":0.5,"useDocOrientationClassify":false,"useDocUnwarping":false,"useTextlineOrientation":false}',
    };
  } else if (p === 'qwen-vl-ocr') {
    formData.value = {
      ...formData.value,
      provider: 'qwen-vl-ocr',
      modelName: formData.value.modelName || 'qwen3-vl-plus',
      baseUrl: '',
      apiKey: formData.value.apiKey || '${DASHSCOPE_API_KEY}',
      numCtx: undefined,
      numPredict: undefined,
      maxTokens: formData.value.maxTokens ?? 32768,
      temperature: 0.1,
      topP: 0.8,
      timeoutMs: 120000,
      extraOptions: formData.value.extraOptions || '{"multiModel":true}',
    };
  }
}

function validateExtraOptionsJson(): boolean {
  if (!formData.value.extraOptions || !formData.value.extraOptions.trim()) return true;
  try { JSON.parse(formData.value.extraOptions); return true; } catch { return false; }
}

const testing = ref(false);

async function handleTest() {
  const f = formData.value;
  if (!f.modelName) return message.warning('请先填写模型ID');
  if (f.provider === 'ollama' && !f.baseUrl) return message.warning('Ollama 需要填 baseUrl');
  if (f.provider === 'paddleocr' && !f.baseUrl) return message.warning('PaddleOCR 需要填 baseUrl');
  if ((f.provider === 'dashscope' || f.provider === 'qwen-vl-ocr') && !f.apiKey) {
    return message.warning('DashScope 类需要填 apiKey');
  }
  if (!validateExtraOptionsJson()) return message.warning('extraOptions 必须是合法 JSON 或留空');

  testing.value = true;
  const hide = message.loading('正在测试连接...', 0);
  try {
    const res = await reviewModelConfigTest(f);
    hide();
    if (res?.ok) {
      Modal.success({
        title: '连接成功',
        width: 560,
        content: h('div', { style: { fontSize: '13px', lineHeight: '1.7' } }, [
          h('div', null, [h('strong', null, '用例：'), res.testCase]),
          h('div', null, [h('strong', null, '耗时：'), `${res.durationMs} ms`]),
          h('div', null, [h('strong', null, '端点：'), res.endpoint]),
          h('div', { style: { marginTop: '8px' } }, [h('strong', null, '返回：')]),
          h('pre', {
            style: {
              background: 'rgba(0,0,0,0.04)', padding: '8px', borderRadius: '4px',
              fontSize: '12px', maxHeight: '200px', overflow: 'auto', whiteSpace: 'pre-wrap',
            },
          }, res.message || '(空)'),
        ]),
      });
    } else {
      Modal.error({
        title: '连接失败',
        width: 560,
        content: h('div', { style: { fontSize: '13px', lineHeight: '1.7' } }, [
          h('div', null, [h('strong', null, '用例：'), res?.testCase || '-']),
          h('div', null, [h('strong', null, '耗时：'), `${res?.durationMs ?? 0} ms`]),
          h('div', null, [h('strong', null, '端点：'), res?.endpoint || '-']),
          h('div', { style: { marginTop: '8px' } }, [h('strong', null, '错误：')]),
          h('pre', {
            style: {
              background: 'rgba(255,77,79,0.06)', padding: '8px', borderRadius: '4px',
              border: '1px solid rgba(255,77,79,0.2)',
              fontSize: '12px', maxHeight: '240px', overflow: 'auto',
              whiteSpace: 'pre-wrap', color: '#a8071a',
            },
          }, res?.message || '未知错误'),
        ]),
      });
    }
  } catch (e: any) {
    hide();
    message.error('测试请求失败：' + (e?.message || '未知'));
  } finally {
    testing.value = false;
  }
}

/** 通用：把 extraOptions JSON 字段双向绑定到一个布尔开关 */
function makeBoolField(key: string) {
  return computed({
    get(): boolean {
      if (!formData.value.extraOptions) return false;
      try {
        const obj = JSON.parse(formData.value.extraOptions);
        return obj && obj[key] === true;
      } catch { return false; }
    },
    set(v: boolean) {
      let obj: Record<string, any> = {};
      if (formData.value.extraOptions && formData.value.extraOptions.trim()) {
        try { obj = JSON.parse(formData.value.extraOptions); } catch { obj = {}; }
      }
      if (v) {
        obj[key] = true;
      } else {
        delete obj[key];
      }
      formData.value.extraOptions = Object.keys(obj).length === 0 ? '' : JSON.stringify(obj);
    },
  });
}

/**
 * 「多模态接口」开关：双向同步到 extraOptions JSON 的 multiModel 字段。
 * 由用户根据所选模型自行判断（多模态模型必开、纯文本必关）。
 */
const multiModel = makeBoolField('multiModel');

/**
 * 「Prompt Cache」开关：双向同步到 extraOptions JSON 的 enableCache 字段。
 * 启用后请求会带 X-DashScope-Cache: enable header，命中重复 prompt 大幅降低耗时和成本。
 * 适合：审核场景里 system+rules+knowledge 高度重复的任务。
 * 不适合：每次都给 AI 全新输入的场景（缓存不会命中，反而多一次握手）。
 */
const enableCache = makeBoolField('enableCache');

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => mode.value === 'add' ? '新增模型配置' : '编辑模型配置'),
  onOpenChange: (visible) => {
    if (!visible) return;
    const data = drawerApi.getData<{ mode: 'add' | 'edit'; record?: any }>();
    mode.value = data?.mode || 'add';
    if (data?.mode === 'edit' && data.record) {
      formData.value = {
        id: data.record.id,
        name: data.record.name || '',
        code: data.record.code || '',
        purpose: data.record.purpose || 'chat',
        provider: data.record.provider || 'ollama',
        modelName: data.record.modelName || '',
        baseUrl: data.record.baseUrl || '',
        apiKey: data.record.apiKey || '',
        numCtx: data.record.numCtx,
        numPredict: data.record.numPredict,
        maxTokens: data.record.maxTokens,
        temperature: data.record.temperature ?? 0.2,
        topP: data.record.topP ?? 0.8,
        timeoutMs: data.record.timeoutMs ?? 60000,
        kvCacheType: data.record.kvCacheType || '',
        extraOptions: data.record.extraOptions || '',
        enabled: data.record.enabled || '1',
        remark: data.record.remark || '',
      };
    } else {
      formData.value = defaultForm();
    }
  },
  onConfirm: async () => {
    const f = formData.value;
    if (!f.name) return message.warning('请输入名称');
    if (!f.code) return message.warning('请输入唯一编码');
    if (!f.modelName) return message.warning('请输入模型ID');
    if (f.provider === 'ollama' && !f.baseUrl) return message.warning('Ollama 需要填 baseUrl');
    if (f.provider === 'paddleocr' && !f.baseUrl) return message.warning('PaddleOCR 需要填 baseUrl');
    if ((f.provider === 'dashscope' || f.provider === 'qwen-vl-ocr') && !f.apiKey) {
      return message.warning('DashScope 类需要填 apiKey');
    }
    if (!validateExtraOptionsJson()) return message.warning('extraOptions 必须是合法 JSON 或留空');

    drawerApi.setState({ confirmLoading: true });
    try {
      if (mode.value === 'edit') {
        await reviewModelConfigUpdate(f);
        message.success('更新成功，下次审核生效');
      } else {
        await reviewModelConfigAdd(f);
        message.success('创建成功');
      }
      drawerApi.close();
      emit('reload');
    } catch {
      message.error('操作失败');
    } finally {
      drawerApi.setState({ confirmLoading: false });
    }
  },
});
</script>

<template>
  <BasicDrawer class="w-[820px]">
    <template #prepend-footer>
      <a-button :loading="testing" @click="handleTest">测试连接</a-button>
    </template>
    <Form layout="vertical">
      <Divider orientation="left" class="section-title-divider">
        <span class="section-title">基本信息</span>
      </Divider>
      <div class="form-grid">
        <FormItem label="名称" required>
          <Input v-model:value="formData.name" placeholder="如：本地 Qwen3.6 35B" />
        </FormItem>
        <FormItem label="唯一编码" required>
          <Input v-model:value="formData.code" placeholder="如：local-qwen3-35b" :disabled="mode === 'edit'" />
        </FormItem>
        <FormItem label="用途" required>
          <Select
            v-model:value="formData.purpose"
            style="width: 100%;"
            :options="[
              { label: 'Chat / AI 审核', value: 'chat' },
              { label: 'OCR 文字识别', value: 'ocr' },
            ]"
            @change="(v) => applyPurposeDefaults(v as any)"
          />
        </FormItem>
        <FormItem label="提供方" required>
          <Select
            v-if="!isOcrPurpose"
            v-model:value="formData.provider"
            style="width: 100%;"
            :options="[
              { label: 'Ollama (本地大模型)', value: 'ollama' },
              { label: 'DashScope (阿里云百炼)', value: 'dashscope' },
            ]"
            @change="(v) => applyProviderDefaults(v as any)"
          />
          <Select
            v-else
            v-model:value="formData.provider"
            style="width: 100%;"
            :options="[
              { label: 'PaddleOCR (本地 PP-OCRv5)', value: 'paddleocr' },
              { label: 'Qwen-VL OCR (云端视觉)', value: 'qwen-vl-ocr' },
            ]"
            @change="(v) => applyProviderDefaults(v as any)"
          />
        </FormItem>
        <FormItem label="模型ID" required>
          <Input
            v-model:value="formData.modelName"
            :placeholder="
              isPaddleOcr ? '如：paddlex-ocr (展示用名称)' :
              isQwenVlOcr ? '如：qwen3-vl-plus' :
              isOllama ? '如：qwen3.6:35b-a3b-q4_K_M' :
              '如：qwen-long-latest / qwen-plus'
            "
          />
        </FormItem>
      </div>

      <Divider orientation="left" class="section-title-divider">
        <span class="section-title">连接参数</span>
      </Divider>
      <div class="form-grid">
        <FormItem v-if="isOllama || isPaddleOcr" label="服务地址（baseUrl）" required>
          <Input
            v-model:value="formData.baseUrl"
            :placeholder="isPaddleOcr ? 'http://192.168.169.205:8086/ocr' : 'http://192.168.169.205:11434'"
          />
        </FormItem>
        <FormItem v-else label="服务地址（baseUrl，可选）">
          <Input v-model:value="formData.baseUrl" placeholder="留空走 starter 默认地址" />
        </FormItem>
        <FormItem v-if="isDashScope || isQwenVlOcr" label="API Key" required>
          <InputPassword v-model:value="formData.apiKey" placeholder="支持 ${DASHSCOPE_API_KEY} 占位符" />
        </FormItem>
        <FormItem label="超时（毫秒）">
          <InputNumber v-model:value="formData.timeoutMs" :min="1000" :step="1000" style="width: 100%;" />
        </FormItem>
      </div>

      <Divider v-if="!isPaddleOcr" orientation="left" class="section-title-divider">
        <span class="section-title">推理参数</span>
      </Divider>
      <div v-if="!isPaddleOcr" class="form-grid">
        <FormItem v-if="isOllama" label="num_ctx（上下文窗口）">
          <InputNumber v-model:value="formData.numCtx" :min="1024" :step="1024" style="width: 100%;" />
        </FormItem>
        <FormItem v-if="isOllama" label="num_predict（输出上限）">
          <InputNumber v-model:value="formData.numPredict" :min="100" :step="100" style="width: 100%;" />
        </FormItem>
        <FormItem v-if="!isOllama" label="max_tokens（输出上限）">
          <InputNumber v-model:value="formData.maxTokens" :min="100" :step="100" style="width: 100%;" />
        </FormItem>
        <FormItem label="temperature">
          <InputNumber v-model:value="formData.temperature" :min="0" :max="2" :step="0.1" style="width: 100%;" />
        </FormItem>
        <FormItem label="top_p">
          <InputNumber v-model:value="formData.topP" :min="0" :max="1" :step="0.05" style="width: 100%;" />
        </FormItem>
        <FormItem v-if="isOllama" label="kv_cache_type（可选）">
          <Select
            v-model:value="formData.kvCacheType"
            allow-clear
            style="width: 100%;"
            placeholder="未设置时使用 server 默认"
            :options="[
              { label: 'f16（高精度）', value: 'f16' },
              { label: 'q8_0（推荐，节省显存）', value: 'q8_0' },
              { label: 'q4_0（最省显存，质量略降）', value: 'q4_0' },
            ]"
          />
        </FormItem>
        <FormItem v-if="isDashScope" class="col-span-2">
          <template #label>
            <span style="display: inline-flex; align-items: center; gap: 6px;">
              多模态接口（multiModel）
              <Tooltip>
                <template #title>
                  <div>调用 DashScope 多模态模型（qwen-vl-plus、qwen3-vl-plus、qwen3.6-plus 等）必须开启。</div>
                  <div style="margin-top: 4px;">纯文本模型（qwen-plus、qwen-long、qwen-max）必须关闭。</div>
                  <div style="margin-top: 4px; opacity: 0.8;">不匹配时 DashScope 会返回 「url error, please check url」。</div>
                </template>
                <InfoCircleOutlined style="color: #1890ff; cursor: pointer;" />
              </Tooltip>
            </span>
          </template>
          <Switch v-model:checked="multiModel" checked-children="开" un-checked-children="关" />
        </FormItem>
        <FormItem v-if="isDashScope" class="col-span-2">
          <template #label>
            <span style="display: inline-flex; align-items: center; gap: 6px;">
              Prompt Cache（enableCache）
              <Tooltip>
                <template #title>
                  <div>启用后请求带 <code>X-DashScope-Cache: enable</code>，重复 prompt 命中缓存可降 30~50% 延迟。</div>
                  <div style="margin-top: 4px;">推荐场景：审核任务（system + rules + 知识库内容高度重复）。</div>
                  <div style="margin-top: 4px; opacity: 0.85;">命中需要 prompt 前缀完全一致；前缀变化频繁时不会命中。</div>
                  <div style="margin-top: 4px; opacity: 0.85;">需 DashScope 账号开启 Context Cache 功能（默认已支持，无额外费用）。</div>
                </template>
                <InfoCircleOutlined style="color: #1890ff; cursor: pointer;" />
              </Tooltip>
            </span>
          </template>
          <Switch v-model:checked="enableCache" checked-children="开" un-checked-children="关" />
        </FormItem>
      </div>

      <Divider orientation="left" class="section-title-divider">
        <span class="section-title">额外选项 (extraOptions)</span>
      </Divider>
      <Alert type="info" show-icon style="margin-bottom: 12px;">
        <template #message>
          运行时透传给 ChatOptions 的 JSON。<br />
          - Ollama: <code>format / think</code><br />
          - DashScope: <code>incrementalOutput / multiModel</code><br />
          - PaddleOCR: <code>confidenceThreshold / useDocOrientationClassify / useDocUnwarping / useTextlineOrientation</code>
        </template>
      </Alert>
      <FormItem>
        <Textarea
          v-model:value="formData.extraOptions"
          :rows="3"
          placeholder='如：{"format":"json","think":false}'
          style="font-family: 'SFMono-Regular', Consolas, monospace; font-size: 13px;"
        />
      </FormItem>

      <Divider orientation="left" class="section-title-divider">
        <span class="section-title">状态</span>
      </Divider>
      <div class="form-grid">
        <FormItem label="启用">
          <Select v-model:value="formData.enabled" style="width: 100%;" :options="[
            { label: '启用', value: '1' },
            { label: '停用', value: '0' },
          ]" />
        </FormItem>
        <FormItem label="备注" class="col-span-2">
          <Input v-model:value="formData.remark" placeholder="补充说明" />
        </FormItem>
      </div>

      <Alert
        v-if="isDashScope"
        type="warning"
        show-icon
        message="apiKey 支持 ${ENV_VAR} 占位符；表中明文写死 KEY 会被运营看到，建议线上写占位符由后端从环境变量解析"
        style="margin-top: 12px;"
      />
    </Form>
  </BasicDrawer>
</template>

<style scoped>
.section-title-divider { margin: 4px 0 12px; }
.section-title-divider :deep(.ant-divider-inner-text) { padding-left: 0; }
.section-title-divider::before { display: none !important; }
.section-title { padding-left: 8px; border-left: 3px solid hsl(var(--primary)); font-weight: 600; font-size: 16px; line-height: 1.5; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }
.col-span-2 { grid-column: span 2; }
</style>
