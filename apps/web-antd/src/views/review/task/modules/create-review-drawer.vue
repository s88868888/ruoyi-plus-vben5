<script setup lang="ts">
import { ref, computed } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import {
  message, Steps, Upload, Select, Alert, Card, Divider, Textarea,
} from 'ant-design-vue';
import { InboxOutlined } from '@ant-design/icons-vue';

import { reviewTaskAdd } from '#/api/review/task';
import type { CreateTaskParams } from '#/api/review/task/model';
import { reviewStandardList } from '#/api/review/standard';
import { reviewPromptList } from '#/api/review/prompt';
import { ossUpload } from '#/api/system/oss';

const emit = defineEmits<{ reload: [] }>();

const currentStep = ref(0);
const fileList = ref<any[]>([]);
const submitting = ref(false);
const formData = ref({
  taskType: undefined as string | undefined,
  standardIds: [] as (number | string)[],
  formSnapshot: '',
});

/** 标准选项列表 */
const standardOptions = ref<{ value: number | string; label: string; ruleCount?: number }[]>([]);
const standardLoading = ref(false);

/** 提示词模板选项列表 */
const promptOptions = ref<{ value: string; label: string }[]>([]);
const promptLoading = ref(false);

/** 加载审核标准列表 */
async function loadStandardOptions() {
  standardLoading.value = true;
  try {
    const res = await reviewStandardList({ pageSize: 100 });
    standardOptions.value = (res.rows || []).map((item) => ({
      value: item.id,
      label: item.name + (item.promptTemplateName ? `（${item.promptTemplateName}）` : ''),
      ruleCount: item.ruleCount,
    }));
  } catch {
    message.error('加载审核标准失败');
  } finally {
    standardLoading.value = false;
  }
}

/** 加载提示词模板类型列表 */
async function loadPromptOptions() {
  promptLoading.value = true;
  try {
    const list = await reviewPromptList();
    promptOptions.value = (list || [])
      .filter((item) => item.status === '0')
      .map((item) => ({
        value: item.type,
        label: `${item.name}（${item.type}）`,
      }));
  } catch {
    message.error('加载提示词模板失败');
  } finally {
    promptLoading.value = false;
  }
}

/** 自动生成任务名称 */
function generateTaskName(): string {
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  return `审核任务_${ts}`;
}

/** 提交审核任务 */
async function handleSubmit() {
  submitting.value = true;
  drawerApi.setState({ confirmLoading: true });
  try {
    // 1. 上传文件到 OSS
    const uploadedFiles: { ossId: number | string; fileName: string; fileType: string; filePath: string; fileSize: number }[] = [];
    for (const f of fileList.value) {
      if (f.originFileObj) {
        const res: any = await ossUpload(f.originFileObj);
        const ext = f.name.split('.').pop()?.toLowerCase() || '';
        uploadedFiles.push({
          ossId: res.ossId,
          fileName: f.name,
          fileType: ext,
          filePath: res.url,
          fileSize: f.size || 0,
        });
      }
    }

    // 2. 提交任务
    let snapshot = formData.value.formSnapshot || '{}';
    try {
      snapshot = JSON.stringify(JSON.parse(snapshot.replace(/\n\s*/g, ' ')));
    } catch { /* 非 JSON 则原样提交 */ }
    const params: CreateTaskParams = {
      taskName: generateTaskName(),
      taskType: formData.value.taskType || 'general',
      standardIds: formData.value.standardIds.map(Number),
      formSnapshot: snapshot,
      files: uploadedFiles,
    };
    await reviewTaskAdd(params);
    message.success('审核任务已提交，AI正在审核中...');
    drawerApi.close();
    emit('reload');
  } catch {
    message.error('提交审核任务失败，请重试');
  } finally {
    submitting.value = false;
    drawerApi.setState({ confirmLoading: false });
  }
}

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => {
    const stepNames = ['配置审核', '确认提交'];
    return `新建审核 - ${stepNames[currentStep.value]}`;
  }),
  onOpenChange: (visible) => {
    if (visible) {
      loadStandardOptions();
      loadPromptOptions();
    } else {
      currentStep.value = 0;
      fileList.value = [];
      formData.value = { taskType: undefined, standardIds: [], formSnapshot: '' };
    }
  },
  onConfirm: async () => {
    if (currentStep.value === 0) {
      if (!formData.value.taskType) {
        message.warning('请选择审核类型（提示词模板）');
        return;
      }
      if (formData.value.standardIds.length === 0) {
        message.warning('请选择至少一个审核标准');
        return;
      }
      currentStep.value = 1;
      return;
    }
    await handleSubmit();
  },
  confirmText: computed(() => currentStep.value < 1 ? '下一步' : '提交审核'),
  cancelText: computed(() => currentStep.value === 0 ? '取消' : '上一步'),
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
  <BasicDrawer class="w-[800px]">
    <Steps :current="currentStep" size="small" style="margin-bottom: 24px;">
      <Steps.Step title="配置审核" />
      <Steps.Step title="确认提交" />
    </Steps>

    <!-- Step 1: 审核类型 + 表单数据 + 附件 + 审核标准 -->
    <div v-show="currentStep === 0">
      <Divider orientation="left" class="section-title-divider">
        <span class="section-title">审核类型</span>
      </Divider>
      <Select
        v-model:value="formData.taskType"
        placeholder="请选择审核类型（对应提示词模板）"
        style="width: 100%; margin-bottom: 16px;"
        :options="promptOptions"
        :loading="promptLoading"
      />

      <Divider orientation="left" class="section-title-divider">
        <span class="section-title">表单/业务数据</span>
      </Divider>
      <Textarea
        v-model:value="formData.formSnapshot"
        placeholder="粘贴表单数据（JSON或纯文本均可），AI将基于此内容进行审核。&#10;例如：&#10;{&#10;  &quot;公司名称&quot;: &quot;XX科技有限公司&quot;,&#10;  &quot;信用代码&quot;: &quot;91440300...&quot;,&#10;  &quot;法定代表人&quot;: &quot;张三&quot;&#10;}"
        :rows="6"
        style="margin-bottom: 16px; font-family: 'SFMono-Regular', Consolas, monospace; font-size: 13px;"
      />

      <Divider orientation="left" class="section-title-divider">
        <span class="section-title">上传附件（可选）</span>
      </Divider>
      <Upload.Dragger
        v-model:file-list="fileList"
        :multiple="true"
        :before-upload="() => false"
      >
        <p class="ant-upload-drag-icon"><InboxOutlined /></p>
        <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p class="ant-upload-hint">支持图片（营业执照等）、Word、PDF、Excel 格式</p>
      </Upload.Dragger>

      <Divider orientation="left" class="section-title-divider" style="margin-top: 24px;">
        <span class="section-title">审核标准</span>
      </Divider>
      <Select
        v-model:value="formData.standardIds"
        mode="multiple"
        placeholder="请选择审核标准（可多选）"
        style="width: 100%; margin-bottom: 12px;"
        :options="standardOptions"
        :option-label-prop="'label'"
        :loading="standardLoading"
      />
      <Alert
        message="系统会自动附加通用规范（违法违规检测、敏感词检测、基础格式检查）"
        type="info"
        show-icon
      />

    </div>

    <!-- Step 2: 确认提交 -->
    <div v-show="currentStep === 1">
      <Divider orientation="left" class="section-title-divider">
        <span class="section-title">审核信息确认</span>
      </Divider>
      <Card size="small" style="margin-bottom: 16px;">
        <div style="line-height: 2.4;">
          <div>
            <strong>审核类型：</strong>
            {{ promptOptions.find(p => p.value === formData.taskType)?.label || formData.taskType }}
          </div>
          <div v-if="formData.formSnapshot">
            <strong>表单数据：</strong>
            <pre style="background: #f5f5f5; padding: 8px; border-radius: 4px; font-size: 12px; max-height: 120px; overflow: auto; margin-top: 4px;">{{ formData.formSnapshot }}</pre>
          </div>
          <div><strong>附件数量：</strong>{{ fileList.length }} 份</div>
          <div v-if="fileList.length > 0">
            <div v-for="f in fileList" :key="f.uid" style="padding-left: 16px; color: #666; font-size: 13px;">
              {{ f.name }}
            </div>
          </div>
          <div>
            <strong>审核标准：</strong>
            <span v-for="id in formData.standardIds" :key="id" style="margin-right: 8px; color: #1890ff;">
              {{ standardOptions.find(s => s.value === id)?.label }}
            </span>
          </div>
        </div>
      </Card>
      <Alert
        message="提交后AI将自动开始审核，审核完成后结果将返回给业务系统"
        type="success"
        show-icon
      />
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
</style>
