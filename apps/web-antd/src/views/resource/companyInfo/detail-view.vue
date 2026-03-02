<script setup lang="ts">
import type { BizCompanyInfo } from '#/api/resource/companyInfo';
import type { AnchorNavItem } from '#/components/anchor-nav';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Card, Empty, Space, Spin, Tag, Button } from 'ant-design-vue';
import {
  BankOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  TrophyOutlined,
  ShoppingOutlined,
  ProjectOutlined,
  DollarOutlined,
  BookOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons-vue';

import { AnchorNav } from '#/components/anchor-nav';
import { companyInfo } from '#/api/resource/companyInfo';
import { deptInfo } from '#/api/system/dept';
import { ossInfo } from '#/api/system/oss';
import { useDetailPagePreference } from '#/preferences/userPreference';

import CompanyBaseInfoView from './modules/company-base-info-view.vue';
import PersonnelInfo from './modules/personnel-info.vue';
import ProductInfo from './modules/product-info.vue';
import QualificationInfo from './modules/qualification-info.vue';
import PerformanceInfo from './modules/performance-info.vue';
import PatentMedalInfo from './modules/patent-medal-info.vue';
import FinanceInfo from './modules/finance-info.vue';
import KnowledgeInfo from './modules/knowledge-info.vue';

const route = useRoute();
const router = useRouter();

// 需要将ossId转为URL的图片字段
const imgFields = ['businessLicenseImg', 'companyLogo', 'safetyPermitImg', 'bankAccountImg'] as const;

// 公司详情数据
const companyDetail = ref<BizCompanyInfo>({});
const deptName = ref<string>('');
const deptStatus = ref<string>('0');
const loading = ref(false);
const deptIdNumber = ref<number>();

// 布局偏好设置
const layoutPreference = useDetailPagePreference();

// 锚点导航项配置
const anchorNavItems = ref<AnchorNavItem[]>([
  { key: 'company-base', title: '企业基本信息' },
  { key: 'personnel', title: '人员信息' },
  { key: 'qualification', title: '资质信息' },
  { key: 'product', title: '产品信息' },
  { key: 'performance', title: '业绩信息' },
  { key: 'patent-medal', title: '专利荣誉' },
  { key: 'finance', title: '财务信息' },
  { key: 'knowledge', title: '知识库' },
]);

// 滚动容器引用
const scrollContainer = ref<HTMLElement | null>(null);

const containerStyle = computed(() => {
  if (layoutPreference.contentWidth > 0) {
    return {
      maxWidth: `${layoutPreference.contentWidth}px`,
      margin: '0 auto',
      padding: '20px 24px',
    };
  }
  return { padding: '20px' };
});

// 卡片圆角样式
const cardRadiusStyle = computed(() => ({
  borderRadius: `${layoutPreference.cardRadius}px`,
}));

// 内容字体样式
const contentFontStyle = computed(() => ({
  fontSize: `${layoutPreference.fontSize}px`,
}));

// 卡片头部样式
const cardHeaderStyle = computed(() => ({
  background: layoutPreference.cardHeaderBg,
  color: layoutPreference.cardHeaderColor,
  fontSize: `${layoutPreference.cardTitleSize}px`,
  padding: `${layoutPreference.cardHeaderPaddingY}px 16px`,
}));

// 卡片内容样式
const cardBodyStyle = computed(() => ({
  padding: `${layoutPreference.cardBodyPaddingY}px 16px`,
}));

// 加载公司信息
async function loadCompanyInfo() {
  const deptId = route.params.id;
  if (!deptId) return;

  loading.value = true;
  try {
    // 加载部门信息
    const deptRes = await deptInfo(deptId as any);
    deptName.value = deptRes.deptName || '';
    deptStatus.value = deptRes.status || '0';

    // 加载企业信息
    const companyRes = await companyInfo(deptId as any);
    const data = companyRes || { deptId: Number(deptId) };

    // 保存数字类型的 deptId
    deptIdNumber.value = Number(deptId);

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

    companyDetail.value = display;
  } catch (error) {
    console.error('加载公司信息失败:', error);
  } finally {
    loading.value = false;
  }
}

// 返回列表
function handleBack() {
  router.push('/resource/companyInfo');
}

// 编辑
function handleEdit() {
  router.push(`/resource/companyInfo/edit/${route.params.id}`);
}

// 格式化日期
function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return dateStr.split(' ')[0] || '-';
}

onMounted(() => {
  loadCompanyInfo();
});
</script>

<template>
  <div class="detail-page-layout">
    <!-- 侧边锚点导航 -->
    <div
      v-if="layoutPreference.showAnchorNav"
      class="side-nav-panel hide-scrollbar"
      :style="{
        width: `${layoutPreference.anchorNavWidth}px`,
        margin: `20px ${layoutPreference.anchorNavMarginRight}px 20px ${layoutPreference.anchorNavMarginLeft}px`,
      }"
    >
      <AnchorNav :items="anchorNavItems" :container="scrollContainer" />
    </div>

    <!-- 主内容滚动区域 -->
    <div
      ref="scrollContainer"
      class="main-scroll-area hide-scrollbar"
      :style="{ left: layoutPreference.showAnchorNav ? `${layoutPreference.anchorNavMarginLeft + layoutPreference.anchorNavWidth + layoutPreference.anchorNavMarginRight}px` : '0' }"
    >
      <Spin :spinning="loading">
        <div :style="containerStyle">
          <!-- 顶部基本信息卡片 -->
          <div class="header-card" :style="cardRadiusStyle">
            <div class="header-title-row">
              <div class="header-left">
                <Button type="text" @click="handleBack" class="back-button">
                  <ArrowLeftOutlined />
                </Button>
                <span class="header-company-name">{{ deptName || '公司详情' }}</span>
                <Tag v-if="deptStatus === '0'" color="success">正常</Tag>
                <Tag v-else color="error">停用</Tag>
              </div>
              <Button type="primary" @click="handleEdit">编辑</Button>
            </div>
            <div class="header-metrics-row" :style="contentFontStyle">
              <div class="header-metric">
                <div class="header-metric-label">统一信用代码</div>
                <div class="header-metric-value">{{ companyDetail.unifiedCreditCode || '-' }}</div>
              </div>
              <div class="header-metric">
                <div class="header-metric-label">法定代表人</div>
                <div class="header-metric-value">{{ companyDetail.legalPerson || '-' }}</div>
              </div>
              <div class="header-metric">
                <div class="header-metric-label">注册资本</div>
                <div class="header-metric-value">{{ companyDetail.registeredCapital || '-' }}</div>
              </div>
              <div class="header-metric">
                <div class="header-metric-label">企业性质</div>
                <div class="header-metric-value">{{ companyDetail.enterpriseNature || '-' }}</div>
              </div>
              <div class="header-metric">
                <div class="header-metric-label">成立日期</div>
                <div class="header-metric-value">{{ formatDate(companyDetail.establishmentDate) }}</div>
              </div>
              <div class="header-metric">
                <div class="header-metric-label">企业规模</div>
                <div class="header-metric-value">{{ companyDetail.enterpriseScale || '-' }}</div>
              </div>
              <div class="header-metric">
                <div class="header-metric-label">行业类别</div>
                <div class="header-metric-value">{{ companyDetail.industryCategory || '-' }}</div>
              </div>
              <div class="header-metric">
                <div class="header-metric-label">企业地区</div>
                <div class="header-metric-value">{{ companyDetail.enterpriseRegion || '-' }}</div>
              </div>
            </div>
          </div>

          <!-- 内容卡片 -->
          <div class="cards-wrapper">
            <!-- 企业基本信息 -->
            <Card
              :id="anchorNavItems[0].key"
              class="detail-card mb-4"
              :style="cardRadiusStyle"
            >
              <template #title>
                <span class="card-title">
                  <BankOutlined class="card-title-icon" />
                  企业基本信息
                </span>
              </template>
              <CompanyBaseInfoView :data="companyDetail" :dept-name="deptName" />
            </Card>

            <!-- 人员信息 -->
            <Card
              :id="anchorNavItems[1].key"
              class="detail-card mb-4"
              :style="cardRadiusStyle"
            >
              <template #title>
                <span class="card-title">
                  <TeamOutlined class="card-title-icon" />
                  人员信息
                </span>
              </template>
              <PersonnelInfo :dept-id="deptIdNumber" :dept-name="deptName" readonly />
            </Card>

            <!-- 资质信息 -->
            <Card
              :id="anchorNavItems[2].key"
              class="detail-card mb-4"
              :style="cardRadiusStyle"
            >
              <template #title>
                <span class="card-title">
                  <SafetyCertificateOutlined class="card-title-icon" />
                  资质信息
                </span>
              </template>
              <QualificationInfo :dept-id="deptIdNumber" :dept-name="deptName" readonly />
            </Card>

            <!-- 产品信息 -->
            <Card
              :id="anchorNavItems[3].key"
              class="detail-card mb-4"
              :style="cardRadiusStyle"
            >
              <template #title>
                <span class="card-title">
                  <ShoppingOutlined class="card-title-icon" />
                  产品信息
                </span>
              </template>
              <ProductInfo :dept-id="deptIdNumber" :dept-name="deptName" readonly />
            </Card>

            <!-- 业绩信息 -->
            <Card
              :id="anchorNavItems[4].key"
              class="detail-card mb-4"
              :style="cardRadiusStyle"
            >
              <template #title>
                <span class="card-title">
                  <ProjectOutlined class="card-title-icon" />
                  业绩信息
                </span>
              </template>
              <PerformanceInfo :dept-id="deptIdNumber" :dept-name="deptName" readonly />
            </Card>

            <!-- 专利荣誉 -->
            <Card
              :id="anchorNavItems[5].key"
              class="detail-card mb-4"
              :style="cardRadiusStyle"
            >
              <template #title>
                <span class="card-title">
                  <TrophyOutlined class="card-title-icon" />
                  专利荣誉
                </span>
              </template>
              <PatentMedalInfo :dept-id="deptIdNumber" :dept-name="deptName" readonly />
            </Card>

            <!-- 财务信息 -->
            <Card
              :id="anchorNavItems[6].key"
              class="detail-card mb-4"
              :style="cardRadiusStyle"
            >
              <template #title>
                <span class="card-title">
                  <DollarOutlined class="card-title-icon" />
                  财务信息
                </span>
              </template>
              <FinanceInfo :dept-id="deptIdNumber" :dept-name="deptName" readonly />
            </Card>

            <!-- 知识库 -->
            <Card
              :id="anchorNavItems[7].key"
              class="detail-card"
              :style="cardRadiusStyle"
            >
              <template #title>
                <span class="card-title">
                  <BookOutlined class="card-title-icon" />
                  知识库
                </span>
              </template>
              <KnowledgeInfo :dept-id="deptIdNumber" :dept-name="deptName" readonly />
            </Card>
          </div>
        </div>
      </Spin>
    </div>
  </div>
</template>

<style scoped>
/* 隐藏滚动条 */
.hide-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

/* ========== 页面整体布局 ========== */
.detail-page-layout {
  position: relative;
  height: 100%;
  overflow: hidden;
}

/* 侧边导航面板 — 绝对定位，不随内容滚动 */
.side-nav-panel {
  position: absolute;
  left: 0;
  top: 0;
  height: 800px;
  background: #ffffff;
  z-index: 10;
  padding: 8px 10px;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
}

/* 主内容滚动区 — 绝对定位，左侧偏移由 showAnchorNav 动态控制 */
.main-scroll-area {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
}

/* ========== 顶部基本信息卡片 ========== */
.header-card {
  background: #fff;
  padding: 24px 32px;
  border: 1px solid #d8d8d8;
  flex-shrink: 0;
}

.header-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-button {
  padding: 4px 8px;
  font-size: 16px;
}

.header-company-name {
  font-size: 20px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.header-metrics-row {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  column-gap: 32px;
  row-gap: 16px;
  padding: 16px 0 0;
  border-top: 1px solid #f0f0f0;
}

.header-metric {
  padding: 0;
  min-width: 140px;
}

.header-metric-label {
  color: #909399;
  font-size: 13px;
  line-height: 20px;
  margin-bottom: 4px;
}

.header-metric-value {
  color: rgba(0, 0, 0, 0.88);
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
}

/* ========== 内容卡片包装 ========== */
.cards-wrapper {
  padding: 16px 0 24px;
}

/* ========== 内容卡片 ========== */
.detail-card {
  overflow: hidden;
}

.detail-card :deep(.ant-card-head) {
  min-height: 46px;
  border-bottom: 1px solid #f0f0f0;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.card-title-icon {
  color: hsl(var(--primary));
  font-size: 16px;
  margin-right: 8px;
}

/* ========== 响应式 ========== */
@media (max-width: 1200px) {
  .header-metrics-row {
    flex-wrap: wrap;
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .header-metrics-row {
    flex-wrap: wrap;
    gap: 16px;
  }
}
</style>
