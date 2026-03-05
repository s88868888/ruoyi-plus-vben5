<template>
  <div class="bid-document-editor">
    <!-- 顶部导航栏 -->
    <div class="editor-header">
      <ABreadcrumb>
        <ABreadcrumbItem>编写配置</ABreadcrumbItem>
        <ABreadcrumbItem>
          <ATag color="blue">标书生成</ATag>
        </ABreadcrumbItem>
        <ABreadcrumbItem>投标校对</ABreadcrumbItem>
        <ABreadcrumbItem>归档下载</ABreadcrumbItem>
      </ABreadcrumb>

      <div class="header-actions">
        <AButton @click="handleBack">
          <LeftOutlined />
          上一步
        </AButton>
        <AButton type="primary" @click="handleNext">
          下一步
          <RightOutlined />
        </AButton>
        <AButton @click="handleReturn">返回项目</AButton>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="editor-content">
      <!-- 左侧目录树 -->
      <div class="chapter-tree-panel">
        <div class="tree-header">
          <span>目录大纲</span>
          <ASpace>
            <AButton size="small" type="link" @click="handleAddChapter">
              <PlusOutlined />
            </AButton>
            <AButton
              size="small"
              type="primary"
              :loading="generating"
              @click="handleGenerateAll"
            >
              <ThunderboltOutlined />
              一键生成
            </AButton>
          </ASpace>
        </div>

        <div class="tree-content">
          <ASpin :spinning="treeLoading">
            <ATree
              :tree-data="chapterTree"
              :selected-keys="selectedKeys"
              :expanded-keys="expandedKeys"
              :field-names="{ title: 'chapterTitle', key: 'id', children: 'children' }"
              @select="handleChapterSelect"
              @expand="handleExpand"
            >
              <template #title="{ chapterTitle, chapterNo, chapterType, generationStatus }">
                <div class="chapter-node">
                  <span class="chapter-title">
                    {{ chapterNo }}. {{ chapterTitle }}
                    <ATag v-if="chapterType === 'template'" color="blue" size="small">模板</ATag>
                  </span>
                  <div class="chapter-actions">
                    <ATooltip title="生成状态">
                      <LoadingOutlined
                        v-if="generationStatus === 'generating'"
                        spin
                        style="color: #1890ff"
                      />
                      <CheckCircleOutlined
                        v-else-if="generationStatus === 'completed'"
                        style="color: #52c41a"
                      />
                      <ClockCircleOutlined
                        v-else
                        style="color: #d9d9d9"
                      />
                    </ATooltip>
                    <ADropdown>
                      <MoreOutlined />
                      <template #overlay>
                        <AMenu>
                          <AMenuItem @click="handleRegenerateChapter">
                            <RedoOutlined />
                            重新生成
                          </AMenuItem>
                          <AMenuItem @click="handleDeleteChapter">
                            <DeleteOutlined />
                            删除章节
                          </AMenuItem>
                        </AMenu>
                      </template>
                    </ADropdown>
                  </div>
                </div>
              </template>
            </ATree>
          </ASpin>
        </div>
      </div>

      <!-- 右侧编辑区 -->
      <div class="chapter-editor-panel">
        <ASpin :spinning="chapterLoading">
          <div v-if="currentChapter" class="editor-main">
            <!-- 章节标题 -->
            <div class="chapter-header">
              <h2>
                {{ currentChapter.chapterNo }}. {{ currentChapter.chapterTitle }}
              </h2>
              <ASpace>
                <AButton
                  v-if="currentChapter.chapterType === 'template'"
                  size="small"
                  :loading="chapterLoading"
                  @click="handleFillTemplate"
                >
                  <ThunderboltOutlined />
                  填充模板
                </AButton>
                <AButton
                  v-else
                  size="small"
                  type="primary"
                  :loading="chapterLoading"
                  @click="handleGenerateChapter"
                >
                  <ThunderboltOutlined />
                  AI生成
                </AButton>
                <AButton size="small" @click="handleSaveChapter">
                  <SaveOutlined />
                  保存
                </AButton>
                <AButton size="small" @click="imagePickerOpen = true">
                  <PictureOutlined />
                  知识库图片
                </AButton>
              </ASpace>
            </div>

            <!-- 原因说明（如果有） -->
            <div
              v-if="currentChapter.reasonDescription"
              class="reason-description"
            >
              <AAlert
                type="info"
                show-icon
                :message="currentChapter.reasonDescription"
              />
            </div>

            <!-- AiEditor 富文本编辑器 -->
            <div class="editor-area">
              <AiEditorComp
                ref="aiEditorRef"
                v-model="currentChapter.chapterContent"
                :height="560"
                :chapter-id="currentChapter?.id"
                placeholder="选择左侧章节查看内容，或点击生成按钮自动生成..."
                @change="handleContentChange"
              />
            </div>

            <!-- 章节信息 -->
            <div class="chapter-info">
              <ASpace>
                <span>
                  <InfoCircleOutlined />
                  章节类型：
                  <ATag v-if="currentChapter.chapterType === 'template'" color="blue">
                    模板章节
                  </ATag>
                  <ATag v-else color="green">AI生成</ATag>
                </span>
                <span v-if="currentChapter.generationStatus === 'completed'">
                  生成时间：{{ formatDate(currentChapter.generationEndTime) }}
                </span>
                <span v-if="currentChapter.aiTokensUsed">
                  Token消耗：{{ currentChapter.aiTokensUsed }}
                </span>
              </ASpace>
            </div>
          </div>

          <AEmpty v-else description="请从左侧选择章节" />
        </ASpin>
      </div>
    </div>

    <!-- 生成进度弹窗 -->
    <AModal
      v-model:open="progressModalOpen"
      title="标书生成进度"
      width="600px"
      :footer="null"
      :mask-closable="false"
    >
      <AProgress :percent="overallProgress" :status="progressStatus" />
      <div class="progress-info">
        <ASpace>
          <ATag color="blue">总章节: {{ totalChapters }}</ATag>
          <ATag color="success">已完成: {{ completedChapters }}</ATag>
          <ATag v-if="failedChapters > 0" color="error">失败: {{ failedChapters }}</ATag>
        </ASpace>
      </div>

      <ADivider />

      <ATimeline style="max-height: 300px; overflow-y: auto; padding: 8px">
        <ATimelineItem
          v-for="(log, idx) in recentLogs"
          :key="idx"
          :color="log.color"
        >
          {{ log.message }}
        </ATimelineItem>
      </ATimeline>
    </AModal>

    <!-- 知识库图片选择弹窗 -->
    <KnowledgeImagePicker
      v-model:open="imagePickerOpen"
      @select="handleInsertKnowledgeImages"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { message } from 'ant-design-vue';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  LoadingOutlined,
  MoreOutlined,
  PictureOutlined,
  PlusOutlined,
  RedoOutlined,
  RightOutlined,
  SaveOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue';
import dayjs from 'dayjs';

import AiEditorComp from '#/components/ai-editor/index.vue';
import KnowledgeImagePicker from '#/components/knowledge-image-picker/index.vue';
import {
  deleteChapter,
  fillTemplate,
  generateChapter,
  getChapterInfo,
  getChapterTree,
  regenerateChapter,
  saveChapterContent,
  type BizSubmissionChapter,
} from '#/api/bid/chapter/index';

const route = useRoute();
const router = useRouter();
const submissionId = Number(route.params.id);
const documentId = route.params.documentId ? Number(route.params.documentId) : undefined;

// 数据
const treeLoading = ref(false);
const chapterLoading = ref(false);
const chapterTree = ref<BizSubmissionChapter[]>([]);
const selectedKeys = ref<number[]>([]);
const expandedKeys = ref<number[]>([]);
const currentChapter = ref<BizSubmissionChapter | null>(null);
const contentChanged = ref(false);

// 知识库图片选择弹窗
const imagePickerOpen = ref(false);
const aiEditorRef = ref<InstanceType<typeof AiEditorComp>>();

// 进度
const generating = ref(false);
const progressModalOpen = ref(false);
const overallProgress = ref(0);
const totalChapters = ref(0);
const completedChapters = ref(0);
const failedChapters = ref(0);
const recentLogs = ref<{ message: string; color: string }[]>([]);

const progressStatus = computed(() => {
  if (failedChapters.value > 0) return 'exception';
  if (overallProgress.value >= 100) return 'success';
  return 'active';
});

// SSE 进度监听
let eventSource: EventSource | null = null;

onMounted(() => {
  loadChapterTree();
});

onUnmounted(() => {
  closeSSE();
});

// ─── 章节树 ────────────────────────────────────────────────────────────────

async function loadChapterTree() {
  treeLoading.value = true;
  try {
    const params: any = {};
    if (submissionId) params.submissionId = String(submissionId);
    if (documentId) params.documentId = String(documentId);

    const res = await getChapterTree(params);
    chapterTree.value = res as BizSubmissionChapter[];

    if (chapterTree.value.length > 0) {
      const firstId = chapterTree.value[0].id!;
      selectedKeys.value = [firstId];
      expandedKeys.value = [firstId];
      await loadChapterContent(firstId);
    }
  } catch (error) {
    console.error('加载章节树失败:', error);
  } finally {
    treeLoading.value = false;
  }
}

function handleChapterSelect(keys: number[]) {
  if (keys.length > 0) {
    selectedKeys.value = keys;
    loadChapterContent(keys[0]);
  }
}

/** 手风琴模式：同级只保留一个展开节点 */
function handleExpand(keys: number[], { expanded, node }: { expanded: boolean; node: any }) {
  if (!expanded) {
    // 折叠：直接移除
    expandedKeys.value = keys;
    return;
  }
  // 展开：找到同级兄弟节点，仅保留当前节点
  const nodeId = node.id ?? node.key;
  const parentChildren = findSiblings(chapterTree.value, nodeId);
  const siblingIds = new Set(parentChildren.map((c: any) => c.id));
  // 移除同级其他节点（保留不同层级的展开状态）
  expandedKeys.value = keys.filter((k) => !siblingIds.has(k) || k === nodeId);
}

/** 在树中查找目标节点的同级节点列表 */
function findSiblings(nodes: BizSubmissionChapter[], targetId: number): BizSubmissionChapter[] {
  for (const node of nodes) {
    if (node.id === targetId) return nodes;
    if (node.children?.length) {
      const found = findSiblings(node.children, targetId);
      if (found.length > 0) return found;
    }
  }
  return [];
}

async function loadChapterContent(chapterId: number) {
  chapterLoading.value = true;
  try {
    const res = await getChapterInfo(String(chapterId));
    currentChapter.value = res as BizSubmissionChapter;
    contentChanged.value = false;
  } catch (error) {
    console.error('加载章节内容失败:', error);
  } finally {
    chapterLoading.value = false;
  }
}

// ─── 章节操作 ───────────────────────────────────────────────────────────────

async function handleGenerateChapter() {
  if (!currentChapter.value?.id) return;
  chapterLoading.value = true;
  try {
    await generateChapter(String(currentChapter.value.id));
    message.success('章节生成成功');
    await loadChapterContent(currentChapter.value.id);
    await loadChapterTree();
  } catch {
    message.error('章节生成失败');
  } finally {
    chapterLoading.value = false;
  }
}

async function handleFillTemplate() {
  if (!currentChapter.value?.id) return;
  chapterLoading.value = true;
  try {
    await fillTemplate(String(currentChapter.value.id));
    message.success('模板填充成功');
    await loadChapterContent(currentChapter.value.id);
  } catch {
    message.error('填充失败');
  } finally {
    chapterLoading.value = false;
  }
}

async function handleSaveChapter() {
  if (!currentChapter.value?.id) return;
  try {
    await saveChapterContent(
      String(currentChapter.value.id),
      currentChapter.value.chapterContent ?? '',
    );
    message.success('保存成功');
    contentChanged.value = false;
  } catch {
    message.error('保存失败');
  }
}

async function handleRegenerateChapter() {
  if (!currentChapter.value?.id) return;
  chapterLoading.value = true;
  try {
    await regenerateChapter(String(currentChapter.value.id));
    message.success('重新生成成功');
    await loadChapterContent(currentChapter.value.id);
    await loadChapterTree();
  } catch {
    message.error('重新生成失败');
  } finally {
    chapterLoading.value = false;
  }
}

async function handleDeleteChapter() {
  if (!currentChapter.value?.id) return;
  try {
    await deleteChapter(String(currentChapter.value.id));
    message.success('删除成功');
    currentChapter.value = null;
    await loadChapterTree();
  } catch {
    message.error('删除失败');
  }
}

function handleContentChange(val: string) {
  if (currentChapter.value) {
    currentChapter.value.chapterContent = val;
    contentChanged.value = true;
  }
}

/** 插入知识库图片到编辑器 */
function handleInsertKnowledgeImages(urls: string[]) {
  if (!aiEditorRef.value) return;
  const html = urls.map(url =>
    `<div class="chapter-image" style="text-align:center;margin:16px 0;"><img src="${url}" alt="知识库图片" style="max-width:80%;border:1px solid #eee;border-radius:4px;" /><p style="color:#666;font-size:12px;margin-top:4px;">图：知识库图片</p></div>`
  ).join('');
  aiEditorRef.value.insertHtml(html);
  contentChanged.value = true;
}

// ─── 一键生成（SSE 进度） ──────────────────────────────────────────────────

async function handleGenerateAll() {
  generating.value = true;
  progressModalOpen.value = true;
  overallProgress.value = 0;
  completedChapters.value = 0;
  failedChapters.value = 0;
  recentLogs.value = [];

  // 启动 SSE 监听
  startSSE(submissionId);

  try {
    // 调用后端触发生成（假设 submission 的 step2/generateContent 接口）
    const { requestClient } = await import('#/api/request');
    await requestClient.post(`/bid/submission/${submissionId}/step2/generateContent`);
    message.success('已触发生成，请关注进度...');
  } catch (error) {
    console.error('触发生成失败:', error);
    message.error('触发生成失败');
    generating.value = false;
    closeSSE();
  }
}

function startSSE(id: number) {
  closeSSE();
  const url = `/resource/bid/submission/generation/progress/stream/${id}`;
  eventSource = new EventSource(url);

  eventSource.addEventListener('progress', (e) => {
    try {
      const data = JSON.parse(e.data);
      overallProgress.value = data.overallProgress ?? overallProgress.value;

      if (data.chapterStatus === 'completed') completedChapters.value++;
      if (data.chapterStatus === 'failed') failedChapters.value++;

      recentLogs.value.unshift({
        message: `${data.chapterTitle ?? ''} - ${getStatusText(data.chapterStatus)}`,
        color: data.chapterStatus === 'failed' ? 'red' : 'green',
      });
      if (recentLogs.value.length > 20) recentLogs.value.pop();

      // 刷新章节树状态
      loadChapterTree();
    } catch {
      // ignore parse errors
    }
  });

  eventSource.addEventListener('complete', () => {
    overallProgress.value = 100;
    generating.value = false;
    message.success('标书生成完成！');
    closeSSE();
    loadChapterTree();
  });

  eventSource.addEventListener('error', (e: any) => {
    try {
      const data = JSON.parse(e.data);
      message.error('生成失败：' + (data.error ?? '未知错误'));
    } catch {
      // ignore
    }
    generating.value = false;
    closeSSE();
  });

  eventSource.onerror = () => {
    // 连接断开后降级为轮询
    closeSSE();
    if (generating.value) {
      setTimeout(() => pollProgress(id), 5000);
    }
  };
}

function closeSSE() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

async function pollProgress(id: number) {
  if (!generating.value) return;
  try {
    const { requestClient } = await import('#/api/request');
    const res: any = await requestClient.get(`/bid/submission/${id}/progress`);
    overallProgress.value = res.overallProgress ?? 0;
    if (res.submissionStatus === 'completed' || res.submissionStatus === 'failed') {
      generating.value = false;
      if (res.submissionStatus === 'completed') message.success('标书生成完成！');
      else message.error('生成失败');
      await loadChapterTree();
    } else {
      setTimeout(() => pollProgress(id), 3000);
    }
  } catch {
    setTimeout(() => pollProgress(id), 5000);
  }
}

// ─── 工具方法 ──────────────────────────────────────────────────────────────

function formatDate(date?: string | Date) {
  if (!date) return '';
  return dayjs(date).format('YYYY-MM-DD HH:mm');
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    pending: '待生成',
    generating: '生成中',
    completed: '已完成',
    failed: '失败',
  };
  return map[status] ?? status;
}

// ─── 导航 ──────────────────────────────────────────────────────────────────

function handleBack() {
  router.back();
}

function handleNext() {
  message.info('下一步');
}

function handleReturn() {
  router.push({ name: 'BidSubmissionList' });
}

function handleAddChapter() {
  message.info('添加章节功能开发中');
}
</script>

<style scoped lang="less">
.bid-document-editor {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background: #fff;
    border-bottom: 1px solid #e8e8e8;

    .header-actions {
      display: flex;
      gap: 8px;
    }
  }

  .editor-content {
    flex: 1;
    display: flex;
    overflow: hidden;

    .chapter-tree-panel {
      width: 300px;
      background: #fff;
      border-right: 1px solid #e8e8e8;
      display: flex;
      flex-direction: column;

      .tree-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #e8e8e8;
        font-weight: 500;
      }

      .tree-content {
        flex: 1;
        overflow-y: auto;
        padding: 8px;

        .chapter-node {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;

          .chapter-title {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .chapter-actions {
            display: flex;
            gap: 8px;
            opacity: 0;
            transition: opacity 0.2s;
            flex-shrink: 0;
          }

          &:hover .chapter-actions {
            opacity: 1;
          }
        }
      }
    }

    .chapter-editor-panel {
      flex: 1;
      background: #fff;
      overflow-y: auto;

      .editor-main {
        padding: 24px;

        .chapter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;

          h2 {
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
          }
        }

        .reason-description {
          margin-bottom: 16px;
        }

        .editor-area {
          margin-bottom: 16px;
        }

        .chapter-info {
          padding: 12px;
          background: #fafafa;
          border-radius: 4px;
          font-size: 12px;
          color: #666;
        }
      }
    }
  }

  .progress-info {
    margin-top: 16px;
    text-align: center;
  }
}
</style>
