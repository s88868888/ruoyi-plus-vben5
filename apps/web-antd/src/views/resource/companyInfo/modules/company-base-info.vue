<script setup lang="ts">
import type { BizCompanyInfo } from '#/api/resource/companyInfo';

import { Card, Button, Image } from 'ant-design-vue';
import {
  EditOutlined,
  FileTextOutlined,
  BankOutlined,
  CreditCardOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons-vue';

defineProps<{
  data: BizCompanyInfo;
  deptName?: string;
}>();

const emit = defineEmits<{
  editSection: [section: string];
}>();

// 格式化日期，移除时分秒
function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return dateStr.split(' ')[0]||'-';
}
</script>

<template>
  <div class="company-base-info">
    <!-- 营业执照信息 -->
    <Card class="mb-4" size="small">
      <template #title>
        <span class="font-semibold">
          <FileTextOutlined class="card-title-icon" />
          营业执照信息
        </span>
      </template>
      <template #extra>
        <Button type="link" size="small" @click="emit('editSection', 'license')">
          <EditOutlined />
          编辑
        </Button>
      </template>
      <div class="license-layout">
        <!-- 左侧：营业执照图片 -->
        <div class="license-layout-left">
          <Image
            v-if="data.businessLicenseImg"
            :src="data.businessLicenseImg"
            :width="280"
            :height="180"
            placeholder
            class="license-image"
          />
          <div v-else class="license-placeholder">
            <span class="license-placeholder-text">营业执照</span>
          </div>
        </div>
        <!-- 右侧：字段信息 -->
        <div class="license-layout-right">
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">公司名称</div>
              <div class="info-value">{{ deptName || '-' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">信用代码</div>
              <div class="info-value">{{ data.unifiedCreditCode || '-' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">法定代表</div>
              <div class="info-value">{{ data.legalPerson || '-' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">注册资本</div>
              <div class="info-value">{{ data.registeredCapital || '-' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">企业性质</div>
              <div class="info-value">{{ data.enterpriseNature || '-' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">成立日期</div>
              <div class="info-value">{{ formatDate(data.establishmentDate) }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">登记机关</div>
              <div class="info-value">{{ data.registrationAuthority || '-' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">核准日期</div>
              <div class="info-value">{{ formatDate(data.registrationDate) }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">营业期限</div>
              <div class="info-value">{{ data.businessLongTerm === '1' ? '长期' : formatDate(data.businessEndDate) }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">企业简称</div>
              <div class="info-value">{{ data.enterpriseAbbr || '-' }}</div>
            </div>
            <div class="info-item ">
              <div class="info-label">所在地区</div>
              <div class="info-value">{{ data.enterpriseRegion || '-' }}</div>
            </div>
            <div class="info-item ">
              <div class="info-label">注册地址</div>
              <div class="info-value">{{ data.registeredAddress || '-' }}</div>
            </div>
            <div class="info-item info-item-full">
              <div class="info-label">经营范围</div>
              <div class="info-value">{{ data.businessScope || '-' }}</div>
            </div>

          </div>
        </div>
      </div>
    </Card>

    <!-- 企业信息 -->
    <Card class="mb-4" size="small">
      <template #title>
        <span class="font-semibold">
          <BankOutlined class="card-title-icon" />
          企业信息
        </span>
      </template>
      <template #extra>
        <Button type="link" size="small" @click="emit('editSection', 'enterprise')">
          <EditOutlined />
          编辑
        </Button>
      </template>
      <div class="license-layout">
        <!-- 左侧：公司Logo + 安全生产许可证 + 组织架构图 -->
        <div class="license-layout-left enterprise-images">
          <div class="image-block">
            <Image
              v-if="data.companyLogo"
              :src="data.companyLogo"
              :width="280"
              :height="180"
              placeholder
              class="license-image"
            />
            <div v-else class="license-placeholder">
              <span class="license-placeholder-text">公司Logo</span>
            </div>
          </div>
          <div class="image-block">
            <Image
              v-if="data.safetyPermitImg"
              :src="data.safetyPermitImg"
              :width="280"
              :height="180"
              placeholder
              class="license-image"
            />
            <div v-else class="license-placeholder">
              <span class="license-placeholder-text">安全生产许可证</span>
            </div>
          </div>
        </div>
        <!-- 右侧：字段信息 -->
        <div class="license-layout-right">
          <div class="info-grid">
        <div class="info-item">
          <div class="info-label">企业规模</div>
          <div class="info-value">{{ data.enterpriseScale || '-' }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">行业类别</div>
          <div class="info-value">{{ data.industryCategory || '-' }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">公司地址</div>
          <div class="info-value">{{ data.companyAddress || '-' }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">公司网站</div>
          <div class="info-value">{{ data.companyWebsite || '-' }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">企业电话</div>
          <div class="info-value">{{ data.enterprisePhone || '-' }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">企业传真</div>
          <div class="info-value">{{ data.enterpriseFax || '-' }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">研发费用</div>
          <div class="info-value">{{ data.rdExpense ? `${data.rdExpense} 万元` : '-' }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">员工总数</div>
          <div class="info-value">{{ data.totalEmployees ?? '-' }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">高级职称人数</div>
          <div class="info-value">{{ data.seniorTitleCount ?? '-' }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">中级职称人数</div>
          <div class="info-value">{{ data.juniorTitleCount ?? '-' }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">投标经理人数</div>
          <div class="info-value">{{ data.bidManagerCount ?? '-' }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">投标员人数</div>
          <div class="info-value">{{ data.bidWorkerCount ?? '-' }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">造价师人数</div>
          <div class="info-value">{{ data.bidCostManagerCount ?? '-' }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">证书编号</div>
          <div class="info-value">{{ data.certificateNumber || '-' }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">安全许可证到期日</div>
          <div class="info-value">{{ data.safetyPermitExpiry || '-' }}</div>
        </div>
          </div>
        </div>
      </div>
    </Card>

    <!-- 开户信息 -->
    <Card class="mb-4" size="small">
      <template #title>
        <span class="font-semibold">
          <CreditCardOutlined class="card-title-icon" />
          开户信息
        </span>
      </template>
      <template #extra>
        <Button type="link" size="small" @click="emit('editSection', 'bank')">
          <EditOutlined />
          编辑
        </Button>
      </template>
      <div class="license-layout">
        <!-- 左侧：开户图片 -->
        <div class="license-layout-left">
          <Image
            v-if="data.bankAccountImg"
            :src="data.bankAccountImg"
            :width="280"
            :height="180"
            placeholder
            class="license-image"
          />
          <div v-else class="license-placeholder">
            <span class="license-placeholder-text">开户许可证</span>
          </div>
        </div>
        <!-- 右侧：字段信息 -->
        <div class="license-layout-right">
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">开户名称</div>
              <div class="info-value">{{ data.accountName || '-' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">开户银行</div>
              <div class="info-value">{{ data.accountBank || '-' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">银行账号</div>
              <div class="info-value">{{ data.accountNumber || '-' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">联行号</div>
              <div class="info-value">{{ data.bankUnionNumber || '-' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">银行电话</div>
              <div class="info-value">{{ data.bankPhone || '-' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">银行地址</div>
              <div class="info-value">{{ data.bankAddress || '-' }}</div>
            </div>
          </div>
        </div>
      </div>
    </Card>

    <!-- 其他信息 -->
    <Card size="small">
      <template #title>
        <span class="font-semibold">
          <InfoCircleOutlined class="card-title-icon" />
          其他信息
        </span>
      </template>
      <template #extra>
        <Button type="link" size="small" @click="emit('editSection', 'other')">
          <EditOutlined />
          编辑
        </Button>
      </template>
      <div class="license-layout">
        <div class="info-spacer"></div>
        <div class="license-layout-right">
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">年生产能力</div>
              <div class="info-value">{{ data.annualProductionCapacity || '-' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">控股服务</div>
              <div class="info-value">{{ data.holdingService || '-' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">控股股东比例</div>
              <div class="info-value">{{ data.holdingShareholderRatio || '-' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">委托服务</div>
              <div class="info-value">{{ data.entrustedService || '-' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">实际股东比例</div>
              <div class="info-value">{{ data.actualShareholderRatio || '-' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">管理体系认证</div>
              <div class="info-value">{{ data.managementCertification || '-' }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">社会团体等级</div>
              <div class="info-value">{{ data.socialGroupLevel || '-' }}</div>
            </div>
            <div class="info-item info-item-full">
              <div class="info-label">信用处罚信息</div>
              <div class="info-value">{{ data.creditPenaltyInfo || '-' }}</div>
            </div>
            <div class="info-item info-item-full">
              <div class="info-label">近期诉讼</div>
              <div class="info-value">{{ data.recentLitigation || '-' }}</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  </div>
</template>

<style scoped>


.card-title-icon {
  color: hsl(var(--primary));
  font-size: 18px;
}

/* 覆盖 Card 默认样式 */
.company-base-info :deep(.ant-card-body) {
  padding: 12px 24px;
}

/* 营业执照布局：左图右文 */
.license-layout {
  display: flex;
  gap: 24px;
}

.license-layout-left {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  padding: 20px;
}

.license-layout-right {
  flex: 1;
  min-width: 0;
}

.license-image {
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.3s;
}

.license-image:hover {
  border-color: #1890ff;
}

.license-placeholder {
  width: 280px;
  height: 180px;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.license-placeholder-text {
  color: rgba(0, 0, 0, 0.25);
  font-size: 16px;
}

.enterprise-images {
  flex-direction: column;
  gap: 16px;
}

.image-block {
  text-align: center;
}

.image-title {
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
  margin-bottom: 8px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px 24px;
  align-items: flex-start;
  padding: 20px 20px 20px 60px;
}

/* 无图片时占位，对齐有图片卡片的字段位置 */
.info-spacer {
  flex-shrink: 0;
  width: 320px;
}

.info-item {
  display: flex;
  gap: 12px;
  min-height: 32px;
  align-items: flex-start;
}

.info-item-full {
  grid-column: 1 / -1;
}

.info-label {
  flex-shrink: 0;
  width: 140px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 14px;
  line-height: 22px;
  text-align: right;
}

.info-label::after {
  content: '：';
}

.info-value {
  flex: 1;
  color: rgba(0, 0, 0, 0.88);
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  word-break: break-all;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .license-layout {
    flex-direction: column;
  }

  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .info-label {
    width: 100px;
  }
}
</style>
