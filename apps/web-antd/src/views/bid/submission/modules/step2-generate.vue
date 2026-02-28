<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Button, Card, Col, message, Progress, Row, Space, Spin, Tree } from 'ant-design-vue';
import type { TreeProps } from 'ant-design-vue';
import { FileTextOutlined, FolderOpenOutlined, FolderOutlined } from '@ant-design/icons-vue';

interface Props {
  submissionId: number;
  configData: {
    selectedCompanies: any[];
    generationConfig: any[];
  };
}

const props = defineProps<Props>();
const emit = defineEmits(['structure-generated', 'content-generated', 'prev', 'next']);

const loading = ref(false);
const generating = ref(false);
const structureGenerated = ref(false);

// 章节树数据
const chapterTree = ref<any[]>([]);
const expandedKeys = ref<string[]>([]);
const selectedKeys = ref<string[]>([]);

// 当前选中的章节
const currentChapter = ref<any>(null);

// 生成进度
const generationProgress = ref(0);
const currentGeneratingChapter = ref('');

onMounted(() => {
  // 检查是否已生成章节结构
  checkStructureStatus();
});

// 检查章节结构状态
async function checkStructureStatus() {
  loading.value = true;
  try {
    // TODO: 调用后端接口检查章节结构是否已生成
    // const res = await getChapterTree(props.submissionId);
    // if (res && res.length > 0) {
    //   chapterTree.value = res;
    //   structureGenerated.value = true;
    //   emit('structure-generated', res);
    // }
  } catch (error) {
    console.error('检查章节结构失败:', error);
  } finally {
    loading.value = false;
  }
}

// 生成章节结构
async function handleGenerateStructure() {
  loading.value = true;
  try {
    // TODO: 调用后端接口生成章节结构
    // const res = await generateChapterStructure(props.submissionId);
    // chapterTree.value = res;

    // 模拟数据
    chapterTree.value = [
      {
        key: '1',
        title: '第一章 项目概述',
        chapterNo: '1',
        chapterLevel: 1,
        generationStatus: 'pending',
        children: [
          {
            key: '1-1',
            title: '1.1 项目背景',
            chapterNo: '1.1',
            chapterLevel: 2,
            generationStatus: 'pending',
          },
          {
            key: '1-2',
            title: '1.2 项目目标',
            chapterNo: '1.2',
            chapterLevel: 2,
            generationStatus: 'pending',
          },
        ],
      },
      {
        key: '2',
        title: '第二章 公司介绍',
        chapterNo: '2',
        chapterLevel: 1,
        generationStatus: 'pending',
        children: [
          {
            key: '2-1',
            title: '2.1 公司概况',
            chapterNo: '2.1',
            chapterLevel: 2,
            generationStatus: 'pending',
          },
          {
            key: '2-2',
            title: '2.2 资质证书',
            chapterNo: '2.2',
            chapterLevel: 2,
            generationStatus: 'pending',
          },
          {
            key: '2-3',
            title: '2.3 业绩案例',
            chapterNo: '2.3',
            chapterLevel: 2,
            generationStatus: 'pending',
          },
        ],
      },
      {
        key: '3',
        title: '第三章 技术方案',
        chapterNo: '3',
        chapterLevel: 1,
        generationStatus: 'pending',
        children: [
          {
            key: '3-1',
            title: '3.1 技术路线',
            chapterNo: '3.1',
            chapterLevel: 2,
            generationStatus: 'pending',
          },
          {
            key: '3-2',
            title: '3.2 实施方案',
            chapterNo: '3.2',
            chapterLevel: 2,
            generationStatus: 'pending',
          },
        ],
      },
    ];

    structureGenerated.value = true;
    expandedKeys.value = ['1', '2', '3'];
    emit('structure-generated', chapterTree.value);
    message.success('章节结构生成成功');
  } catch (error) {
    console.error('生成章节结构失败:', error);
    message.error('生成章节结构失败');
  } finally {
    loading.value = false;
  }
}

// 开始生成内容
async function handleGenerateContent() {
  generating.value = true;
  generationProgress.value = 0;

  try {
    // TODO: 调用后端接口开始生成内容
    // await startContentGeneration(props.submissionId);

    // 模拟生成进度
    const interval = setInterval(() => {
      if (generationProgress.value < 100) {
        generationProgress.value += 10;
        currentGeneratingChapter.value = `正在生成第 ${Math.floor(generationProgress.value / 10)} 章...`;
      } else {
        clearInterval(interval);
        generating.value = false;
        message.success('内容生成完成');
        emit('content-generated');
      }
    }, 1000);
  } catch (error) {
    console.error('生成内容失败:', error);
    message.error('生成内容失败');
    generating.value = false;
  }
}

// 树节点选择
function handleTreeSelect(keys: string[], info: any) {
  if (keys.length > 0) {
    selectedKeys.value = keys;
    currentChapter.value = info.node;
  }
}

// 树节点图标
function getTreeIcon(node: any) {
  if (node.children && node.children.length > 0) {
    return node.expanded ? FolderOpenOutlined : FolderOutlined;
  }
  return FileTextOutlined;
}

// 上一步
function handlePrev() {
  emit('prev');
}

// 下一步
function handleNext() {
  if (!structureGenerated.value) {
    message.warning('请先生成章节结构');
    return;
  }
  emit('next');
}
</script>

<template>
  <div class="step2-generate">
    <Card title="第二步：智能生成标书内容">
      <!-- 操作区域 -->
      <div class="action-bar">
        <Space>
          <Button
            v-if="!structureGenerated"
            type="primary"
            :loading="loading"
            @click="handleGenerateStructure"
          >
            生成章节结构
          </Button>
          <Button
            v-if="structureGenerated && !generating"
            type="primary"
            @click="handleGenerateContent"
          >
            开始生成内容
          </Button>
          <div v-if="generating" class="progress-info">
            <Progress :percent="generationProgress" status="active" />
            <span class="progress-text">{{ currentGeneratingChapter }}</span>
          </div>
        </Space>
      </div>

      <!-- 主内容区域 -->
      <div v-if="structureGenerated" class="content-area">
        <Row :gutter="16">
          <!-- 左侧目录树 -->
          <Col :span="6">
            <Card title="章节目录" :body-style="{ padding: '12px' }">
              <Tree
                v-model:expanded-keys="expandedKeys"
                v-model:selected-keys="selectedKeys"
                :tree-data="chapterTree"
                :field-names="{ title: 'title', key: 'key', children: 'children' }"
                show-line
                @select="handleTreeSelect"
              >
                <template #title="{ title, generationStatus }">
                  <span>
                    {{ title }}
                    <span
                      v-if="generationStatus === 'completed'"
                      class="status-icon completed"
                    >
                      ✓
                    </span>
                    <span
                      v-else-if="generationStatus === 'generating'"
                      class="status-icon generating"
                    >
                      ...
                    </span>
                  </span>
                </template>
              </Tree>
            </Card>
          </Col>

          <!-- 右侧内容编辑区 -->
          <Col :span="18">
            <Card title="章节内容" :body-style="{ padding: '24px' }">
              <div v-if="currentChapter" class="chapter-content">
                <div class="chapter-header">
                  <h3>{{ currentChapter.title }}</h3>
                  <div class="chapter-meta">
                    <span>章节编号: {{ currentChapter.chapterNo }}</span>
                    <span>层级: {{ currentChapter.chapterLevel }}</span>
                    <span>状态: {{ currentChapter.generationStatus || '待生成' }}</span>
                  </div>
                </div>

                <div class="chapter-editor">
                  <div v-if="currentChapter.chapterContent" class="content-preview">
                    <pre>{{ currentChapter.chapterContent }}</pre>
                  </div>
                  <div v-else class="empty-content">
                    <p>该章节内容尚未生成</p>
                    <Button type="primary" size="small">生成此章节</Button>
                  </div>
                </div>
              </div>
              <div v-else class="empty-state">
                <p>请从左侧目录选择章节查看内容</p>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      <!-- 底部操作按钮 -->
      <div class="action-buttons">
        <Space>
          <Button @click="handlePrev">上一步</Button>
          <Button type="primary" :disabled="!structureGenerated" @click="handleNext">
            下一步
          </Button>
        </Space>
      </div>
    </Card>
  </div>
</template>

<style scoped lang="less">
.step2-generate {
  .action-bar {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;

    .progress-info {
      display: flex;
      align-items: center;
      gap: 16px;
      min-width: 400px;

      .progress-text {
        color: #666;
        font-size: 14px;
      }
    }
  }

  .content-area {
    min-height: 600px;

    .chapter-content {
      .chapter-header {
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid #f0f0f0;

        h3 {
          margin: 0 0 12px 0;
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .chapter-meta {
          display: flex;
          gap: 24px;
          color: #666;
          font-size: 14px;
        }
      }

      .chapter-editor {
        .content-preview {
          pre {
            padding: 16px;
            background: #f5f5f5;
            border-radius: 4px;
            white-space: pre-wrap;
            word-break: break-word;
            line-height: 1.6;
            max-height: 500px;
            overflow-y: auto;
          }
        }

        .empty-content {
          padding: 60px 0;
          text-align: center;
          color: #999;

          p {
            margin-bottom: 16px;
          }
        }
      }
    }

    .empty-state {
      padding: 100px 0;
      text-align: center;
      color: #999;
      font-size: 16px;
    }

    .status-icon {
      margin-left: 8px;
      font-size: 12px;

      &.completed {
        color: #52c41a;
      }

      &.generating {
        color: #1890ff;
      }
    }
  }

  .action-buttons {
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid #f0f0f0;
    text-align: right;
  }
}
</style>
