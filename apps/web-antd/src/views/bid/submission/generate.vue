<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message, Steps } from 'ant-design-vue';
import { submissionInfo, type BizBidSubmissionVO } from '#/api/bid/submission';

import Step1Config from './modules/step1-config.vue';
import Step2Generate from './modules/step2-generate.vue';
import Step3Export from './modules/step3-export.vue';

const route = useRoute();
const router = useRouter();

const submissionId = ref<number>(Number(route.params.id));
const currentStep = ref(0);
const loading = ref(false);
const submissionData = ref<BizBidSubmissionVO>();

// 第一步配置数据
const step1Data = ref({
  selectedCompanies: [] as any[],
  generationConfig: [] as any[],
});

// 第二步章节树数据
const step2ChapterTree = ref<any[]>([]);

onMounted(() => {
  loadSubmissionInfo();
});

async function loadSubmissionInfo() {
  loading.value = true;
  try {
    submissionData.value = await submissionInfo(submissionId.value);

    if (submissionData.value.selectedCompanies) {
      try {
        step1Data.value.selectedCompanies = JSON.parse(submissionData.value.selectedCompanies);
      } catch (e) { /* ignore */ }
    }
    if (submissionData.value.generationConfig) {
      try {
        step1Data.value.generationConfig = JSON.parse(submissionData.value.generationConfig);
      } catch (e) { /* ignore */ }
    }

    if (submissionData.value.chapterStructureGenerated === 'Y') {
      currentStep.value = 1;
    }
  } catch (error) {
    message.error('加载投标项目信息失败');
  } finally {
    loading.value = false;
  }
}

function handleStep1Save(data: any) {
  step1Data.value = data;
}

function handleStep1Next() {
  currentStep.value = 1;
}

function handleStep2StructureGenerated(treeData: any[]) {
  step2ChapterTree.value = treeData;
}

function handleStep2Next() {
  currentStep.value = 2;
}

function handlePrev() {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
}

function handleBack() {
  router.push('/bid/submission');
}
</script>

<template>
  <div class="generate-page">
    <!-- 顶部 -->
    <div class="page-header">
      <div class="project-info">
        <h2>{{ submissionData?.projectName }}</h2>
        <span v-if="submissionData?.bidOrg" class="project-org">{{ submissionData?.bidOrg }}</span>
      </div>
      <div class="steps-wrap">
        <Steps
          :current="currentStep"
          class="steps-bar"
          :items="[
            { title: '关联公司与配置参数' },
            { title: '智能生成标书内容' },
            { title: '导出标书文件' },
          ]"
        />
      </div>
    </div>

    <!-- 步骤内容 -->
    <div class="step-content">
      <Step1Config
        v-if="currentStep === 0"
        :submission-id="submissionId"
        :initial-data="step1Data"
        @save="handleStep1Save"
        @next="handleStep1Next"
        @back="handleBack"
      />
      <Step2Generate
        v-if="currentStep === 1"
        :submission-id="submissionId"
        :config-data="step1Data"
        @structure-generated="handleStep2StructureGenerated"
        @prev="handlePrev"
        @next="handleStep2Next"
      />
      <Step3Export
        v-if="currentStep === 2"
        :submission-id="submissionId"
        :chapter-tree="step2ChapterTree"
        @prev="handlePrev"
        @back="handleBack"
      />
    </div>
  </div>
</template>

<style scoped lang="less">
.generate-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f0f2f5;

  .page-header {
    display: flex;
    flex-direction: column;
    padding: 10px;
    background: #fff;
    border-bottom: 1px solid #f0f0f0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    flex-shrink: 0;
    margin: 16px 16px 0 16px;
    border-radius: 8px;

    .project-info {

      h2 {
        margin: 0 0 4px;
        font-size: 18px;
        font-weight: 600;
        color: #1a1a1a;
      }

      .project-org {
        color: #999;
        font-size: 13px;
      }
    }

    .steps-wrap {
      display: flex;
      justify-content: center;
      margin-top: 10px;
      padding-bottom: 10px;

      .steps-bar {
        width: 800px;

        :deep(.ant-steps-item) {
          padding-inline-start: 24px;
        }

        :deep(.ant-steps-item-container) {
          display: flex;
          align-items: center;
        }

        :deep(.ant-steps-item-title) {
          font-size: 16px;
          font-weight: 500;
          line-height: 40px;
        }

        :deep(.ant-steps-item-icon) {
          width: 40px;
          height: 40px;
          line-height: 40px;
          font-size: 18px;
          margin-inline-end: 12px;
        }

        :deep(.ant-steps-item-tail) {
          padding: 4px 24px;
        }

        // 当前步骤使用主题色
        :deep(.ant-steps-item-process .ant-steps-item-icon) {
          background: #1890ff;
          border-color: #1890ff;
        }

        :deep(.ant-steps-item-finish .ant-steps-item-icon) {
          border-color: #52c41a;

          .ant-steps-icon {
            color: #52c41a;
          }
        }

        :deep(.ant-steps-item-finish .ant-steps-item-tail::after) {
          background-color: #52c41a;
        }
      }
    }
  }

  .step-content {
    flex: 1;
    overflow-y: auto;
  }
}
</style>
