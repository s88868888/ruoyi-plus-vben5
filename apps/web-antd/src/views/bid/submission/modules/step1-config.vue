<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Button, Empty, InputNumber, message, Space, Statistic } from 'ant-design-vue';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons-vue';
import { companyList } from '#/api/resource/companyInfo';

interface Props {
  submissionId: number;
  initialData?: {
    selectedCompanies: any[];
    generationConfig: any[];
  };
}

const props = defineProps<Props>();
const emit = defineEmits(['save', 'next', 'back']);

const router = useRouter();
const loading = ref(false);
const saving = ref(false);

// 公司列表数据
const companyDataSource = ref<any[]>([]);

onMounted(() => {
  loadCompanyList();
});

// 加载公司列表
async function loadCompanyList() {
  loading.value = true;
  try {
    const res = await companyList({ pageNum: 1, pageSize: 1000 });
    companyDataSource.value = (res.rows || []).map((item: any) => ({
      key: String(item.deptId),
      deptId: item.deptId,
      deptName: item.deptName,
      unifiedCreditCode: item.unifiedCreditCode,
      leaderName: item.leaderName,
      commercial: 0,
      technical: 0,
      complete: 1,
      selected: false,
    }));

    // 恢复之前的配置
    if (props.initialData?.generationConfig && props.initialData.generationConfig.length > 0) {
      props.initialData.generationConfig.forEach((config: any) => {
        const index = companyDataSource.value.findIndex((c) => c.deptId === config.deptId);
        if (index !== -1) {
          companyDataSource.value[index].commercial = config.commercial || 0;
          companyDataSource.value[index].technical = config.technical || 0;
          companyDataSource.value[index].complete = config.complete || 0;
          companyDataSource.value[index].selected = true;
        }
      });
    }
  } catch (error) {
    console.error('加载公司列表失败:', error);
    message.error('加载公司列表失败');
  } finally {
    loading.value = false;
  }
}

// 更新配置数量
function updateConfigValue(record: any, field: string, value: number) {
  const index = companyDataSource.value.findIndex((c) => c.key === record.key);
  if (index !== -1) {
    companyDataSource.value[index][field] = value || 0;
  }
}

// 切换选中状态
function toggleSelect(company: any) {
  const index = companyDataSource.value.findIndex((c) => c.key === company.key);
  if (index !== -1) {
    companyDataSource.value[index].selected = !companyDataSource.value[index].selected;
  }
}

// 跳转公司详情
function goToCompanyDetail(deptId: number, event: Event) {
  event.stopPropagation();
  router.push(`/resource/companyInfo/detail/${deptId}`);
}

// 计算每个公司的总数
function getCompanyTotal(company: any) {
  return (company.commercial || 0) + (company.technical || 0) + (company.complete || 0);
}

// 计算统计信息
const statistics = computed(() => {
  const selected = companyDataSource.value.filter((c) => c.selected);
  return {
    companyCount: selected.length,
    commercialTotal: selected.reduce((sum, c) => sum + (c.commercial || 0), 0),
    technicalTotal: selected.reduce((sum, c) => sum + (c.technical || 0), 0),
    completeTotal: selected.reduce((sum, c) => sum + (c.complete || 0), 0),
    documentTotal: selected.reduce((sum, c) => sum + getCompanyTotal(c), 0),
  };
});

// 保存配置
async function handleSave() {
  const selectedCompanies = companyDataSource.value.filter((c) => c.selected);

  if (selectedCompanies.length === 0) {
    message.warning('请至少选择一个公司');
    return;
  }

  saving.value = true;
  try {
    // TODO: 调用后端保存接口
    emit('save', {
      selectedCompanies,
      generationConfig: selectedCompanies,
    });

    message.success('配置已保存');
  } catch (error) {
    console.error('保存配置失败:', error);
    message.error('保存配置失败');
  } finally {
    saving.value = false;
  }
}

// 下一步
function handleNext() {
  const selectedCompanies = companyDataSource.value.filter((c) => c.selected);

  if (selectedCompanies.length === 0) {
    message.warning('请至少选择一个公司');
    return;
  }

  emit('next');
}

// 返回
function handleBack() {
  emit('back');
}
</script>

<template>
  <div class="step1-config">
    <!-- 统计信息栏 -->
    <div class="statistics-bar">
      <Statistic title="已选公司" :value="statistics.companyCount" suffix="家" />
      <Statistic title="商务标" :value="statistics.commercialTotal" suffix="份" />
      <Statistic title="技术标" :value="statistics.technicalTotal" suffix="份" />
      <Statistic title="整本标书" :value="statistics.completeTotal" suffix="份" />
      <Statistic
        title="文档总数"
        :value="statistics.documentTotal"
        suffix="份"
        :value-style="{ color: '#52c41a' }"
      />
    </div>

    <!-- 公司卡片列表 -->
    <div v-if="!loading && companyDataSource.length > 0" class="company-grid">
      <div
        v-for="company in companyDataSource"
        :key="company.key"
        class="company-card"
        :class="{ selected: company.selected }"
        @click="toggleSelect(company)"
      >
        <!-- 选中状态图标 -->
        <div class="select-indicator">
          <CheckCircleOutlined v-if="company.selected" class="icon-selected" />
          <CloseCircleOutlined v-else class="icon-unselected" />
        </div>

        <!-- 公司信息 -->
        <div class="company-header">
          <div class="company-info">
            <a
              class="company-name"
              @click="(e) => goToCompanyDetail(company.deptId, e)"
            >
              {{ company.deptName }}
            </a>
            <div v-if="company.unifiedCreditCode" class="company-code">
              {{ company.unifiedCreditCode }}
            </div>
          </div>
          <div v-if="company.selected && getCompanyTotal(company) > 0" class="total-badge">
            {{ getCompanyTotal(company) }} 份
          </div>
        </div>

        <!-- 配置区域 -->
        <div class="config-section" @click.stop>
          <div class="config-item">
            <label>商务标</label>
            <InputNumber
              :value="company.commercial"
              :min="0"
              :max="10"
              size="large"
              @change="(value) => updateConfigValue(company, 'commercial', value)"
            />
          </div>
          <div class="config-item">
            <label>技术标</label>
            <InputNumber
              :value="company.technical"
              :min="0"
              :max="10"
              size="large"
              @change="(value) => updateConfigValue(company, 'technical', value)"
            />
          </div>
          <div class="config-item">
            <label>整本标书</label>
            <InputNumber
              :value="company.complete"
              :min="0"
              :max="10"
              size="large"
              @change="(value) => updateConfigValue(company, 'complete', value)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <Empty v-else-if="!loading && companyDataSource.length === 0" description="暂无公司数据" />

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <Space :size="16">
        <Button size="large" @click="handleBack">返回列表</Button>
        <Button size="large" :loading="saving" @click="handleSave">保存配置</Button>
        <Button type="primary" size="large" @click="handleNext">下一步</Button>
      </Space>
    </div>
  </div>
</template>

<style scoped lang="less">
.step1-config {
  padding: 16px;

  .statistics-bar {
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: 24px;
    margin-bottom: 16px;
    padding: 16px 24px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

    :deep(.ant-statistic) {
      text-align: center;
    }

    :deep(.ant-statistic-title) {
      color: #666;
      font-size: 14px;
    }

    :deep(.ant-statistic-content) {
      font-size: 24px;
      font-weight: 600;
    }
  }

  .company-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 16px;
  }

  .company-card {
    position: relative;
    padding: 20px;
    background: #fff;
    border: 2px solid #e8e8e8;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      border-color: #1890ff;
      box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
    }

    &.selected {
      border-color: #1890ff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
    }

    .select-indicator {
      position: absolute;
      top: 16px;
      right: 16px;
      font-size: 24px;

      .icon-selected {
        color: #1890ff;
      }

      .icon-unselected {
        color: #d9d9d9;
      }
    }

    .company-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 12px;
      padding-right: 40px;
      border-bottom: 1px solid #f0f0f0;

      .company-info {
        flex: 1;

        .company-name {
          display: block;
          margin-bottom: 8px;
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
          text-decoration: none;

          &:hover {
            color: #1890ff;
            text-decoration: underline;
          }
        }

        .company-code {
          color: #999;
          font-size: 13px;
        }
      }

      .total-badge {
        padding: 4px 12px;
        background: #1890ff;
        border-radius: 12px;
        color: #fff;
        font-size: 14px;
        font-weight: 600;
      }
    }

    .config-section {
      display: flex;
      gap: 12px;

      .config-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;

        label {
          color: #666;
          font-size: 13px;
          font-weight: 500;
        }

        :deep(.ant-input-number) {
          width: 100%;
        }
      }
    }
  }

  .action-buttons {
    padding-top: 16px;
    border-top: 1px solid #f0f0f0;
    text-align: right;
  }
}
</style>
