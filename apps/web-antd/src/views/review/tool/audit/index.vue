<!--
  内容审查向导（独立工具）。步骤：①上传被审文件 ②选择规则 ③填写基准值(开始审查) ④审查结果
  ③点「开始审查」→ toolCreateAndExecute(taskType=CONTENT_AUDIT, formSnapshot=基准值JSON) → 轮询 getToolResult。
  出 SUCCESS → 「查看结果」打开内容审查查看器(全屏 Drawer)。
-->
<template>
  <div v-if="resultFullscreenActive" class="tool-result-fullscreen">
    <ContentAuditViewer
      v-if="resultStatus === 'success' && result"
      :task-id="result.id || ''"
      :doc-url="result.signFileUrl || ''"
      :doc-searchable-url="result.signSearchableUrl || ''"
      :doc-oss-id="result.signOssId || null"
      :doc-ocr-status="result.signOcrStatus || ''"
      :doc-label="auditDocLabel"
      :issues="result.issues || []"
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
        <div class="rl-title">AI 正在审查中…</div>
        <div class="rl-sub">每 5 秒自动刷新一次，您也可以立即刷新</div>
        <Button type="link" :loading="checking" class="rl-now" @click="checkNow">
          立即刷新
        </Button>
      </div>
      <Result
        v-else
        status="error"
        title="审查失败"
        :sub-title="resultError || 'AI 审核执行失败，请稍后在审核任务列表重试'"
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
        :action-step="2"
        :next-disabled="nextDisabled"
        :finish-loading="submitting"
        finish-text="开始审查"
        :show-restart="true"
        restart-text="返回审核任务列表"
        @finish="onStart"
        @restart="goList"
      >
        <template #default="{ current: cur }">
          <div v-show="cur === 0" class="step-pane">
            <div class="pane-tip">上传需要审查的文档（如合同、协议、申报材料）</div>
            <SingleFileUpload v-model="docFile" tip="上传被审查文件" />
          </div>

          <div v-show="cur === 1" class="step-pane">
            <div class="pane-tip">选择本次审查使用的审核标准（规则），可多选并预览</div>
            <StandardPicker v-model="standardIds" />
          </div>

          <div v-show="cur === 2" class="step-pane">
            <div class="pane-tip">
              填写文档应符合的「标准值」，AI 据此判定错填/漏填（可留空，仅按规则审查）
            </div>
            <ReferenceEditor v-model="referenceData" />
          </div>

          <div v-show="cur === 3" class="step-pane result-pane">
            <div v-if="resultStatus === 'running'" class="result-loading">
              <LoadingOutlined spin class="rl-spin" />
              <div class="rl-title">AI 正在审查中…</div>
              <div class="rl-sub">每 5 秒自动刷新一次，您也可以先返回任务列表稍后查看</div>
              <Button type="link" :loading="checking" class="rl-now" @click="checkNow">
                立即刷新
              </Button>
            </div>
            <Result
              v-else-if="resultStatus === 'success'"
              status="success"
              title="审查完成"
              sub-title="AI 已完成内容审查，可查看筛查结果"
            >
              <template #extra>
                <Button type="primary" @click="openResultFullscreen">
                  <template #icon><EyeOutlined /></template>
                  查看结果
                </Button>
              </template>
            </Result>
            <Result
              v-else
              status="error"
              title="审查失败"
              :sub-title="resultError || 'AI 审核执行失败，请稍后在审核任务列表重试'"
            />
          </div>
        </template>
      </ReviewWizard>
    </Card>

    <!-- 内容审查查看器（单文档，全屏 Drawer） -->
  </Page>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue';

import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Page } from '@vben/common-ui';
import { EyeOutlined, LoadingOutlined } from '@ant-design/icons-vue';
import { Button, Card, message, Result } from 'ant-design-vue';
import ReviewWizard from '../components/ReviewWizard.vue';
import SingleFileUpload from '../components/SingleFileUpload.vue';
import StandardPicker from '../components/StandardPicker.vue';
import ReferenceEditor from '../components/ReferenceEditor.vue';
// @ts-expect-error 查看器为忠实移植的纯 JS SFC（含 pdfjs/canvas 复杂逻辑），不暴露 TS 类型
import ContentAuditViewer from '../components/ContentAuditViewer.vue';
import { getToolResult, toolCreateAndExecute } from '#/api/review/tool';
import type { ReviewToolResult } from '#/api/review/tool/model';

const router = useRouter();
const route = useRoute();

const steps = [
  { title: '上传被审文件' },
  { title: '选择规则' },
  { title: '填写基准值' },
  { title: '审查结果' },
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
const standardIds = ref<any[]>([]);
const referenceData = ref('');
const submitting = ref(false);

const taskId = ref<any>('');
const result = ref<ReviewToolResult | null>(null);
const resultStatus = ref<'running' | 'success' | 'fail'>('running');
const resultError = ref('');
const checking = ref(false);
const resultFullscreen = ref(false);
const leavingFullscreenResult = ref(false);
// 从任务列表「查看」带 taskId 进来：直接看历史结果，成功后自动打开查看器
const fromHistory = ref(false);
// 快照读取，不用 computed(route.query)：fullscreen 由进入本 tab 的导航决定，tab 存活期间
// 不该随路由变。若依赖 route.query，切走 tab 时 route 变→本(被 KeepAlive 缓存的)组件重渲→
// 根元素在 <Transition out-in> 搬动缓存子树时从 <div> 翻成 <Page>，insertBefore 崩。
// 不同 query=不同 tabKey=全新实例，故 setup 时快照即正确。
const fullscreenMode = ref(route.query.fullscreen === '1');
const resultFullscreenActive = computed(
  () => leavingFullscreenResult.value || fullscreenMode.value || resultFullscreen.value,
);

function cleanDocLabel(v: any) {
  const s = String(v || '').trim();
  return s && s !== '被审查文档' ? s : '';
}
const auditDocLabel = computed(
  () => cleanDocLabel(result.value?.signFileName) || cleanDocLabel(docFile.value?.name) || '',
);

const nextDisabled = computed(() => {
  if (current.value === 0) return !docFile.value;
  if (current.value === 1) return !standardIds.value.length;
  return false; // 第③步基准值可留空
});

function extOf(name: string) {
  const m = /\.([a-z0-9]+)$/i.exec(name || '');
  return m && m[1] ? m[1].toLowerCase() : 'pdf';
}

async function onStart() {
  submitting.value = true;
  try {
    const id = await toolCreateAndExecute({
      taskName: `工具-内容审查-${docFile.value.name}`,
      taskType: 'CONTENT_AUDIT',
      sourceType: 'AI_TOOL',
      standardIds: standardIds.value,
      formSnapshot: referenceData.value || undefined,
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
    current.value = 3;
    pollOnce();
  } catch (e: any) {
    message.error('提交审查失败：' + (e?.message || e));
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
  leavingFullscreenResult.value = resultFullscreenActive.value;
  router.push('/review/task').catch(() => {
    leavingFullscreenResult.value = false;
  });
}

// 任务列表「查看」带 ?taskId 进来：直接进结果步轮询，成功自动开查看器
onMounted(() => {
  const qid = route.query.taskId;
  if (qid) {
    taskId.value = String(qid);
    resultStatus.value = 'running';
    current.value = 3;
    fromHistory.value = true;
    pollOnce();
  }
});

onBeforeUnmount(stopPoll);
// KeepAlive 缓存本页：切走时停轮询，避免后台 setTimeout 继续写 result/resultStatus/
// resultFullscreen，在已脱离文档的缓存子树上触发 patch。重新激活时若仍在审查中再续轮询。
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
.step-pane :deep(.std-picker),
.step-pane :deep(.ref-editor) {
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
  color: #52c41a;
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
