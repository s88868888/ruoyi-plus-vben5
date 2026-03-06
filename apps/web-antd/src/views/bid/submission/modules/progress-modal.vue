<template>
  <AModal
    v-model:open="visible"
    title="标书生成进度"
    width="800px"
    :footer="null"
    @cancel="handleClose"
  >
    <ASpin :spinning="loading">
      <!-- 整体进度 -->
      <div class="progress-summary">
        <AProgress
          :percent="progressData?.overallProgress || 0"
          :status="getProgressStatus()"
        />
        <div class="progress-info">
          <ASpace>
            <ATag color="blue">
              总计: {{ progressData?.totalDocuments || 0 }}
            </ATag>
            <ATag color="success">
              已完成: {{ progressData?.completedDocuments || 0 }}
            </ATag>
            <ATag v-if="progressData?.failedDocuments" color="error">
              失败: {{ progressData?.failedDocuments }}
            </ATag>
          </ASpace>
        </div>
      </div>

      <ADivider />

      <!-- 文档列表 -->
      <div class="document-list">
        <h4>文档生成详情</h4>
        <AList :data-source="progressData?.documents || []" size="small">
          <template #renderItem="{ item }">
            <AListItem>
              <AListItemMeta>
                <template #title>
                  {{ item.companyName }} - {{ item.documentTypeName }}
                  {{ item.documentNo }}
                </template>
                <template #description>
                  <AProgress
                    :percent="item.progress"
                    :status="getDocumentProgressStatus(item.generationStatus)"
                    size="small"
                  />
                  <span v-if="item.errorMessage" class="error-message">
                    {{ item.errorMessage }}
                  </span>
                </template>
              </AListItemMeta>
              <template #actions>
                <ATag :color="getStatusColor(item.generationStatus)">
                  {{ item.statusText }}
                </ATag>
              </template>
            </AListItem>
          </template>
        </AList>
      </div>

      <ADivider />

      <!-- 日志 -->
      <ACollapse>
        <ACollapsePanel key="logs" header="查看详细日志">
          <div class="log-container">
            <div
              v-for="(log, index) in progressData?.logs || []"
              :key="index"
              :class="['log-item', `log-${log.level?.toLowerCase()}`]"
            >
              <span class="log-time">[{{ log.time }}]</span>
              <span class="log-level">[{{ log.level }}]</span>
              <span v-if="log.stage" class="log-stage">[{{ log.stage }}]</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
        </ACollapsePanel>
      </ACollapse>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <ASpace>
          <AButton @click="handleRefresh">刷新</AButton>
          <AButton
            v-if="progressData?.status === 'generating'"
            danger
            @click="handleCancel"
          >
            取消生成
          </AButton>
          <AButton type="primary" @click="handleClose">关闭</AButton>
        </ASpace>
      </div>
    </ASpin>
  </AModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  Button as AButton,
  Collapse as ACollapse,
  CollapsePanel as ACollapsePanel,
  Divider as ADivider,
  List as AList,
  ListItem as AListItem,
  ListItemMeta as AListItemMeta,
  message,
  Modal,
  Modal as AModal,
  Progress as AProgress,
  Space as ASpace,
  Spin as ASpin,
  Tag as ATag,
} from 'ant-design-vue';
import {
  cancelSubmissionGeneration,
  getSubmissionProgress,
  type BidSubmissionProgressVO,
} from '#/api/bid/submission';

interface Props {
  open: boolean;
  submissionId?: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const visible = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
});

const loading = ref(false);
const progressData = ref<BidSubmissionProgressVO>();
let pollingTimer: any = null;

// 监听弹窗打开
watch(
  () => props.open,
  (open) => {
    if (open && props.submissionId) {
      loadProgress();
      startPolling();
    } else {
      stopPolling();
    }
  },
);

// 加载进度
async function loadProgress() {
  if (!props.submissionId) return;

  loading.value = true;
  try {
    progressData.value = await getSubmissionProgress(props.submissionId);

    // 如果已完成或失败，停止轮询
    if (
      progressData.value.status === 'generated' ||
      progressData.value.status === 'failed'
    ) {
      stopPolling();
    }
  } catch (error) {
    console.error('加载进度失败:', error);
  } finally {
    loading.value = false;
  }
}

// 开始轮询
function startPolling() {
  stopPolling();
  pollingTimer = setInterval(() => {
    loadProgress();
  }, 2000); // 每2秒刷新一次
}

// 停止轮询
function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

// 刷新
function handleRefresh() {
  loadProgress();
}

// 取消生成
function handleCancel() {
  Modal.confirm({
    title: '确认取消',
    content: '确定要取消生成任务吗？',
    async onOk() {
      if (!props.submissionId) return;
      await cancelSubmissionGeneration(props.submissionId);
      message.success('已取消生成');
      loadProgress();
    },
  });
}

// 关闭
function handleClose() {
  stopPolling();
  visible.value = false;
}

// 获取整体进度状态
function getProgressStatus() {
  if (!progressData.value) return 'normal';
  if (progressData.value.status === 'generated') return 'success';
  if (progressData.value.status === 'failed') return 'exception';
  return 'active';
}

// 获取文档进度状态
function getDocumentProgressStatus(status: string) {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'exception';
  return 'active';
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
</script>

<style scoped lang="less">
.progress-summary {
  margin-bottom: 16px;

  .progress-info {
    margin-top: 8px;
    text-align: center;
  }
}

.document-list {
  max-height: 300px;
  overflow-y: auto;

  h4 {
    margin-bottom: 12px;
  }

  .error-message {
    color: #ff4d4f;
    font-size: 12px;
    margin-left: 8px;
  }
}

.log-container {
  max-height: 200px;
  overflow-y: auto;
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;

  .log-item {
    margin-bottom: 4px;
    line-height: 1.5;

    .log-time {
      color: #999;
    }

    .log-level {
      font-weight: bold;
      margin: 0 4px;
    }

    .log-stage {
      color: #1890ff;
      margin-right: 4px;
    }

    &.log-info .log-level {
      color: #1890ff;
    }

    &.log-warn .log-level {
      color: #faad14;
    }

    &.log-error .log-level {
      color: #ff4d4f;
    }
  }
}

.action-buttons {
  margin-top: 16px;
  text-align: right;
}
</style>
