<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { CompanyListVo } from '#/api/resource/companyInfo';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Avatar, Button, Dropdown, Menu, MenuItem, Modal, Space, Tag, message } from 'ant-design-vue';
import { CloudSyncOutlined, EllipsisOutlined, PlusOutlined } from '@ant-design/icons-vue';

import { Page } from '@vben/common-ui';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { companyList, companyInfoRemove, companyInfoSyncVector } from '#/api/resource/companyInfo';
import { useListTablePreference } from '#/preferences/userPreference';

import CommonFilter from '#/components/CommonFilter/index.vue';

const router = useRouter();
const tablePreference = useListTablePreference();

const tableCssVars = computed(() => ({
  '--list-header-bg': tablePreference.headerBgColor,
  '--list-header-color': tablePreference.headerTextColor,
  '--list-header-padding-y': `${tablePreference.headerPaddingY}px`,
  '--list-cell-padding-y': `${tablePreference.cellPaddingY}px`,
}));

// 筛选条件数据
const filterData = ref([
  {
    field: 'deptName',
    label: '公司名称',
    type: 'a-input',
    data: '',
    isCommon: true,
  },
  {
    field: 'unifiedCreditCode',
    label: '统一信用代码',
    type: 'a-input',
    data: '',
    isCommon: true,
  },
  {
    field: 'leaderName',
    label: '负责人',
    type: 'a-input',
    data: '',
    isCommon: false,
  },
  {
    field: 'phone',
    label: '联系电话',
    type: 'a-input',
    data: '',
    isCommon: false,
  },
  {
    field: 'status',
    label: '状态',
    type: 'a-select',
    data: '',
    options: [
      { label: '正常', value: '0' },
      { label: '停用', value: '1' },
    ],
    isCommon: true,
  },
  {
    field: 'establishmentDate',
    label: '成立日期',
    type: 'a-date-picker-start-end',
    data: [],
    format: 'YYYY-MM-DD',
    isCommon: false,
  },
  {
    field: 'createTime',
    label: '创建时间',
    type: 'a-date-picker-start-end',
    data: [],
    format: 'YYYY-MM-DD',
    isCommon: false,
  },
]);

// 存储筛选条件
const searchParams = ref<Record<string, any>>({});

// 处理筛选条件变化
const handleFilterQuery = (conditions: any[]) => {
  const queryParams: Record<string, any> = {};
  conditions.forEach((item) => {
    queryParams[item.key] = item.value;
  });
  searchParams.value = queryParams;
  tableApi.query();
};

// 表格配置
const gridOptions: VxeGridProps = {
  checkboxConfig: {
    highlight: true,
    reserve: true,
  },
  height: 'auto',
  columns: [
    { type: 'checkbox', width: 50 },
    {
      field: 'deptName',
      title: '公司名称',
      minWidth: 200,
      headerAlign: 'left',
      align: 'left',
      slots: { default: 'deptName' },
    },
    { field: 'unifiedCreditCode', title: '统一信用代码', minWidth: 180,
        headerAlign: 'left',
         align: 'left',
     },
    { field: 'leaderName', title: '负责人', width: 100,  headerAlign: 'left',
         align: 'left', },
    { field: 'phone', title: '联系电话', width: 130,  headerAlign: 'left',
         align: 'left', },
    { field: 'email', title: '邮箱', minWidth: 160,  headerAlign: 'left',
         align: 'left', },
    {
      field: 'personnelCount',
      title: '人员数',
      width: 80,
      align: 'right',
      headerAlign: 'right',
      formatter: ({ cellValue }: any) => cellValue || 0,
    },
    {
      field: 'qualificationCount',
      title: '资质数',
      width: 80,
      align: 'right',
      headerAlign: 'right',
      formatter: ({ cellValue }: any) => cellValue || 0,
    },
    {
      field: 'certificateCount',
      title: '证书数',
      width: 80,
      align: 'right',
      headerAlign: 'right',
      formatter: ({ cellValue }: any) => cellValue || 0,
    },
    {
      field: 'status',
      title: '状态',
      width: 80,
      slots: { default: 'status' },
    },
    {
      field: 'action',
      title: '操作',
      width: 120,
      fixed: 'right',
      slots: { default: 'action' },
    },
  ],
  keepSource: true,
  pagerConfig: {},
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues = {}) => {
        return await companyList({
          pageNum: page.currentPage,
          pageSize: page.pageSize,
          ...formValues,
          ...searchParams.value,
        });
      },
    },
  },
  rowConfig: {
    keyField: 'deptId',
  },
  id: 'resource-company-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  gridOptions,
} as any) ;

// 查看详情
function handleView(record: CompanyListVo) {
  router.push(`/resource/companyInfo/view/${record.deptId}`);
}

// 编辑
function handleEdit(record: CompanyListVo) {
  router.push(`/resource/companyInfo/edit/${record.deptId}`);
}

// 删除
function handleDelete(record: CompanyListVo) {
  if (!record.companyInfoId) {
    message.warning('该公司暂无企业信息');
    return;
  }
  Modal.confirm({
    title: `确认删除公司【${record.deptName}】的企业信息吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await companyInfoRemove([record.companyInfoId!]);
      message.success('删除成功');
      await tableApi.query();
    },
  });
}

// 新增公司（跳转到部门管理）
function handleAdd() {
  message.info('请在系统管理-部门管理中新增公司');
}

// 同步向量库
const syncLoading = ref(false);
async function handleSyncVector() {
  syncLoading.value = true;
  try {
    await companyInfoSyncVector();
  } finally {
    syncLoading.value = false;
  }
}

// 根据公司名称生成头像背景色
const avatarColors = [
  '#1677ff', '#13c2c2', '#52c41a', '#faad14',
  '#722ed1', '#eb2f96', '#fa541c', '#2f54eb',
];
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}
</script>

<template>
  <Page :auto-content-height="true">
    <div class="flex h-full flex-col gap-4">
      <!-- 筛选条件区域 -->
      <div class="shrink-0 bg-white p-4 rounded shadow-sm">
        <div class="flex items-center justify-between">
          <CommonFilter
            :filter-data="filterData"
            type="both"
            @handle-query="handleFilterQuery"
          />
          <div class="flex items-center gap-2">
            <Button :loading="syncLoading" @click="handleSyncVector">
              <CloudSyncOutlined />
              同步向量库
            </Button>
            <Button type="primary" @click="handleAdd">
              <PlusOutlined />
              新增公司
            </Button>
          </div>
        </div>
      </div>

      <!-- 表格区域 -->
      <div class="table-style-wrapper flex-1 overflow-hidden" :style="tableCssVars">
        <BasicTable
          class="h-full"
          table-title="公司管理列表"
        >
        <template #deptName="{ row }">
          <div class="flex items-center gap-2">
            <Avatar
              v-if="row.companyLogo"
              :src="row.companyLogo"
              :size="32"
            />
            <Avatar
              v-else
              :size="32"
              :style="{ backgroundColor: getAvatarColor(row.deptName || ''), color: '#fff', fontWeight: 'bold', fontSize: '14px' }"
            >
              {{ row.deptName?.charAt(0) || 'C' }}
            </Avatar>
            <div class="flex flex-col">
              <span class="font-bold">{{ row.deptName }}</span>
              <span v-if="row.enterpriseAbbr" class="text-xs text-gray-400">
                {{ row.enterpriseAbbr }}
              </span>
            </div>
          </div>
        </template>

        <template #status="{ row }">
          <Tag :color="row.status === '0' ? 'green' : 'red'">
            {{ row.status === '0' ? '正常' : '停用' }}
          </Tag>
        </template>

        <template #action="{ row }">
          <Space>
            <ghost-button @click.stop="handleEdit(row)">
              编辑
            </ghost-button>
            <Dropdown placement="bottomRight">
              <template #overlay>
                <Menu @click="({ key }: any) => { if (key === 'delete') handleDelete(row); }">
                  <MenuItem key="view" @click="handleView(row)">
                    详情
                  </MenuItem>
                  <MenuItem key="delete">
                    <span class="text-red-500">删除</span>
                  </MenuItem>
                </Menu>
              </template>
              <a-button size="small" type="link">
                <EllipsisOutlined />
              </a-button>
            </Dropdown>
          </Space>
        </template>
        </BasicTable>
      </div>
    </div>
  </Page>
</template>

<style scoped>
/* 表头背景色 */
.table-style-wrapper :deep(.vxe-table--header-wrapper),
.table-style-wrapper :deep(.vxe-header--column) {
  background-color: var(--list-header-bg) !important;
}

/* 表头文字颜色 */
.table-style-wrapper :deep(.vxe-header--column .vxe-cell) {
  color: var(--list-header-color) !important;
}

/* 表头上下内边距 */
.table-style-wrapper :deep(.vxe-header--column) {
  padding-top: var(--list-header-padding-y) !important;
  padding-bottom: var(--list-header-padding-y) !important;
}

/* 单元格上下内边距 */
.table-style-wrapper :deep(.vxe-body--column) {
  padding-top: var(--list-cell-padding-y) !important;
  padding-bottom: var(--list-cell-padding-y) !important;
}
</style>
