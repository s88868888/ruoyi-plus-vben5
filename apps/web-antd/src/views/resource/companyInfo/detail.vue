<script setup lang="ts">
import type { BizCompanyInfo } from '#/api/resource/companyInfo';

import { ref, onMounted, useTemplateRef } from 'vue';
import { useRoute } from 'vue-router';
import { Page } from '@vben/common-ui';
import {
  Card,
  Tabs,
  TabPane,
} from 'ant-design-vue';


import { companyInfo } from '#/api/resource/companyInfo';
import { deptInfo } from '#/api/system/dept';
import { ossInfo } from '#/api/system/oss';

// 需要将ossId转为URL的图片字段
const imgFields = ['businessLicenseImg', 'companyLogo', 'safetyPermitImg', 'bankAccountImg'] as const;
import CompanyBaseInfo from './modules/company-base-info.vue';
import CompanyInfoDrawer from './modules/company-info-drawer.vue';
import PersonnelInfo from './modules/personnel-info.vue';
import ProductInfo from './modules/product-info.vue';
import QualificationInfo from './modules/qualification-info.vue';
import PerformanceInfo from './modules/performance-info.vue';
import PatentMedalInfo from './modules/patent-medal-info.vue';
import FinanceInfo from './modules/finance-info.vue';
import KnowledgeInfo from './modules/knowledge-info.vue';
import CompetitorInfo from './modules/competitor-info.vue';

const route = useRoute();

// 数据
const loading = ref(false);
const deptId = ref<number | string>();
const deptName = ref<string>('');
const deptStatus = ref<string>('0');
const companyData = ref<BizCompanyInfo>({});
// 用于详情展示的数据（图片字段为URL）
const displayData = ref<BizCompanyInfo>({});
const activeTab = ref('companyInfo');

// 抽屉引用
const drawerRef = useTemplateRef<InstanceType<typeof CompanyInfoDrawer>>('drawerRef');

// 加载数据
async function loadData() {
  if (!deptId.value) return;

  loading.value = true;
  try {
    // 加载部门信息
    const deptRes = await deptInfo(deptId.value);
    deptName.value = deptRes.deptName || '';
    deptStatus.value = deptRes.status || '0';

    // 加载企业信息
    const companyRes = await companyInfo(deptId.value);
    const data = companyRes || { deptId: deptId.value };
    // 保留原始数据（ossId）给编辑表单用
    companyData.value = data;

    // 生成展示用数据（图片字段转为URL）
    const display = { ...data };
    const ossIds = imgFields
      .map((f) => data[f])
      .filter((v) => v && /^\d+$/.test(v))
      .join(',');
    if (ossIds) {
      try {
        const ossList = await ossInfo(ossIds);
        const urlMap = new Map(ossList.map((o) => [o.ossId, o.url]));
        for (const field of imgFields) {
          const id = data[field];
          if (id && urlMap.has(id)) {
            display[field] = urlMap.get(id);
          }
        }
      } catch {
        // oss查询失败不影响页面展示
      }
    }
    displayData.value = display;
  } finally {
    loading.value = false;
  }
}


// 编辑分区
function handleEditSection(section: string) {
  drawerRef.value?.open(section, companyData.value, deptId.value!);
}

// 保存成功后刷新
function handleSaveSuccess() {
  loadData();
}

onMounted(() => {
  const id = route.params.id;
  if (id) {
    deptId.value = id as string;
    loadData();
  }
});
</script>

<template>
  <Page :auto-content-height="true">
    <div class="detail-wrapper">
      <!-- 顶部信息栏 -->
      <!-- <Card :loading="loading" class="mb-3 flex-shrink-0 top-nav-card">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <Button type="text" size="small" @click="handleBack">
              <ArrowLeftOutlined />
              返回
            </Button>
            <div class="text-lg font-semibold">{{ deptName }}</div>
            <Tag :color="deptStatus === '0' ? 'green' : 'red'">
              {{ deptStatus === '0' ? '正常' : '停用' }}
            </Tag>
          </div>
          <Space>
            <Button type="primary" size="small" @click="handleEditSection('license')">
              编辑资料
            </Button>
          </Space>
        </div>
      </Card> -->

      <!-- Tab页 -->
      <Card class="detail-tabs-card">
        <Tabs v-model:activeKey="activeTab">
          <TabPane key="companyInfo" tab="企业信息">
            <CompanyBaseInfo
              :data="displayData"
              :dept-name="deptName"
              @edit-section="handleEditSection"
            />
          </TabPane>
          <TabPane key="personnel" tab="人员信息">
            <PersonnelInfo
              :dept-id="deptId"
              :dept-name="deptName"
              auto-height
            />
          </TabPane>
          <TabPane key="product" tab="产品信息">
            <ProductInfo
              :dept-id="deptId"
              :dept-name="deptName"
              auto-height
            />
          </TabPane>
          <TabPane key="qualification" tab="企业资质">
            <QualificationInfo
              :dept-id="deptId"
              :dept-name="deptName"
              auto-height
            />
          </TabPane>
          <TabPane key="performance" tab="业绩案例">
            <PerformanceInfo
              :dept-id="deptId"
              :dept-name="deptName"
              auto-height
            />
          </TabPane>
          <TabPane key="patent" tab="专利奖章">
            <PatentMedalInfo
              :dept-id="deptId"
              :dept-name="deptName"
              auto-height
            />
          </TabPane>
          <TabPane key="finance" tab="财务信息">
            <FinanceInfo
              :dept-id="deptId"
              :dept-name="deptName"
              auto-height
            />
          </TabPane>
          <TabPane key="competitor" tab="竞争公司">
            <CompetitorInfo
              :dept-id="deptId"
              :dept-name="deptName"
              auto-height
            />
          </TabPane>
          <TabPane key="knowledge" tab="项目知识">
            <KnowledgeInfo
              :dept-id="deptId"
              :dept-name="deptName"
              auto-height
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>

    <!-- 编辑抽屉 -->
    <CompanyInfoDrawer ref="drawerRef" @success="handleSaveSuccess" />
  </Page>
</template>

<style scoped>
.detail-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Tabs Card 撑满剩余空间 */
.detail-tabs-card {
  flex: 1;
  overflow: hidden;
}

.detail-tabs-card :deep(.ant-card-body) {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding-top: 5px;
  padding-bottom: 0;
  overflow: hidden;
}

/* Tabs 高度穿透 */
.detail-tabs-card :deep(.ant-tabs) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.ant-card-head) {
  padding: 10px 16px;
}

.detail-tabs-card :deep(.ant-tabs-nav) {
  flex-shrink: 0;
}

.detail-tabs-card :deep(.ant-tabs-content-holder) {
  flex: 1;
  overflow: hidden;
}

.detail-tabs-card :deep(.ant-tabs-content) {
  height: 100%;
}

.detail-tabs-card :deep(.ant-tabs-tabpane) {
  height: 100%;
  overflow: auto;
  padding-bottom: 50px;
  /* 隐藏滚动条 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.detail-tabs-card :deep(.ant-tabs-tabpane)::-webkit-scrollbar {
  display: none; /* Chrome/Safari/Opera */
}

</style>
