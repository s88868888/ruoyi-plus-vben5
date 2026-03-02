<script setup lang="ts">
import { h, onMounted, onUnmounted, ref } from 'vue';
import { Button, message, Progress, Tree, Dropdown, Menu, MenuItem, Modal, Drawer, Input, Form, FormItem } from 'ant-design-vue';
import {
  FileTextOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  EllipsisOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  EditOutlined,
  SyncOutlined,
  PlusOutlined
} from '@ant-design/icons-vue';
import {
  getChapterTree,
  generateChapterStructure,
  regenerateChapterStructure,
  type BizSubmissionChapter
} from '#/api/bid/chapter';

interface Props {
  submissionId: string;
  documentConfigId?: string; // 文档配置ID，用于生成章节
}

const props = defineProps<Props>();
const emit = defineEmits(['structure-generated', 'next', 'back']);

const loading = ref(false);
const generating = ref(false);
const generatingProgress = ref(0);
const generatingMessage = ref('');

// SSE 连接
let eventSource: EventSource | null = null;

// 章节树数据
const chapterTree = ref<BizSubmissionChapter[]>([]);
const expandedKeys = ref<string[]>([]);
const selectedKeys = ref<string[]>([]);

// 当前选中的章节
const currentChapter = ref<BizSubmissionChapter | null>(null);

// 抽屉状态
const showReasonDrawer = ref(false);
const showEditDrawer = ref(false);
const reasonChapter = ref<BizSubmissionChapter | null>(null);
const editChapter = ref<BizSubmissionChapter | null>(null);

// 新建章节弹窗
const showAddChapterModal = ref(false);
const addChapterForm = ref({
  chapterTitle: '',
  chapterType: 'generate'
});

onMounted(() => {
  loadChapterTree();
  connectSSE();
});

onUnmounted(() => {
  disconnectSSE();
});

// 连接SSE
function connectSSE() {
  const token = localStorage.getItem('token') || '';
  eventSource = new EventSource(`/api/resource/sse`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleSseMessage(data);
    } catch (error) {
      console.error('解析SSE消息失败:', error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('SSE连接错误:', error);
  };
}

// 断开SSE
function disconnectSSE() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

// 处理SSE消息
function handleSseMessage(data: any) {
  const { type, message: msg, progress, data: resultData } = data;

  switch (type) {
    case 'start':
      generating.value = true;
      generatingProgress.value = 0;
      generatingMessage.value = msg;
      break;
    case 'progress':
      generatingProgress.value = progress;
      generatingMessage.value = msg;
      break;
    case 'success':
      generating.value = false;
      generatingProgress.value = 100;
      generatingMessage.value = '章节结构生成完成';
      // 只显示一次成功消息，不显示JSON数据
      message.success('章节结构生成完成');
      // 重新加载章节树
      loadChapterTree();
      break;
    case 'error':
      generating.value = false;
      generatingMessage.value = msg;
      message.error(msg);
      break;
  }
}

// 加载章节树
async function loadChapterTree() {
  loading.value = true;
  try {
    const res = await getChapterTree({
      submissionId: props.submissionId,
      documentId: props.documentConfigId
    });
    chapterTree.value = res || [];

    // 通知父组件章节结构已生成
    if (chapterTree.value.length > 0) {
      emit('structure-generated', chapterTree.value);
    }
  } catch (error) {
    console.error('加载章节树失败:', error);
    message.error('加载章节树失败');
  } finally {
    loading.value = false;
  }
}

// AI 生成章节结构
async function handleAIGenerate() {
  if (!props.documentConfigId) {
    message.warning('缺少文档配置信息，无法生成章节');
    return;
  }

  generating.value = true;
  generatingProgress.value = 0;
  generatingMessage.value = '正在启动AI生成...';

  try {
    await generateChapterStructure({
      submissionId: props.submissionId,
      documentConfigId: props.documentConfigId
    });
    // 不需要处理返回值，通过SSE接收进度和结果
  } catch (error) {
    console.error('AI 生成失败:', error);
    message.error('AI 生成失败');
    generating.value = false;
  }
}

// 重新生成章节结构
async function handleRegenerate() {
  if (!props.documentConfigId) {
    message.warning('缺少文档配置信息，无法重新生成章节');
    return;
  }

  generating.value = true;
  generatingProgress.value = 0;
  generatingMessage.value = '正在启动AI重新生成...';

  try {
    await regenerateChapterStructure({
      submissionId: props.submissionId,
      documentConfigId: props.documentConfigId
    });
    // 不需要处理返回值，通过SSE接收进度和结果
  } catch (error) {
    console.error('重新生成失败:', error);
    message.error('重新生成失败');
    generating.value = false;
  }
}

// 手动新建章节
function handleAddChapter() {
  showAddChapterModal.value = true;
}

// 确认新建章节
function handleAddChapterOk() {
  if (!addChapterForm.value.chapterTitle) {
    message.warning('请输入章节标题');
    return;
  }
  // TODO: 调用后端接口新建章节
  message.success('章节创建成功');
  showAddChapterModal.value = false;
  addChapterForm.value = {
    chapterTitle: '',
    chapterType: 'generate'
  };
}

// 取消新建章节
function handleAddChapterCancel() {
  showAddChapterModal.value = false;
  addChapterForm.value = {
    chapterTitle: '',
    chapterType: 'generate'
  };
}

// 树节点选择
function handleTreeSelect(keys: string[], info: any) {
  if (keys.length > 0) {
    selectedKeys.value = keys;
    currentChapter.value = info.node;
  }
}

// 下一步
function handleNext() {
  if (chapterTree.value.length === 0) {
    message.warning('请先生成章节结构');
    return;
  }
  emit('next');
}

// 返回
function handleBack() {
  emit('back');
}

// 树节点拖拽
function handleTreeDrop(info: any) {
  console.log('拖拽节点:', info);
  // TODO: 调用后端接口更新章节顺序
  message.success('章节顺序已更新');
}

// 显示生成说明
function showReasonDescription(chapter: BizSubmissionChapter) {
  reasonChapter.value = chapter;
  showReasonDrawer.value = true;
}

// 编辑章节
function editChapterContent(chapter: BizSubmissionChapter) {
  editChapter.value = chapter;
  showEditDrawer.value = true;
}

// 生成章节内容
function generateChapterContent(chapter: BizSubmissionChapter) {
  message.info(`开始生成章节: ${chapter.chapterTitle}`);
  // TODO: 调用后端接口生成章节内容
}

</script>

<template>
  <div class="step2-generate">
    <!-- 左侧章节树 -->
    <div class="chapter-sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">章节目录</span>
        <div class="sidebar-actions">
          <Button type="text" size="small" :icon="h(PlusOutlined)" @click="handleAddChapter" title="新建章节" />
          <Dropdown placement="bottomRight">
            <Button type="text" size="small" :icon="h(EllipsisOutlined)" />
            <template #overlay>
              <Menu>
                <MenuItem key="ai-generate" @click="handleAIGenerate">
                  <ThunderboltOutlined />
                  AI 一键生成
                </MenuItem>
                <MenuItem key="regenerate" @click="handleRegenerate">
                  <ReloadOutlined />
                  重新生成
                </MenuItem>
              </Menu>
            </template>
          </Dropdown>
        </div>
      </div>

      <div class="sidebar-content">
        <div v-if="loading" class="loading-state">
          <span>加载中...</span>
        </div>
        <div v-else-if="generating" class="generating-state">
          <ThunderboltOutlined class="generating-icon" />
          <p class="generating-text">{{ generatingMessage }}</p>
          <Progress :percent="generatingProgress" :show-info="true" />
        </div>
        <div v-else-if="chapterTree.length === 0" class="empty-state">
          <FileTextOutlined class="empty-icon" />
          <p class="empty-text">暂无章节</p>
          <Button type="primary" size="small" @click="handleAIGenerate">
            <ThunderboltOutlined />
            AI 生成章节
          </Button>
        </div>
        <Tree
          v-else
          v-model:expanded-keys="expandedKeys"
          v-model:selected-keys="selectedKeys"
          :tree-data="chapterTree"
          :field-names="{ title: 'chapterTitle', key: 'id', children: 'children' }"
          draggable
          show-line
          @select="handleTreeSelect"
          @drop="handleTreeDrop"
        >
          <template #title="node">
            <div class="tree-node-wrapper">
              <span class="tree-node-title">
                <span class="chapter-no">{{ node.chapterNo }}</span>
                {{ node.chapterTitle }}
              </span>
              <div class="tree-node-actions" @click.stop>
                <Button
                  v-if="node.generationStatus === 'pending' || !node.generationStatus"
                  type="text"
                  size="small"
                  :icon="h(SyncOutlined)"
                  title="生成状态"
                  @click="generateChapterContent(node)"
                />
                <Button
                  v-if="node.reasonDescription"
                  type="text"
                  size="small"
                  :icon="h(InfoCircleOutlined)"
                  title="生成说明"
                  @click="showReasonDescription(node)"
                />
                <Button
                  type="text"
                  size="small"
                  :icon="h(EditOutlined)"
                  title="编辑章节"
                  @click="editChapterContent(node)"
                />
              </div>
            </div>
          </template>
        </Tree>
      </div>
    </div>

    <!-- 右侧内容区 -->
    <div class="content-main">
      <div class="content-header">
        <div class="header-left">
          <h3 v-if="currentChapter">{{ currentChapter.title }}</h3>
          <h3 v-else>标书内容生成</h3>
        </div>
        <div class="header-actions">
          <Button @click="handleBack">返回</Button>
          <Button type="primary" @click="handleNext">下一步</Button>
        </div>
      </div>

      <div class="content-body">
        <div v-if="currentChapter" class="chapter-detail">
          <div class="chapter-meta">
            <span>章节编号: {{ currentChapter.chapterNo }}</span>
            <span>层级: {{ currentChapter.chapterLevel }}</span>
            <span>状态: {{ currentChapter.generationStatus || '待生成' }}</span>
          </div>

          <!-- 显示生成说明 -->
          <div v-if="currentChapter.reasonDescription" class="chapter-reason">
            <div class="reason-title">生成说明</div>
            <div class="reason-content">{{ currentChapter.reasonDescription }}</div>
          </div>

          <div class="chapter-content">
            <div v-if="currentChapter.chapterContent" class="content-preview">
              {{ currentChapter.chapterContent }}
            </div>
            <div v-else class="content-empty">
              <p>该章节内容尚未生成</p>
              <Button type="primary">生成此章节</Button>
            </div>
          </div>
        </div>
        <div v-else class="welcome-state">
          <FileTextOutlined class="welcome-icon" />
          <p class="welcome-text">请从左侧选择章节查看内容</p>
          <p class="welcome-hint">或使用 AI 一键生成章节结构</p>
        </div>
      </div>
    </div>

    <!-- 生成说明抽屉 -->
    <Drawer
      v-model:open="showReasonDrawer"
      title="生成说明"
      placement="right"
      :width="480"
    >
      <div v-if="reasonChapter" class="reason-drawer-content">
        <div class="reason-chapter-info">
          <h4>{{ reasonChapter.chapterNo }} {{ reasonChapter.chapterTitle }}</h4>
        </div>
        <div class="reason-description">
          {{ reasonChapter.reasonDescription }}
        </div>
      </div>
    </Drawer>

    <!-- 编辑章节抽屉 -->
    <Drawer
      v-model:open="showEditDrawer"
      title="编辑章节"
      placement="right"
      :width="600"
    >
      <div v-if="editChapter" class="edit-drawer-content">
        <div class="edit-chapter-info">
          <h4>{{ editChapter.chapterNo }} {{ editChapter.chapterTitle }}</h4>
        </div>
        <div class="edit-form">
          <!-- TODO: 添加编辑表单 -->
          <p>编辑功能开发中...</p>
        </div>
      </div>
    </Drawer>

    <!-- 新建章节弹窗 -->
    <Modal
      v-model:open="showAddChapterModal"
      title="新建章节"
      @ok="handleAddChapterOk"
      @cancel="handleAddChapterCancel"
    >
      <Form layout="vertical">
        <FormItem label="章节标题" required>
          <Input v-model:value="addChapterForm.chapterTitle" placeholder="请输入章节标题" />
        </FormItem>
        <FormItem label="章节类型">
          <Input v-model:value="addChapterForm.chapterType" placeholder="章节类型" disabled />
        </FormItem>
      </Form>
    </Modal>
  </div>
</template>

<style scoped lang="less">
.step2-generate {
  display: flex;
  height: 100%;
  gap: 16px;
  padding: 10px 16px 16px 16px;

  // 左侧章节树
  .chapter-sidebar {
    width: 420px;
    background: #fff;
    border: 1px solid #d8d8d8;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid #f0f0f0;

      .sidebar-title {
        font-size: 15px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.88);
      }

      .sidebar-actions {
        display: flex;
        gap: 4px;
      }
    }

    .sidebar-content {
      flex: 1;
      overflow-y: auto;
      padding: 12px;

      .loading-state {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        color: #999;
      }

      .generating-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;

        .generating-icon {
          font-size: 48px;
          color: #1890ff;
          margin-bottom: 16px;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .generating-text {
          color: #1890ff;
          margin-bottom: 16px;
          font-size: 14px;
          font-weight: 500;
        }

        :deep(.ant-progress) {
          width: 100%;
          max-width: 240px;
        }
      }

      @keyframes pulse {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.6;
          transform: scale(1.1);
        }
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;

        .empty-icon {
          font-size: 48px;
          color: #d9d9d9;
          margin-bottom: 16px;
        }

        .empty-text {
          color: #999;
          margin-bottom: 16px;
          font-size: 14px;
        }
      }

      :deep(.ant-tree) {
        background: transparent;

        .ant-tree-treenode {
          padding: 4px 0;
        }

        .ant-tree-node-content-wrapper {
          border-radius: 6px;
          padding: 4px 8px;
          transition: all 0.2s;
          width: 100%;

          &:hover {
            background: #f5f5f5;
          }
        }

        .ant-tree-node-selected {
          .ant-tree-node-content-wrapper {
            background: #e6f4ff !important;
          }
        }

        .tree-node-wrapper {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 8px;

          .tree-node-title {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            overflow: hidden;

            .chapter-no {
              color: #1890ff;
              font-weight: 500;
              flex-shrink: 0;
            }
          }

          .tree-node-actions {
            display: flex;
            gap: 2px;
            transition: opacity 0.2s;

            .ant-btn {
              padding: 0 4px;
              height: 24px;

              &:hover {
                color: #1890ff;
                background: #e6f4ff;
              }
            }
          }
        }
      }
    }
  }

  // 右侧内容区
  .content-main {
    flex: 1;
    background: #fff;
    border: 1px solid #d8d8d8;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .content-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      border-bottom: 1px solid #f0f0f0;

      .header-left {
        h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: rgba(0, 0, 0, 0.88);
        }
      }

      .header-actions {
        display: flex;
        gap: 8px;
      }
    }

    .content-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;

      .chapter-detail {
        .chapter-meta {
          display: flex;
          gap: 24px;
          padding: 16px;
          background: #fafafa;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 14px;
          color: #666;
        }

        .chapter-reason {
          margin-bottom: 24px;
          padding: 16px;
          background: #f0f7ff;
          border-left: 4px solid #1890ff;
          border-radius: 4px;

          .reason-title {
            font-size: 14px;
            font-weight: 600;
            color: #1890ff;
            margin-bottom: 8px;
          }

          .reason-content {
            font-size: 14px;
            line-height: 1.8;
            color: rgba(0, 0, 0, 0.88);
          }
        }

        .chapter-content {
          .content-preview {
            padding: 20px;
            background: #fafafa;
            border-radius: 8px;
            line-height: 1.8;
            font-size: 14px;
            color: rgba(0, 0, 0, 0.88);
            white-space: pre-wrap;
            word-break: break-word;
          }

          .content-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 20px;
            text-align: center;

            p {
              color: #999;
              margin-bottom: 16px;
              font-size: 14px;
            }
          }
        }
      }

      .welcome-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;

        .welcome-icon {
          font-size: 64px;
          color: #d9d9d9;
          margin-bottom: 24px;
        }

        .welcome-text {
          font-size: 16px;
          color: #666;
          margin-bottom: 8px;
        }

        .welcome-hint {
          font-size: 14px;
          color: #999;
        }
      }
    }
  }

  // 抽屉样式
  .reason-drawer-content {
    .reason-chapter-info {
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #f0f0f0;

      h4 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.88);
      }
    }

    .reason-description {
      font-size: 14px;
      line-height: 1.8;
      color: rgba(0, 0, 0, 0.65);
      white-space: pre-wrap;
    }
  }

  .edit-drawer-content {
    .edit-chapter-info {
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #f0f0f0;

      h4 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.88);
      }
    }

    .edit-form {
      font-size: 14px;
      color: rgba(0, 0, 0, 0.65);
    }
  }
}
</style>
