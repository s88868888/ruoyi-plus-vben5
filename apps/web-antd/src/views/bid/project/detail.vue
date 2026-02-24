<script setup lang="ts">
import type { BizBidProject } from '#/api/bid/project';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { Card, Descriptions, DescriptionsItem, Empty, FloatButton, Space, Tag, Alert, Spin, Button } from 'ant-design-vue';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons-vue';

import { bidProjectInfo } from '#/api/bid/project';

const route = useRoute();
const router = useRouter();

// 项目详情数据
const projectDetail = ref<BizBidProject>({});
const loading = ref(false);

// 项目类型标签配置
const projectTypeConfig: Record<string, { label: string; color: string }> = {
  engineering: { label: '工程', color: 'blue' },
  goods: { label: '货物', color: 'green' },
  service: { label: '服务', color: 'orange' },
};

// 招标方式配置
const bidMethodConfig: Record<string, string> = {
  public: '公开招标',
  invite: '邀请招标',
  competitive: '竞争性谈判',
  inquiry: '询价采购',
  single: '单一来源',
};

// 状态配置
const statusConfig: Record<string, { label: string; color: string }> = {
  following: { label: '跟进中', color: 'processing' },
  bid: { label: '已投标', color: 'warning' },
  won: { label: '已中标', color: 'success' },
  lost: { label: '未中标', color: 'error' },
  abandoned: { label: '已放弃', color: 'default' },
};

// 服务配置数据（示例）
const serviceConfig = ref([
  { name: '招标组织', value: '记账宝公司总部', description: '记账宝公司总部' },
  { name: '应答方式', value: '线上应答', description: '线上应答' },
  { name: '口碑说明', value: '口碑说明', description: '供应商在本平台的历史中标记录，开标后可见，供应商在本平台的历史中标记录，开标后可见，供应商在本平台的历史中标记录，开标后可见' },
]);

// 计算属性
const projectTypeLabel = computed(() => {
  const type = projectDetail.value.projectType;
  return type ? projectTypeConfig[type]?.label || type : '-';
});

const projectTypeColor = computed(() => {
  const type = projectDetail.value.projectType;
  return type ? projectTypeConfig[type]?.color || 'default' : 'default';
});

const bidMethodLabel = computed(() => {
  const method = projectDetail.value.bidMethod;
  return method ? bidMethodConfig[method] || method : '-';
});

const statusLabel = computed(() => {
  const status = projectDetail.value.status;
  return status ? statusConfig[status]?.label || status : '-';
});

const statusColor = computed(() => {
  const status = projectDetail.value.status;
  return status ? statusConfig[status]?.color || 'default' : 'default';
});

// 附件列表
const attachmentList = computed(() => {
  if (!projectDetail.value.attachments || !projectDetail.value.attachmentName) {
    return [];
  }
  const urls = projectDetail.value.attachments.split(',');
  const names = projectDetail.value.attachmentName.split(',');
  return urls.map((url, index) => ({
    url,
    name: names[index] || `附件${index + 1}`,
  }));
});

// 加载项目详情
async function loadProjectDetail() {
  const id = route.params.id as string;
  if (!id) return;

  loading.value = true;
  try {
    const data = await bidProjectInfo(Number(id));
    projectDetail.value = data;
  } finally {
    loading.value = false;
  }
}

// 返回列表
function handleBack() {
  router.back();
}

// AI 分析状态配置
const aiStatusConfig: Record<string, { label: string; color: string; type: string }> = {
  pending: { label: '待分析', color: 'default', type: 'info' },
  analyzing: { label: '分析中', color: 'processing', type: 'info' },
  completed: { label: '已完成', color: 'success', type: 'success' },
  failed: { label: '失败', color: 'error', type: 'error' },
};

const aiStatusLabel = computed(() => {
  const status = projectDetail.value.aiAnalysisStatus;
  return status ? aiStatusConfig[status]?.label || status : '未分析';
});

const aiStatusColor = computed(() => {
  const status = projectDetail.value.aiAnalysisStatus;
  return status ? aiStatusConfig[status]?.color || 'default' : 'default';
});

const aiStatusType = computed(() => {
  const status = projectDetail.value.aiAnalysisStatus;
  return status ? aiStatusConfig[status]?.type || 'info' : 'info';
});

// 刷新详情
async function handleRefresh() {
  await loadProjectDetail();
}

onMounted(() => {
  loadProjectDetail();
});
</script>

<template>
  <Page :auto-content-height="true" :loading="loading">
    <div class="h-full overflow-auto bg-gray-50 p-6">
      <div class="mx-auto max-w-7xl">
        <!-- 头部信息 -->
        <div class="mb-6 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <a-button type="text" @click="handleBack">
              <ArrowLeftOutlined />
              返回
            </a-button>
            <div>
              <h2 class="text-2xl font-bold">{{ projectDetail.projectName || '项目详情' }}</h2>
              <div class="mt-2 flex items-center gap-3 text-sm text-gray-500">
                <span>项目编号：{{ route.params.id }}</span>
                <span>发布日期：{{ projectDetail.publishDate?.split(' ')[0] || '-' }}</span>
              </div>
            </div>
          </div>
          <Space>
            <Tag :color="statusColor">{{ statusLabel }}</Tag>
          </Space>
        </div>

        <!-- 基本信息卡片 -->
        <Card class="mb-4" title="合同信息">
          <Descriptions :column="2" bordered>
            <DescriptionsItem label="项目名称">
              {{ projectDetail.projectName || '-' }}
            </DescriptionsItem>
            <DescriptionsItem label="项目类型">
              <Tag :color="projectTypeColor">{{ projectTypeLabel }}</Tag>
            </DescriptionsItem>
            <DescriptionsItem label="招标单位">
              {{ projectDetail.bidOrg || '-' }}
            </DescriptionsItem>
            <DescriptionsItem label="招标方式">
              {{ bidMethodLabel }}
            </DescriptionsItem>
            <DescriptionsItem label="预算金额">
              <span v-if="projectDetail.budgetAmount" class="font-semibold text-orange-500">
                ¥{{ projectDetail.budgetAmount }} 万元
              </span>
              <span v-else>-</span>
            </DescriptionsItem>
            <DescriptionsItem label="契合度">
              <span v-if="projectDetail.matchDegree">{{ projectDetail.matchDegree }}%</span>
              <span v-else>-</span>
            </DescriptionsItem>
            <DescriptionsItem label="发布日期">
              {{ projectDetail.publishDate?.split(' ')[0] || '-' }}
            </DescriptionsItem>
            <DescriptionsItem label="截止日期">
              {{ projectDetail.deadline?.split(' ')[0] || '-' }}
            </DescriptionsItem>
            <DescriptionsItem label="项目区域">
              {{ projectDetail.projectRegion || '-' }}
            </DescriptionsItem>
            <DescriptionsItem label="项目来源">
              {{ projectDetail.projectSource || '-' }}
            </DescriptionsItem>
            <DescriptionsItem label="联系人">
              {{ projectDetail.contactPerson || '-' }}
            </DescriptionsItem>
            <DescriptionsItem label="联系电话">
              {{ projectDetail.contactPhone || '-' }}
            </DescriptionsItem>
            <DescriptionsItem :span="2" label="项目描述">
              <div class="whitespace-pre-wrap">{{ projectDetail.projectDesc || '-' }}</div>
            </DescriptionsItem>
            <DescriptionsItem v-if="projectDetail.sourceUrl" :span="2" label="来源链接">
              <a :href="projectDetail.sourceUrl" target="_blank" class="text-blue-500 hover:underline">
                {{ projectDetail.sourceUrl }}
              </a>
            </DescriptionsItem>
            <DescriptionsItem v-if="projectDetail.remark" :span="2" label="备注">
              <div class="whitespace-pre-wrap">{{ projectDetail.remark }}</div>
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <!-- AI 分析结果卡片 -->
        <Card class="mb-4" title="AI 智能分析">
          <template #extra>
            <Space>
              <Tag :color="aiStatusColor">{{ aiStatusLabel }}</Tag>
              <Button
                v-if="projectDetail.aiAnalysisStatus === 'analyzing'"
                size="small"
                type="link"
                @click="handleRefresh"
              >
                <ReloadOutlined />
                刷新
              </Button>
            </Space>
          </template>

          <div v-if="!projectDetail.aiAnalysisStatus || projectDetail.aiAnalysisStatus === 'pending'">
            <Alert
              message="尚未进行 AI 分析"
              description="请在编辑页面进行 AI 分析配置"
              :type="aiStatusType"
              show-icon
            />
          </div>

          <div v-else-if="projectDetail.aiAnalysisStatus === 'analyzing'">
            <div class="flex items-center justify-center py-8">
              <Spin size="large" tip="AI 正在分析中，请稍候..." />
            </div>
          </div>

          <div v-else-if="projectDetail.aiAnalysisStatus === 'failed'">
            <Alert
              message="AI 分析失败"
              description="分析过程中出现错误，请重新尝试"
              type="error"
              show-icon
            />
          </div>

          <div v-else-if="projectDetail.aiAnalysisStatus === 'completed' && projectDetail.aiAnalysisResult">
            <div class="space-y-4">
              <div v-if="projectDetail.aiPrompt" class="rounded bg-gray-50 p-4">
                <div class="mb-2 text-sm font-medium text-gray-600">使用的提示词：</div>
                <div class="whitespace-pre-wrap text-sm text-gray-700">{{ projectDetail.aiPrompt }}</div>
              </div>
              <div class="rounded border border-blue-100 bg-blue-50 p-6">
                <div class="mb-3 flex items-center gap-2">
                  <span class="text-lg font-semibold text-blue-900">📊 分析结果</span>
                </div>
                <div class="whitespace-pre-wrap text-gray-800 leading-relaxed">
                  {{ projectDetail.aiAnalysisResult }}
                </div>
              </div>
            </div>
          </div>

          <div v-else>
            <Empty description="暂无分析结果" />
          </div>
        </Card>

        <!-- 服务配置卡片 -->
        <Card class="mb-4" title="服务配置">
          <div class="space-y-4">
            <div
              v-for="(item, index) in serviceConfig"
              :key="index"
              class="flex gap-4 border-b pb-4 last:border-b-0"
            >
              <div class="w-32 shrink-0 font-medium text-gray-700">{{ item.name }}</div>
              <div class="flex-1">
                <div class="mb-1 font-medium">{{ item.value }}</div>
                <div class="text-sm text-gray-500">{{ item.description }}</div>
              </div>
            </div>
          </div>
        </Card>

        <!-- 支付计划 -->
        <Card class="mb-4" title="支付计划">
          <Empty description="暂无支付计划数据" />
        </Card>

        <!-- 过程跟踪 -->
        <Card class="mb-4" title="过程跟踪">
          <Empty description="暂无过程跟踪数据" />
        </Card>

        <!-- 附件区域 -->
        <Card v-if="attachmentList.length > 0" title="附件列表">
          <div class="space-y-2">
            <div
              v-for="(file, index) in attachmentList"
              :key="index"
              class="flex items-center justify-between rounded border p-3 hover:bg-gray-50"
            >
              <span>{{ file.name }}</span>
              <a :href="file.url" target="_blank" class="text-blue-500 hover:underline">
                下载
              </a>
            </div>
          </div>
        </Card>

        <!-- 底部金额汇总 -->
        <Card class="mt-4">
          <div class="flex justify-end">
            <div class="w-96 space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">合同总金额：</span>
                <span class="font-semibold">
                  ¥{{ projectDetail.budgetAmount ? `${projectDetail.budgetAmount}.00` : '0.00' }}
                </span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">累计应收金额：</span>
                <span class="font-semibold">¥0.00</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <!-- 浮动按钮 -->
      <FloatButton.BackTop :visibility-height="100" />
    </div>
  </Page>
</template>

<style scoped>
:deep(.ant-descriptions-item-label) {
  background-color: #fafafa;
  font-weight: 500;
}
</style>
