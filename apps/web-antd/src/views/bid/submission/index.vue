<template>
  <div>
    <VbenVxeGrid ref="gridRef" v-bind="gridOptions">
      <!-- 工具栏 -->
      <template #toolbar-tools>
        <AButton
          v-hasPermi="['bid:submission:add']"
          type="primary"
          @click="handleAdd"
        >
          <template #icon>
            <PlusOutlined />
          </template>
          新增
        </AButton>
        <AButton
          v-hasPermi="['bid:submission:export']"
          type="default"
          @click="handleExport"
        >
          <template #icon>
            <DownloadOutlined />
          </template>
          导出
        </AButton>
      </template>

      <!-- 操作列 -->
      <template #action="{ row }">
        <AButton
          v-hasPermi="['bid:submission:query']"
          type="link"
          size="small"
          @click="handleDetail(row)"
        >
          详情
        </AButton>
        <AButton
          v-hasPermi="['bid:submission:edit']"
          type="link"
          size="small"
          @click="handleEdit(row)"
        >
          编辑
        </AButton>
        <AButton
          v-if="row.submissionStatus === 'draft'"
          v-hasPermi="['bid:submission:generate']"
          type="link"
          size="small"
          @click="handleGenerate(row)"
        >
          开始生成
        </AButton>
        <AButton
          v-if="row.submissionStatus === 'generating'"
          v-hasPermi="['bid:submission:progress']"
          type="link"
          size="small"
          @click="handleViewProgress(row)"
        >
          查看进度
        </AButton>
        <APopconfirm
          title="确定删除该投标项目吗？"
          @confirm="handleDelete(row)"
        >
          <AButton
            v-hasPermi="['bid:submission:remove']"
            type="link"
            size="small"
            danger
          >
            删除
          </AButton>
        </APopconfirm>
      </template>
    </VbenVxeGrid>

    <!-- 进度弹窗 -->
    <ProgressModal
      v-model:open="progressModalOpen"
      :submission-id="currentSubmissionId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { DownloadOutlined, PlusOutlined } from '@ant-design/icons-vue';
import { message, Modal } from 'ant-design-vue';
import { useRouter } from 'vue-router';
import {
  submissionExport,
  submissionGenerate,
  submissionList,
  submissionRemove,
} from '#/api/bid/submission';
import ProgressModal from './modules/progress-modal.vue';

const router = useRouter();

const [gridRef, gridOptions] = useVbenVxeGrid({
  columns: [
    { type: 'seq', width: 60, title: '序号' },
    { field: 'projectName', title: '项目名称', minWidth: 200 },
    { field: 'bidOrg', title: '招标单位', width: 180 },
    { field: 'projectType', title: '项目类型', width: 120 },
    { field: 'budgetAmount', title: '预算金额(万元)', width: 130 },
    {
      field: 'submissionStatus',
      title: '投标状态',
      width: 100,
      slots: { default: 'submissionStatus' },
      cellRender: {
        name: 'ATag',
        props: (params: any) => {
          const statusMap: Record<string, { color: string; text: string }> = {
            draft: { color: 'default', text: '草稿' },
            generating: { color: 'processing', text: '生成中' },
            completed: { color: 'success', text: '已完成' },
            failed: { color: 'error', text: '失败' },
          };
          const status = statusMap[params.row.submissionStatus] || {
            color: 'default',
            text: '未知',
          };
          return { color: status.color, children: status.text };
        },
      },
    },
    {
      field: 'generationProgress',
      title: '生成进度',
      width: 120,
      cellRender: {
        name: 'AProgress',
        props: (params: any) => ({
          percent: params.row.generationProgress || 0,
          size: 'small',
        }),
      },
    },
    {
      field: 'totalDocuments',
      title: '文档统计',
      width: 120,
      formatter: (params: any) => {
        const { totalDocuments, completedDocuments, failedDocuments } =
          params.row;
        return `${completedDocuments || 0}/${totalDocuments || 0}${failedDocuments ? ` (失败${failedDocuments})` : ''}`;
      },
    },
    { field: 'createTime', title: '创建时间', width: 160 },
    {
      field: 'action',
      title: '操作',
      width: 280,
      fixed: 'right',
      slots: { default: 'action' },
    },
  ],
  toolbarConfig: {
    slots: { tools: 'toolbar-tools' },
  },
  proxyConfig: {
    ajax: {
      query: async ({ page, form }) => {
        const params = {
          pageNum: page.currentPage,
          pageSize: page.pageSize,
          ...form,
        };
        const res = await submissionList(params);
        return {
          result: res.rows,
          page: {
            total: res.total,
          },
        };
      },
    },
  },
  formConfig: {
    items: [
      {
        field: 'projectName',
        title: '项目名称',
        itemRender: { name: 'AInput', props: { placeholder: '请输入项目名称' } },
      },
      {
        field: 'submissionStatus',
        title: '投标状态',
        itemRender: {
          name: 'ASelect',
          props: {
            placeholder: '请选择投标状态',
            options: [
              { label: '草稿', value: 'draft' },
              { label: '生成中', value: 'generating' },
              { label: '已完成', value: 'completed' },
              { label: '失败', value: 'failed' },
            ],
          },
        },
      },
      {
        itemRender: {
          name: 'AButtonGroup',
          children: [
            {
              props: { type: 'primary', content: '查询', htmlType: 'submit' },
            },
            { props: { type: 'default', content: '重置', htmlType: 'reset' } },
          ],
        },
      },
    ],
  },
});

// 进度弹窗
const progressModalOpen = ref(false);
const currentSubmissionId = ref<number>();

// 新增
function handleAdd() {
  message.info('请从招标项目列表中点击"转为投标项目"按钮创建');
}

// 详情
function handleDetail(row: any) {
  router.push({
    path: `/bid/submission/detail/${row.id}`,
  });
}

// 编辑
function handleEdit(row: any) {
  message.info('编辑功能开发中');
}

// 开始生成
async function handleGenerate(row: any) {
  Modal.confirm({
    title: '确认生成',
    content: `确定开始生成"${row.projectName}"的标书吗？`,
    async onOk() {
      await submissionGenerate(row.id);
      message.success('已开始生成，请稍后查看进度');
      gridRef.value?.commitProxy('query');
    },
  });
}

// 查看进度
function handleViewProgress(row: any) {
  currentSubmissionId.value = row.id;
  progressModalOpen.value = true;
}

// 删除
async function handleDelete(row: any) {
  await submissionRemove(row.id);
  message.success('删除成功');
  gridRef.value?.commitProxy('query');
}

// 导出
async function handleExport() {
  const form = gridRef.value?.getProxyInfo()?.form || {};
  await submissionExport(form);
  message.success('导出成功');
}
</script>
