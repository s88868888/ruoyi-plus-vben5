<script setup lang="ts">
import type { CompanyListVo } from '#/api/resource/companyInfo';

import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Page, useVbenForm } from '@vben/common-ui';
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Space,
  Popconfirm,
  Pagination,
  Spin,
  Empty,
  Avatar,
  message,
} from 'ant-design-vue';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  FileProtectOutlined,
} from '@ant-design/icons-vue';

import { companyList, companyInfoRemove } from '#/api/resource/companyInfo';
import { querySchema } from './data';

const router = useRouter();

// 列表数据
const loading = ref(false);
const dataList = ref<CompanyListVo[]>([]);
const total = ref(0);
const pageNum = ref(1);
const pageSize = ref(9);

// 搜索表单
const [SearchForm, searchFormApi] = useVbenForm({
  commonConfig: {
    labelWidth: 80,
    componentProps: { allowClear: true },
  },
  schema: querySchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
});

// 加载数据
async function loadData() {
  loading.value = true;
  try {
    const formValues = await searchFormApi.getValues();
    const res = await companyList({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      ...formValues,
    });
    dataList.value = res.rows || [];
    total.value = res.total || 0;
  } finally {
    loading.value = false;
  }
}

// 搜索
function handleSearch() {
  pageNum.value = 1;
  loadData();
}

// 重置
function handleReset() {
  searchFormApi.resetForm();
  pageNum.value = 1;
  loadData();
}

// 分页变化
function handlePageChange(page: number, size: number) {
  pageNum.value = page;
  pageSize.value = size;
  loadData();
}

// 查看详情
function handleView(record: CompanyListVo) {
  router.push(`/resource/companyInfo/detail/${record.deptId}`);
}

// 编辑
function handleEdit(record: CompanyListVo) {
  router.push(`/resource/companyInfo/detail/${record.deptId}?edit=true`);
}

// 删除
async function handleDelete(record: CompanyListVo) {
  if (!record.companyInfoId) {
    message.warning('该公司暂无企业信息');
    return;
  }
  await companyInfoRemove([record.companyInfoId]);
  message.success('删除成功');
  loadData();
}

// 新增公司（跳转到部门管理）
function handleAdd() {
  message.info('请在系统管理-部门管理中新增公司');
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <Page :auto-content-height="true">
    <Card class="mb-4">
      <SearchForm />
      <div class="flex justify-end gap-2 mt-4">
        <Button @click="handleReset">重置</Button>
        <Button type="primary" @click="handleSearch">查询</Button>
        <Button type="primary" @click="handleAdd">
          <PlusOutlined />
          新增公司
        </Button>
      </div>
    </Card>

    <Spin :spinning="loading">
      <div v-if="dataList.length > 0">
        <Row :gutter="[16, 16]">
          <Col
            v-for="item in dataList"
            :key="item.deptId"
            :xs="24"
            :sm="12"
            :lg="8"
          >
            <Card hoverable class="company-card">
              <template #title>
                <div class="flex items-center gap-3">
                  <Avatar
                    v-if="item.companyLogo"
                    :src="item.companyLogo"
                    :size="40"
                  />
                  <Avatar v-else :size="40" class="bg-blue-500">
                    {{ item.deptName?.charAt(0) || 'C' }}
                  </Avatar>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-base truncate">
                      {{ item.deptName }}
                    </div>
                    <div
                      v-if="item.enterpriseAbbr"
                      class="text-gray-400 text-xs"
                    >
                      {{ item.enterpriseAbbr }}
                    </div>
                  </div>
                  <Tag :color="item.status === '0' ? 'green' : 'red'">
                    {{ item.status === '0' ? '正常' : '停用' }}
                  </Tag>
                </div>
              </template>

              <div class="company-info">
                <div class="info-item">
                  <span class="label">统一信用代码：</span>
                  <span class="value">{{
                    item.unifiedCreditCode || '暂无'
                  }}</span>
                </div>
                <div class="info-item">
                  <span class="label">负责人：</span>
                  <span class="value">{{ item.leaderName || '暂无' }}</span>
                </div>
                <div class="info-item">
                  <span class="label">联系电话：</span>
                  <span class="value">{{ item.phone || '暂无' }}</span>
                </div>
              </div>

              <div class="stats-row">
                <div class="stat-item">
                  <SafetyCertificateOutlined class="stat-icon text-blue-500" />
                  <span class="stat-value">{{ item.qualificationCount || 0 }}</span>
                  <span class="stat-label">资质</span>
                </div>
                <div class="stat-item">
                  <TeamOutlined class="stat-icon text-green-500" />
                  <span class="stat-value">{{ item.personnelCount || 0 }}</span>
                  <span class="stat-label">人员</span>
                </div>
                <div class="stat-item">
                  <FileProtectOutlined class="stat-icon text-orange-500" />
                  <span class="stat-value">{{ item.certificateCount || 0 }}</span>
                  <span class="stat-label">证书</span>
                </div>
              </div>

              <template #actions>
                <Space>
                  <Button type="link" size="small" @click="handleView(item)">
                    <EyeOutlined />
                    详情
                  </Button>
                  <Button type="link" size="small" @click="handleEdit(item)">
                    <EditOutlined />
                    编辑
                  </Button>
                  <Popconfirm
                    title="确认删除该公司的企业信息吗？"
                    @confirm="handleDelete(item)"
                  >
                    <Button type="link" size="small" danger>
                      <DeleteOutlined />
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              </template>
            </Card>
          </Col>
        </Row>

        <div class="flex justify-end mt-4">
          <Pagination
            v-model:current="pageNum"
            v-model:pageSize="pageSize"
            :total="total"
            :show-size-changer="true"
            :show-quick-jumper="true"
            :show-total="(t) => `共 ${t} 条`"
            @change="handlePageChange"
          />
        </div>
      </div>

      <Empty v-else description="暂无公司数据" />
    </Spin>
  </Page>
</template>

<style scoped>
.company-card {
  height: 100%;
}

.company-card :deep(.ant-card-head) {
  padding: 12px 16px;
}

.company-card :deep(.ant-card-body) {
  padding: 16px;
}

.company-card :deep(.ant-card-actions) {
  background: #fafafa;
}

.company-info {
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  margin-bottom: 8px;
  font-size: 13px;
}

.info-item .label {
  color: #666;
  flex-shrink: 0;
  width: 100px;
}

.info-item .value {
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats-row {
  display: flex;
  justify-content: space-around;
  padding: 12px 0;
  border-top: 1px solid #f0f0f0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-icon {
  font-size: 20px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.stat-label {
  font-size: 12px;
  color: #999;
}
</style>
