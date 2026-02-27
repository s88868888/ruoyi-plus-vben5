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

    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <ASpace>
        <AButton size="small" @click="handleBold">
          <BoldOutlined />
        </AButton>
        <AButton size="small" @click="handleItalic">
          <ItalicOutlined />
        </AButton>
        <AButton size="small" @click="handleUnderline">
          <UnderlineOutlined />
        </AButton>
        <ADivider type="vertical" />
        <AButton size="small" @click="handleOrderedList">
          <OrderedListOutlined />
        </AButton>
        <AButton size="small" @click="handleUnorderedList">
          <UnorderedListOutlined />
        </AButton>
      </ASpace>

      <ASpace>
        <AButton size="small">
          <PaperClipOutlined />
          附件
          <ABadge :count="attachmentCount" />
        </AButton>
        <AButton size="small">
          <BookOutlined />
          知识库
        </AButton>
        <AButton size="small" danger>
          <WarningOutlined />
          预警
          <ABadge :count="warningCount" />
        </AButton>
      </ASpace>
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
            <AButton size="small" type="link" @click="handleGenerateAll">
              <ThunderboltOutlined />
              一键生成
            </AButton>
          </ASpace>
        </div>

        <div class="tree-content">
          <ATree
            :tree-data="chapterTree"
            :selected-keys="selectedKeys"
            :field-names="{ title: 'title', key: 'id', children: 'children' }"
            @select="handleChapterSelect"
          >
            <template #title="{ title, chapterNo, score, generationStatus }">
              <div class="chapter-node">
                <span class="chapter-title">
                  {{ chapterNo }}. {{ title }}
                  <ATag v-if="score" color="orange" size="small">
                    {{ score }}分
                  </ATag>
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
        </div>
      </div>

      <!-- 右侧编辑区 -->
      <div class="chapter-editor-panel">
        <ASpin :spinning="loading">
          <div v-if="currentChapter" class="editor-main">
            <!-- 章节标题 -->
            <div class="chapter-header">
              <h2>
                {{ currentChapter.chapterNo }}. {{ currentChapter.title }}
                <ATag v-if="currentChapter.score" color="orange">
                  {{ currentChapter.score }}分
                </ATag>
              </h2>
              <ASpace>
                <AButton
                  v-if="currentChapter.chapterType === 'template'"
                  size="small"
                  @click="handleFillTemplate"
                >
                  <ThunderboltOutlined />
                  填充模板
                </AButton>
                <AButton
                  v-else
                  size="small"
                  type="primary"
                  @click="handleGenerateChapter"
                >
                  <ThunderboltOutlined />
                  AI生成
                </AButton>
                <AButton size="small" @click="handleSaveChapter">
                  <SaveOutlined />
                  保存
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

            <!-- 富文本编辑器 -->
            <div class="editor-area">
              <ATextarea
                v-model:value="currentChapter.content"
                :rows="20"
                placeholder="请输入章节内容，或点击"AI生成"按钮自动生成..."
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
      width="700px"
      :footer="null"
    >
      <AProgress :percent="overallProgress" :status="progressStatus" />
      <div class="progress-info">
        <ASpace>
          <ATag color="blue">总计: {{ totalChapters }}</ATag>
          <ATag color="success">已完成: {{ completedChapters }}</ATag>
          <ATag v-if="failedChapters" color="error">
            失败: {{ failedChapters }}
          </ATag>
        </ASpace>
      </div>

      <ADivider />

      <AList :data-source="chapterProgress" size="small">
        <template #renderItem="{ item }">
          <AListItem>
            <AListItemMeta>
              <template #title>
                {{ item.chapterNo }}. {{ item.title }}
              </template>
              <template #description>
                <AProgress
                  :percent="item.progress"
                  :status="getProgressStatus(item.status)"
                  size="small"
                />
              </template>
            </AListItemMeta>
            <template #actions>
              <ATag :color="getStatusColor(item.status)">
                {{ getStatusText(item.status) }}
              </ATag>
            </template>
          </AListItem>
        </template>
      </AList>
    </AModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { message } from 'ant-design-vue';
import {
  LeftOutlined,
  RightOutlined,
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  PaperClipOutlined,
  BookOutlined,
  WarningOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  MoreOutlined,
  RedoOutlined,
  DeleteOutlined,
  SaveOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons-vue';
import dayjs from 'dayjs';

const route = useRoute();
const submissionId = ref(Number(route.params.id));
const documentId = ref(Number(route.params.documentId));

// 数据
const loading = ref(false);
const chapterTree = ref<any[]>([]);
const selectedKeys = ref<number[]>([]);
const currentChapter = ref<any>(null);
const attachmentCount = ref(3);
const warningCount = ref(3);

// 进度相关
const progressModalOpen = ref(false);
const overallProgress = ref(0);
const totalChapters = ref(0);
const completedChapters = ref(0);
const failedChapters = ref(0);
const chapterProgress = ref<any[]>([]);
const progressStatus = computed(() => {
  if (failedChapters.value > 0) return 'exception';
  if (completedChapters.value === totalChapters.value) return 'success';
  return 'active';
});

onMounted(() => {
  loadChapterTree();
});

// 加载章节树
async function loadChapterTree() {
  loading.value = true;
  try {
    // TODO: 调用API加载章节树
    // const res = await submissionChapterTree({ documentId: documentId.value });
    // chapterTree.value = res;

    // 模拟数据
    chapterTree.value = [
      {
        id: 1,
        chapterNo: '一',
        title: '投标函',
        chapterType: 'template',
        generationStatus: 'completed',
        children: [],
      },
      {
        id: 2,
        chapterNo: '二',
        title: '法定代表人身份证明',
        chapterType: 'template',
        generationStatus: 'completed',
        children: [],
      },
      {
        id: 3,
        chapterNo: '三',
        title: '技术方案',
        score: 30,
        chapterType: 'generate',
        generationStatus: 'completed',
        children: [
          {
            id: 31,
            chapterNo: '3.1',
            title: '项目理解',
            score: 10,
            chapterType: 'generate',
            generationStatus: 'completed',
          },
          {
            id: 32,
            chapterNo: '3.2',
            title: '技术架构',
            score: 12,
            chapterType: 'generate',
            generationStatus: 'completed',
          },
          {
            id: 33,
            chapterNo: '3.3',
            title: '实施方案',
            score: 8,
            chapterType: 'generate',
            generationStatus: 'generating',
          },
        ],
      },
      {
        id: 4,
        chapterNo: '四',
        title: '项目团队',
        score: 20,
        chapterType: 'generate',
        generationStatus: 'pending',
        children: [],
      },
      {
        id: 5,
        chapterNo: '五',
        title: '项目案例',
        score: 25,
        chapterType: 'generate',
        generationStatus: 'pending',
        children: [],
      },
    ];

    // 默认选中第一个章节
    if (chapterTree.value.length > 0) {
      selectedKeys.value = [chapterTree.value[0].id];
      loadChapterContent(chapterTree.value[0].id);
    }
  } catch (error) {
    console.error('加载章节树失败:', error);
  } finally {
    loading.value = false;
  }
}

// 选择章节
function handleChapterSelect(keys: number[]) {
  if (keys.length > 0) {
    selectedKeys.value = keys;
    loadChapterContent(keys[0]);
  }
}

// 加载章节内容
async function loadChapterContent(chapterId: number) {
  loading.value = true;
  try {
    // TODO: 调用API加载章节内容
    // const res = await submissionChapterInfo(chapterId);
    // currentChapter.value = res;

    // 模拟数据
    currentChapter.value = {
      id: chapterId,
      chapterNo: '3.3',
      title: '实施方案',
      score: 8,
      chapterType: 'generate',
      generationStatus: 'completed',
      content: '项目实施分为需求分析、系统设计、开发测试、部署上线四个阶段...',
      reasonDescription:
        '根据招标文件第3.2条要求，投标人需提供详细的项目实施方案。本章节将详细阐述项目实施的各个阶段和关键节点，以满足评分标准中"实施方案"8分的要求。',
      generationEndTime: new Date(),
      aiTokensUsed: 2500,
    };
  } catch (error) {
    console.error('加载章节内容失败:', error);
  } finally {
    loading.value = false;
  }
}

// AI生成章节
async function handleGenerateChapter() {
  if (!currentChapter.value) return;

  loading.value = true;
  try {
    // TODO: 调用API生成章节
    // await submissionChapterGenerate(currentChapter.value.id);
    message.success('章节生成中，请稍候...');

    // 刷新章节内容
    setTimeout(() => {
      loadChapterContent(currentChapter.value.id);
    }, 2000);
  } catch (error) {
    console.error('生成章节失败:', error);
    message.error('生成失败');
  } finally {
    loading.value = false;
  }
}

// 填充模板
async function handleFillTemplate() {
  if (!currentChapter.value) return;

  loading.value = true;
  try {
    // TODO: 调用API填充模板
    message.success('模板填充成功');
    loadChapterContent(currentChapter.value.id);
  } catch (error) {
    console.error('填充模板失败:', error);
    message.error('填充失败');
  } finally {
    loading.value = false;
  }
}

// 保存章节
async function handleSaveChapter() {
  if (!currentChapter.value) return;

  try {
    // TODO: 调用API保存章节
    message.success('保存成功');
  } catch (error) {
    console.error('保存章节失败:', error);
    message.error('保存失败');
  }
}

// 重新生成章节
function handleRegenerateChapter() {
  message.info('重新生成功能开发中');
}

// 删除章节
function handleDeleteChapter() {
  message.info('删除章节功能开发中');
}

// 一键生成
function handleGenerateAll() {
  progressModalOpen.value = true;
  // TODO: 调用API一键生成所有章节
}

// 内容变化
function handleContentChange() {
  // 标记为已修改
}

// 格式化日期
function formatDate(date: Date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}

// 获取状态颜色
function getStatusColor(status: string) {
  const colorMap: Record<string, string> = {
    pending: 'default',
    generating: 'processing',
    completed: 'success',
    failed: 'error',
  };
  return colorMap[status] || 'default';
}

// 获取状态文本
function getStatusText(status: string) {
  const textMap: Record<string, string> = {
    pending: '待生成',
    generating: '生成中',
    completed: '已完成',
    failed: '失败',
  };
  return textMap[status] || '未知';
}

// 获取进度状态
function getProgressStatus(status: string) {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'exception';
  return 'active';
}

// 工具栏操作
function handleBold() {
  message.info('加粗功能');
}
function handleItalic() {
  message.info('斜体功能');
}
function handleUnderline() {
  message.info('下划线功能');
}
function handleOrderedList() {
  message.info('有序列表功能');
}
function handleUnorderedList() {
  message.info('无序列表功能');
}

// 导航操作
function handleBack() {
  message.info('上一步');
}
function handleNext() {
  message.info('下一步');
}
function handleReturn() {
  message.info('返回项目');
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

  .editor-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 24px;
    background: #fff;
    border-bottom: 1px solid #e8e8e8;
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
          }

          .chapter-actions {
            display: flex;
            gap: 8px;
            opacity: 0;
            transition: opacity 0.2s;
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

          :deep(.ant-input) {
            font-family: 'Microsoft YaHei', sans-serif;
            line-height: 1.8;
          }
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
