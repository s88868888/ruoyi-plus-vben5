<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message, Steps } from 'ant-design-vue';
import { submissionInfo, type BizBidSubmissionVO } from '#/api/bid/submission';
import { getDocumentConfigList, type BizDocumentConfig } from '#/api/bid/documentConfig';

import Step2Generate from './modules/step2-generate.vue';
import Step3Export from './modules/step3-export.vue';

const route = useRoute();
const router = useRouter();

const submissionId = ref<string>(route.params.id as string);
const documentConfigId = ref<string>(route.params.documentConfigId as string);
const currentStep = ref(0);
const loading = ref(false);
const submissionData = ref<BizBidSubmissionVO>();

// 章节树数据
const chapterTree = ref<any[]>([]);

// 当前文档配置信息
const currentDocumentConfig = ref<BizDocumentConfig>();

onMounted(() => {
  loadSubmissionInfo();
  loadCurrentDocumentConfig();
});

async function loadSubmissionInfo() {
  loading.value = true;
  try {
    submissionData.value = await submissionInfo(submissionId.value);
  } catch (error) {
    message.error('加载投标项目信息失败');
  } finally {
    loading.value = false;
  }
}

async function loadCurrentDocumentConfig() {
  try {
    const configs = await getDocumentConfigList(submissionId.value);
    currentDocumentConfig.value = configs.find(c => c.id === documentConfigId.value);
  } catch (error) {
    message.error('加载文档配置失败');
  }
}

function handleStructureGenerated(treeData: any[]) {
  chapterTree.value = treeData;
}

function handleNext() {
  currentStep.value = 1;
}

function handlePrev() {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
}

function handleBack() {
  router.push(`/bid/submission/config/${submissionId.value}`);
}

// 文档类型映射
const documentTypeMap: Record<string, string> = {
  commercial: '商务标',
  technical: '技术标',
  complete: '整本标书',
};
</script>

<template>
  <div class="generate-page">
    <!-- 顶部 -->
    <div class="page-header">
      <div class="steps-wrap">
        <Steps
          :current="currentStep"
          class="steps-bar"
          :items="[
            { title: '智能生成标书内容' },
            { title: '导出标书文件' },
          ]"
        />
      </div>
    </div>

    <!-- 步骤内容 -->
    <div class="step-content">
      <Step2Generate
        v-if="currentStep === 0"
        :submission-id="submissionId"
        :document-config-id="documentConfigId"
        :submission-data="submissionData"
        :document-config="currentDocumentConfig"
        @structure-generated="handleStructureGenerated"
        @next="handleNext"
        @back="handleBack"
      />
      <Step3Export
        v-if="currentStep === 1"
        :submission-id="submissionId"
        :chapter-tree="chapterTree"
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
    justify-content: center;
    padding: 8px 16px;
    background: #fff;
    border-bottom: 1px solid #f0f0f0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    flex-shrink: 0;
    margin: 10px 16px 0 16px;
    border-radius: 8px;

    .steps-wrap {
      display: flex;
      justify-content: center;
      padding: 10px 0px;
      padding-bottom: 4px;

      .steps-bar {
        width: 600px;

        :deep(.ant-steps-item) {
          padding-inline-start: 16px;
        }

        :deep(.ant-steps-item-container) {
          display: flex;
          align-items: center;
          height: 28px;
        }


        :deep(.ant-steps-item-content) {
          display: flex;
          align-items: center;
          height: 28px;
        }

        :deep(.ant-steps-item-icon) {
          width: 28px;
          height: 28px;
          line-height: 28px;
          font-size: 14px;
          margin-inline-end: 8px;
        }

        :deep(.ant-steps-item-tail) {
          padding: 0 16px;
          top: 14px;
        }

        // 当前步骤使用主题色
        :deep(.ant-steps-item-process .ant-steps-item-icon) {
          background: hsl(var(--primary));
          border-color: hsl(var(--primary));
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
