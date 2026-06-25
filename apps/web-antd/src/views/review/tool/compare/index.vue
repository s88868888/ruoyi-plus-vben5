<!--
  附件对比向导（独立工具）。步骤：①上传基准文件 ②上传对比文件 ③选择规则(开始比对) ④比对结果
  ③点「开始比对」→ toolCreateAndExecute(taskType=BCXY_COMPARE) → 进第④步轮询 getToolResult。
  出 SUCCESS → 「查看结果」打开附件对比查看器(全屏 Drawer)。
-->
<template>
  <div v-if="resultFullscreenActive" class="tool-result-fullscreen">
    <FileDiffViewer
      v-if="resultStatus === 'success' && result"
      :source-a-url="result.printPdfUrl || ''"
      :source-b-url="result.signFileUrl || ''"
      :source-a-searchable-url="result.printSearchableUrl || ''"
      :source-b-searchable-url="result.signSearchableUrl || ''"
      :source-b-oss-id="result.signOssId || null"
      :source-b-ocr-status="result.signOcrStatus || ''"
      source-a-label="基准文件"
      source-b-label="对比文件"
      :ai-review="result"
      @close="closeResultFullscreen"
    />
    <div v-else class="tool-result-state">
      <div v-if="resultStatus === 'running'" class="result-loading">
        <LoadingOutlined spin class="rl-spin" />
        <div class="rl-title">AI 正在比对中…</div>
        <div class="rl-sub">每 5 秒自动刷新一次，您也可以立即刷新</div>
        <Button type="link" :loading="checking" class="rl-now" @click="checkNow">
          立即刷新
        </Button>
      </div>
      <Result
        v-else
        status="error"
        title="比对失败"
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
        finish-text="开始比对"
        :show-restart="true"
        restart-text="返回审核任务列表"
        @finish="onStart"
        @restart="goList"
      >
        <template #default="{ current: cur }">
          <div v-show="cur === 0" class="step-pane">
            <div class="pane-tip">上传作为「标准/基准」的文件（如范本、模板生成件）</div>
            <SingleFileUpload v-model="baseFile" tip="上传基准文件" />
          </div>

          <div v-show="cur === 1" class="step-pane">
            <div class="pane-tip">上传需要与基准比对的「对比文件」（如线下回传、签字件）</div>
            <SingleFileUpload v-model="compareFile" tip="上传对比文件" />
          </div>

          <div v-show="cur === 2" class="step-pane">
            <div class="pane-tip">选择本次比对使用的审核标准（规则），可多选并预览</div>
            <StandardPicker v-model="standardIds" />
          </div>

          <div v-show="cur === 3" class="step-pane result-pane">
            <div v-if="resultStatus === 'running'" class="result-loading">
              <LoadingOutlined spin class="rl-spin" />
              <div class="rl-title">AI 正在比对中…</div>
              <div class="rl-sub">每 5 秒自动刷新一次，您也可以先返回任务列表稍后查看</div>
              <Button type="link" :loading="checking" class="rl-now" @click="checkNow">
                立即刷新
              </Button>
            </div>
            <Result
              v-else-if="resultStatus === 'success'"
              status="success"
              title="比对完成"
              sub-title="AI 已完成附件对比，可查看差异结果"
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
              title="比对失败"
              :sub-title="resultError || 'AI 审核执行失败，请稍后在审核任务列表重试'"
            />
          </div>
        </template>
      </ReviewWizard>
    </Card>

    <!-- 附件对比查看器（全屏 Drawer） -->
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
// @ts-expect-error 查看器为忠实移植的纯 JS SFC（含 pdfjs/canvas 复杂逻辑），不暴露 TS 类型
import FileDiffViewer from '../components/FileDiffViewer.vue';
import { getToolResult, toolCreateAndExecute } from '#/api/review/tool';
import type { ReviewToolResult } from '#/api/review/tool/model';

const router = useRouter();
const route = useRoute();

const steps = [
  { title: '上传基准文件' },
  { title: '上传对比文件' },
  { title: '选择规则' },
  { title: '比对结果' },
];

const wizardCardBodyStyle: CSSProperties = {
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minHeight: 0,
  padding: '32px 24px 24px',
};

const current = ref(0);
const baseFile = ref<any>(null);
const standardIds = ref<any[]>([]);
const compareFile = ref<any>(null);
const submitting = ref(false);

const taskId = ref<any>('');
const result = ref<ReviewToolResult | null>(null);
const resultStatus = ref<'running' | 'success' | 'fail'>('running');
const resultError = ref('');
const checking = ref(false);
const resultFullscreen = ref(false);
// 从任务列表「查看」带 taskId 进来：直接看历史结果，成功后自动打开查看器
const fromHistory = ref(false);
// 快照读取，不用 computed(route.query)：fullscreen 由进入本 tab 的导航决定，tab 存活期间
// 不该随路由变。若依赖 route.query，切走 tab 时 route 变→本(被 KeepAlive 缓存的)组件重渲→
// 根元素在 <Transition out-in> 搬动缓存子树时从 <div> 翻成 <Page>，insertBefore 崩。
// 不同 query=不同 tabKey=全新实例，故 setup 时快照即正确。
const fullscreenMode = ref(route.query.fullscreen === '1');
const resultFullscreenActive = computed(() => fullscreenMode.value || resultFullscreen.value);

const nextDisabled = computed(() => {
  if (current.value === 0) return !baseFile.value;
  if (current.value === 1) return !compareFile.value;
  if (current.value === 2) return !standardIds.value.length;
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
      taskName: `工具-附件对比-${baseFile.value.name} ↔ ${compareFile.value.name}`,
      taskType: 'BCXY_COMPARE',
      sourceType: 'AI_TOOL',
      standardIds: standardIds.value,
      files: [
        {
          ossId: baseFile.value.ossId,
          fileName: baseFile.value.name,
          fileType: extOf(baseFile.value.name),
          filePath: baseFile.value.url,
        },
        {
          ossId: compareFile.value.ossId,
          fileName: compareFile.value.name,
          fileType: extOf(compareFile.value.name),
          filePath: compareFile.value.url,
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
    message.error('提交比对失败：' + (e?.message || e));
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

function goList() {
  stopPoll();
  router.push('/review/task');
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
// resultFullscreen，在已脱离文档的缓存子树上触发 patch。重新激活时若仍在比对中再续轮询。
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
.tool-result-fullscreen :deep(.file-diff-viewer) {
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
.step-pane :deep(.std-picker) {
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
