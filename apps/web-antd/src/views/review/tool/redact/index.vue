<!--
  文件脱敏向导（独立工具）。步骤：①上传待脱敏文件 ②选择关注点(开始定位) ③脱敏结果。
  后端 taskType=FILE_REDACT，只提取 focus_items，不保存审核异常明细、不评分。
-->
<template>
  <div v-if="resultFullscreenActive" class="tool-result-fullscreen">
    <ContentAuditViewer
      v-if="resultStatus === 'success' && result"
      viewer-mode="redact"
      :task-id="result.id || ''"
      :doc-url="result.signFileUrl || ''"
      :doc-searchable-url="result.signSearchableUrl || ''"
      :doc-oss-id="result.signOssId || null"
      :doc-ocr-status="result.signOcrStatus || ''"
      :doc-label="docLabel"
      :issues="[]"
      :focus-items="result.focusItems || []"
      :focus-keywords="result.focusKeywords || []"
      :redact-data="result.redactData || ''"
      :status="result.status || ''"
      @close="closeResultFullscreen"
      @redact-saved="onRedactSaved"
    />
    <div v-else class="tool-result-state">
      <div v-if="resultStatus === 'running'" class="result-loading">
        <LoadingOutlined spin class="rl-spin" />
        <div class="rl-title">AI 正在定位关注点...</div>
        <div class="rl-sub">完成后可直接查看定位结果，并导出不可逆脱敏件</div>
        <Button type="link" :loading="checking" class="rl-now" @click="checkNow">
          立即刷新
        </Button>
      </div>
      <Result
        v-else
        status="error"
        title="定位失败"
        :sub-title="resultError || '关注点定位失败，请稍后重试'"
      >
        <template #extra>
          <Button @click="goList">返回审核任务列表</Button>
        </template>
      </Result>
    </div>
  </div>

  <Page
    v-else
    :auto-content-height="true"
    class="tool-page"
    content-class="flex flex-col min-h-0"
  >
    <Card class="tool-card" :bordered="false" :body-style="wizardCardBodyStyle">
      <ReviewWizard
        v-model:current="current"
        :steps="steps"
        :action-step="1"
        :next-disabled="nextDisabled"
        :finish-loading="submitting"
        finish-text="开始定位"
        :show-restart="true"
        restart-text="返回审核任务列表"
        @finish="onStart"
        @restart="goList"
      >
        <template #default="{ current: cur }">
          <div v-show="cur === 0" class="step-pane">
            <div class="pane-tip">上传需要脱敏的文件。Word 会自动转 PDF，以便预览和框选。</div>
            <SingleFileUpload
              v-model="docFile"
              accept=".pdf,.docx,.doc"
              tip="上传待脱敏文件"
            />
          </div>

          <div v-show="cur === 1" class="step-pane">
            <div class="pane-tip">选择需要定位并脱敏的关注点。这里不会执行内容审核、评分或审批。</div>
            <FocusPointPicker v-model="focusPoints" v-model:standard-id="standardId" />
          </div>

          <div v-show="cur === 2" class="step-pane result-pane">
            <div v-if="resultStatus === 'running'" class="result-loading">
              <LoadingOutlined spin class="rl-spin" />
              <div class="rl-title">AI 正在定位关注点...</div>
              <div class="rl-sub">每 5 秒自动刷新一次，也可以稍后从审核任务列表查看</div>
              <Button type="link" :loading="checking" class="rl-now" @click="checkNow">
                立即刷新
              </Button>
            </div>
            <Result
              v-else-if="resultStatus === 'success'"
              status="success"
              title="关注点定位完成"
              sub-title="可查看文档定位结果，并导出不可逆脱敏件"
            >
              <template #extra>
                <Button type="primary" @click="openResultFullscreen">
                  <template #icon><EyeOutlined /></template>
                  查看并脱敏
                </Button>
              </template>
            </Result>
            <Result
              v-else
              status="error"
              title="定位失败"
              :sub-title="resultError || '关注点定位失败，请稍后重试'"
            />
          </div>
        </template>
      </ReviewWizard>
    </Card>
  </Page>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue';

import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { EyeOutlined, LoadingOutlined } from '@ant-design/icons-vue';
import { Button, Card, message, Result } from 'ant-design-vue';

import { getToolResult, toolCreateAndExecute } from '#/api/review/tool';
import type { ReviewToolResult } from '#/api/review/tool/model';

import FocusPointPicker from '../components/FocusPointPicker.vue';
import ReviewWizard from '../components/ReviewWizard.vue';
import SingleFileUpload from '../components/SingleFileUpload.vue';
// @ts-expect-error 查看器为纯 JS SFC（含 pdfjs/canvas 复杂逻辑），不暴露 TS 类型
import ContentAuditViewer from '../components/ContentAuditViewer.vue';

const router = useRouter();
const route = useRoute();

const steps = [
  { title: '上传文件' },
  { title: '选择关注点' },
  { title: '脱敏结果' },
];

const wizardCardBodyStyle: CSSProperties = {
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minHeight: 0,
  padding: '32px 24px 24px',
};

const current = ref(0);
const docFile = ref<any>(null);
const focusPoints = ref<string[]>([]);
const standardId = ref<any>();
const submitting = ref(false);

const taskId = ref<any>('');
const result = ref<ReviewToolResult | null>(null);
const resultStatus = ref<'running' | 'success' | 'fail'>('running');
const resultError = ref('');
const checking = ref(false);
const resultFullscreen = ref(false);
const fromHistory = ref(false);
const fullscreenMode = ref(route.query.fullscreen === '1');
const resultFullscreenActive = computed(() => fullscreenMode.value || resultFullscreen.value);

const docLabel = computed(() => result.value?.signFileName || docFile.value?.name || '待脱敏文件');

const nextDisabled = computed(() => {
  if (current.value === 0) return !docFile.value;
  if (current.value === 1) return !focusPoints.value.length;
  return false;
});

function extOf(name: string) {
  const m = /\.([a-z0-9]+)$/i.exec(name || '');
  return m && m[1] ? m[1].toLowerCase() : 'pdf';
}

async function onStart() {
  submitting.value = true;
  try {
    const id = await toolCreateAndExecute({
      taskName: `工具-文件脱敏-${docFile.value.name}`,
      taskType: 'FILE_REDACT',
      sourceType: 'AI_TOOL',
      standardIds: standardId.value ? [standardId.value] : [],
      formSnapshot: JSON.stringify({
        focusPoints: focusPoints.value,
        standardId: standardId.value || null,
      }),
      files: [
        {
          ossId: docFile.value.ossId,
          fileName: docFile.value.name,
          fileType: extOf(docFile.value.name),
          filePath: docFile.value.url,
        },
      ],
    });
    if (!id) throw new Error('未获取到任务ID');
    taskId.value = String(id);
    result.value = null;
    resultError.value = '';
    resultStatus.value = 'running';
    current.value = 2;
    pollOnce();
  } catch (e: any) {
    message.error('提交文件脱敏失败：' + (e?.message || e));
  } finally {
    submitting.value = false;
  }
}

let pollTimer: any = null;
function stopPoll() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}
function schedulePoll() {
  stopPoll();
  pollTimer = setTimeout(pollOnce, 5000);
}
async function pollOnce() {
  if (!taskId.value) return;
  try {
    const r = await getToolResult(taskId.value);
    if (r && r.status === 'SUCCESS') {
      result.value = r;
      resultStatus.value = 'success';
      if (fromHistory.value && !fullscreenMode.value) resultFullscreen.value = true;
      stopPoll();
      return;
    }
    if (r && r.status === 'FAIL') {
      resultStatus.value = 'fail';
      resultError.value = r.errorMsg || '';
      stopPoll();
      return;
    }
    schedulePoll();
  } catch {
    schedulePoll();
  }
}
async function checkNow() {
  if (checking.value) return;
  checking.value = true;
  try {
    await pollOnce();
  } finally {
    checking.value = false;
  }
}

function openResultFullscreen() {
  if (resultStatus.value === 'success' && result.value) {
    resultFullscreen.value = true;
  }
}

function closeResultFullscreen() {
  if (fullscreenMode.value) {
    goList();
    return;
  }
  resultFullscreen.value = false;
}

function onRedactSaved(redactData: string) {
  if (result.value) result.value.redactData = redactData;
}

function goList() {
  stopPoll();
  router.push('/review/task');
}

onMounted(() => {
  const qid = route.query.taskId;
  if (qid) {
    taskId.value = String(qid);
    resultStatus.value = 'running';
    current.value = 2;
    fromHistory.value = true;
    pollOnce();
  }
});

onBeforeUnmount(stopPoll);
onDeactivated(stopPoll);
onActivated(() => {
  if (taskId.value && resultStatus.value === 'running') pollOnce();
});
</script>

<style scoped>
.tool-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  border-radius: 10px;
}
.tool-page {
  height: 100%;
}
.tool-page :deep(.review-wizard) {
  flex: 1;
}
.tool-result-fullscreen {
  height: var(--vben-content-height, 100%);
  max-height: var(--vben-content-height, 100%);
  min-height: 0;
  overflow: hidden;
  background: #f5f7fb;
}
.tool-result-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #fff;
}
.tool-result-fullscreen :deep(.ca-viewer) {
  height: 100%;
  min-height: 0;
}
.step-pane {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  width: min(920px, 100%);
  min-height: 0;
  margin: 0 auto;
}
.step-pane :deep(.single-upload) {
  flex: 0 1 340px;
}
.step-pane :deep(.focus-picker) {
  max-height: 100%;
  overflow: auto;
}
.pane-tip {
  color: #606266;
  font-size: 13px;
  margin-bottom: 16px;
  text-align: center;
}
.result-pane {
  align-items: center;
}
.result-loading {
  text-align: center;
  padding: 24px 0;
}
.rl-spin {
  font-size: 42px;
  color: #1677ff;
}
.rl-title {
  font-size: 17px;
  font-weight: 600;
  color: #303133;
  margin-top: 16px;
}
.rl-sub {
  font-size: 13px;
  color: #909399;
  margin-top: 8px;
}
.rl-now {
  margin-top: 12px;
}
</style>
