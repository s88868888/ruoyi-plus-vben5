<template>
  <div class="submission-detail">
    <ASpin :spinning="loading">
      <!-- 基本信息卡片 -->
      <ACard title="投标项目信息" class="detail-card">
        <ADescriptions :column="2" bordered>
          <ADescriptionsItem label="项目名称">
            {{ detailData?.projectName }}
          </ADescriptionsItem>
          <ADescriptionsItem label="招标单位">
            {{ detailData?.bidOrg }}
          </ADescriptionsItem>
          <ADescriptionsItem label="项目类型">
            {{ detailData?.projectType }}
          </ADescriptionsItem>
          <ADescriptionsItem label="预算金额">
            {{ detailData?.budgetAmount }} 万元
          </ADescriptionsItem>
          <ADescriptionsItem label="项目地区">
            {{ detailData?.projectRegion }}
          </ADescriptionsItem>
          <ADescriptionsItem label="招标方式">
            {{ detailData?.bidMethod }}
          </ADescriptionsItem>
          <ADescriptionsItem label="投标状态" :span="2">
            <ATag :color="getStatusColor(detailData?.submissionStatus)">
              {{ getStatusText(detailData?.submissionStatus) }}
            </ATag>
          </ADescriptionsItem>
          <ADescriptionsItem label="生成进度" :span="2">
            <AProgress
              :percent="detailData?.generationProgress || 0"
              :status="getProgressStatus()"
            />
          </ADescriptionsItem>
          <ADescriptionsItem label="文档统计" :span="2">
            <ASpace>
              <ATag color="blue">
                总计: {{ detailData?.totalDocuments || 0 }}
              </ATag>
              <ATag color="success">
                已完成: {{ detailData?.completedDocuments || 0 }}
              </ATag>
              <ATag v-if="detailData?.failedDocuments" color="error">
                失败: {{ detailData?.failedDocuments }}
              </ATag>
            </ASpace>
          </ADescriptionsItem>
          <ADescriptionsItem label="项目描述" :span="2">
            {{ detailData?.projectDesc }}
          </ADescriptionsItem>
          <ADescriptionsItem label="备注" :span="2">
            {{ detailData?.remark }}
          </ADescriptionsItem>
          <ADescriptionsItem label="创建时间">
            {{ detailData?.createTime }}
          </ADescriptionsItem>
          <ADescriptionsItem label="更新时间">
            {{ detailData?.updateTime }}
          </ADescriptionsItem>
        </ADescriptions>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <ASpace>
            <AButton
              v-if="detailData?.submissionStatus === 'draft'"
              v-hasPermi="['bid:submission:generate']"
              type="primary"
              @click="handleGenerate"
            >
              开始生成
            </AButton>
            <AButton
              v-if="detailData?.submissionStatus === 'generating'"
              v-hasPermi="['bid:submission:progress']"
              type="primary"
              @click="handleViewProgress"
            >
              查看进度
            </AButton>
            <AButton
              v-if="
                detailData?.submissionStatus === 'completed' ||
                detailData?.submissionStatus === 'failed'
              "
              v-hasPermi="['bid:submission:generate']"
              @click="handleRegenerate"
            >
              重新生成
            </AButton>
            <AButton
              v-if="detailData?.submissionStatus === 'generating'"
              v-hasPermi="['bid:submission:generate']"
              danger
              @click="handleCancel"
            >
              取消生成
            </AButton>
            <AButton @click="handleBack">返回</AButton>
          </ASpace>
        </div>
      </ACard>

      <!-- 文档列表卡片 -->
      <ACard title="标书文档列表" class="detail-card">
        <ATable
          :columns="documentColumns"
          :data-source="documents"
          :loading="documentLoading"
          :pagination="false"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'documentType'">
              <ATag>{{ getDocumentTypeName(record.documentType) }}</ATag>
            </template>
            <template v-if="column.key === 'generationStatus'">
              <ATag :color="getStatusColor(record.generationStatus)">
                {{ getDocumentStatusText(record.generationStatus) }}
              </ATag>
            </template>
            <template v-if="column.key === 'generationProgress'">
              <AProgress
                :percent="record.generationProgress || 0"
                :status="getDocumentProgressStatus(record.generationStatus)"
                size="small"
              />
            </template>
            <template v-if="column.key === 'action'">
              <ASpace>
                <AButton
                  v-if="record.filePath"
                  v-hasPermi="['bid:submission:download']"
                  type="link"
                  size="small"
                  @click="handleDownload(record)"
                >
                  下载
                </AButton>
                <AButton
                  v-if="record.documentContent"
                  type="link"
                  size="small"
                  @click="handlePreview(record)"
                >
                  预览
                </AButton>
                <AButton
                  v-if="record.generationStatus === 'failed'"
                  type="link"
                  size="small"
                  @click="handleRetry(record)"
                >
                  重试
                </AButton>
              </ASpace>
            </template>
          </template>
        </ATable>
      </ACard>
    </ASpin>

    <!-- 进度弹窗 -->
    <ProgressModal
      v-model:open="progressModalOpen"
      :submission-id="submissionId"
    />

    <!-- 文档预览弹窗 -->
    <AModal
      v-model:open="previewModalOpen"
      title="文档预览"
      width="900px"
      :footer="null"
    >
      <pre class="markdown-preview">{{ previewContent }}</pre>
    </AModal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { useRoute, useRouter } from 'vue-router';
import {
  submissionCancel,
  submissionGenerate,
  submissionInfo,
  submissionRegenerate,
  type BizBidSubmissionVO,
} from '#/api/bid/submission';
import ProgressModal from './modules/progress-modal.vue';

const route = useRoute();
const router = useRouter();

const submissionId = ref<number>(Number(route.params.id));
const loading = ref(false);
const detailData = ref<BizBidSubmissionVO>();
const documentLoading = ref(false);
const documents = ref<any[]>([]);
const progressModalOpen = ref(false);
const previewModalOpen = ref(false);
const previewContent = ref('');

// 文档列表列配置
const documentColumns = [
  { title: '序号', width: 60, customRender: ({ index }: any) => index + 1 },
  { title: '公司名称', dataIndex: 'companyName', key: 'companyName', width: 150 },
  { title: '文档名称', dataIndex: 'documentName', key: 'documentName', minWidth: 200 },
  { title: '文档类型', dataIndex: 'documentType', key: 'documentType', width: 100 },
  { title: '序号', dataIndex: 'documentNo', key: 'documentNo', width: 80 },
  { title: '生成状态', dataIndex: 'generationStatus', key: 'generationStatus', width: 100 },
  { title: '生成进度', dataIndex: 'generationProgress', key: 'generationProgress', width: 150 },
  { title: '文件大小', dataIndex: 'fileSize', key: 'fileSize', width: 100, customRender: ({ text }: any) => text ? `${(text / 1024).toFixed(2)} KB` : '-' },
  { title: '生成耗时', dataIndex: 'generationDuration', key: 'generationDuration', width: 100, customRender: ({ text }: any) => text ? `${text}秒` : '-' },
  { title: '操作', key: 'action', width: 150, fixed: 'right' },
];

onMounted(() => {
  loadDetail();
  loadDocuments();
});

// 加载详情
async function loadDetail() {
  loading.value = true;
  try {
    detailData.value = await submissionInfo(submissionId.value);
  } catch (error) {
    console.error('加载详情失败:', error);
  } finally {
    loading.value = false;
  }
}

// 加载文档列表
async function loadDocuments() {
  documentLoading.value = true;
  try {
    // TODO: 调用文档列表接口
    // const res = await submissionDocumentList({ bidSubmissionId: submissionId.value });
    // documents.value = res.rows;
    documents.value = [];
  } catch (error) {
    console.error('加载文档列表失败:', error);
  } finally {
    documentLoading.value = false;
  }
}

// 开始生成
function handleGenerate() {
  Modal.confirm({
    title: '确认生成',
    content: '确定开始生成标书吗？',
    async onOk() {
      await submissionGenerate(submissionId.value);
      message.success('已开始生成');
      loadDetail();
      handleViewProgress();
    },
  });
}

// 查看进度
function handleViewProgress() {
  progressModalOpen.value = true;
}

// 重新生成
function handleRegenerate() {
  Modal.confirm({
    title: '确认重新生成',
    content: '确定重新生成标书吗？之前的生成结果将被覆盖。',
    async onOk() {
      await submissionRegenerate(submissionId.value);
      message.success('已开始重新生成');
      loadDetail();
      handleViewProgress();
    },
  });
}

// 取消生成
function handleCancel() {
  Modal.confirm({
    title: '确认取消',
    content: '确定要取消生成任务吗？',
    async onOk() {
      await submissionCancel(submissionId.value);
      message.success('已取消生成');
      loadDetail();
    },
  });
}

// 下载文档
function handleDownload(record: any) {
  message.info('下载功能开发中');
  // TODO: 实现文档下载
}

// 预览文档
function handlePreview(record: any) {
  if (record.documentContent) {
    previewContent.value = record.documentContent;
    previewModalOpen.value = true;
  } else {
    message.warning('暂无文档内容');
  }
}

// 重试生成
function handleRetry(record: any) {
  Modal.confirm({
    title: '确认重试',
    content: `确定重新生成"${record.documentName}"吗？`,
    onOk() {
      message.info('重试功能开发中');
      // TODO: 实现单个文档重新生成
    },
  });
}

// 返回
function handleBack() {
  router.back();
}

// 获取状态颜色
function getStatusColor(status?: string) {
  const colorMap: Record<string, string> = {
    draft: 'default',
    generating: 'processing',
    completed: 'success',
    failed: 'error',
    pending: 'default',
  };
  return colorMap[status || ''] || 'default';
}

// 获取状态文本
function getStatusText(status?: string) {
  const textMap: Record<string, string> = {
    draft: '草稿',
    generating: '生成中',
    completed: '已完成',
    failed: '失败',
  };
  return textMap[status || ''] || '未知';
}

// 获取进度状态
function getProgressStatus() {
  if (!detailData.value) return 'normal';
  if (detailData.value.submissionStatus === 'completed') return 'success';
  if (detailData.value.submissionStatus === 'failed') return 'exception';
  return 'active';
}

// 获取文档类型名称
function getDocumentTypeName(type: string) {
  const typeMap: Record<string, string> = {
    commercial: '商务标',
    technical: '技术标',
    complete: '整本标书',
  };
  return typeMap[type] || '未知';
}

// 获取文档状态文本
function getDocumentStatusText(status: string) {
  const textMap: Record<string, string> = {
    pending: '待生成',
    generating: '生成中',
    completed: '已完成',
    failed: '失败',
  };
  return textMap[status] || '未知';
}

// 获取文档进度状态
function getDocumentProgressStatus(status: string) {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'exception';
  return 'active';
}
</script>

<style scoped lang="less">
.submission-detail {
  padding: 16px;

  .detail-card {
    margin-bottom: 16px;
  }

  .action-buttons {
    margin-top: 16px;
    text-align: right;
  }

  .markdown-preview {
    max-height: 600px;
    overflow-y: auto;
    padding: 16px;
    background: #f5f5f5;
    border-radius: 4px;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    line-height: 1.6;
  }
}
</style>
