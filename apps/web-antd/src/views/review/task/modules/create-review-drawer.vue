<script setup lang="ts">
import { ref, computed } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import {
  message, Steps, Upload, Select, Tag, Alert, Card, Divider,
} from 'ant-design-vue';
import { InboxOutlined } from '@ant-design/icons-vue';

import { reviewTaskAdd } from '#/api/review/task';
import type { CreateTaskParams } from '#/api/review/task/model';
import { reviewStandardList } from '#/api/review/standard';

const emit = defineEmits<{ reload: [] }>();

const currentStep = ref(0);
const fileList = ref<any[]>([]);
const submitting = ref(false);
const formData = ref({
  standardIds: [] as (number | string)[],
});

/** 标准选项列表 - 从 API 加载 */
const standardOptions = ref<{ value: number | string; label: string; ruleCount?: number }[]>([]);
const standardLoading = ref(false);

/** 加载审核标准列表 */
async function loadStandardOptions() {
  standardLoading.value = true;
  try {
    const res = await reviewStandardList({ pageSize: 100 });
    standardOptions.value = (res.rows || []).map((item) => ({
      value: item.id,
      label: item.name + (item.version ? ` ${item.version}` : ''),
      ruleCount: item.ruleCount,
    }));
  } catch {
    message.error('加载审核标准失败');
  } finally {
    standardLoading.value = false;
  }
}

/** 自动生成任务名称 */
function generateTaskName(): string {
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  return `审核任务_${ts}`;
}

/** 提交审核任务 */
async function handleSubmit() {
  submitting.value = true;
  drawerApi.setState({ confirmLoading: true });
  try {
    const params: CreateTaskParams = {
      taskName: generateTaskName(),
      taskType: 'company_info',
      standardIds: formData.value.standardIds.map(Number),
      formSnapshot: '{}',
    };
    await reviewTaskAdd(params);
    message.success('审核任务已提交，AI正在审核中...');
    drawerApi.close();
    emit('reload');
  } catch {
    message.error('提交审核任务失败，请重试');
  } finally {
    submitting.value = false;
    drawerApi.setState({ confirmLoading: false });
  }
}

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => {
    const stepNames = ['配置审核', '确认提交'];
    return `新建审核 - ${stepNames[currentStep.value]}`;
  }),
  onOpenChange: (visible) => {
    if (visible) {
      // 抽屉打开时加载标准列表
      loadStandardOptions();
    } else {
      // 抽屉关闭时重置表单
      currentStep.value = 0;
      fileList.value = [];
      formData.value = { standardIds: [] };
    }
  },
  onConfirm: async () => {
    if (currentStep.value === 0) {
      if (fileList.value.length === 0) {
        message.warning('请先上传待审核文档');
        return;
      }
      if (formData.value.standardIds.length === 0) {
        message.warning('请选择至少一个审核标准');
        return;
      }
      currentStep.value = 1;
      return;
    }
    // 最终步骤：调用 API 提交
    await handleSubmit();
  },
  confirmText: computed(() => currentStep.value < 1 ? '下一步' : '提交审核'),
  cancelText: computed(() => currentStep.value === 0 ? '取消' : '上一步'),
  onCancel: () => {
    if (currentStep.value > 0) {
      currentStep.value--;
      return false;
    }
    return true;
  },
});
</script>

<template>
  <BasicDrawer class="w-[800px]">
    <Steps :current="currentStep" size="small" style="margin-bottom: 24px;">
      <Steps.Step title="配置审核" />
      <Steps.Step title="确认提交" />
    </Steps>

    <!-- Step 1: 上传文档 + 选择审核标准 -->
    <div v-show="currentStep === 0">
      <Divider orientation="left" class="section-title-divider">
        <span class="section-title">上传文档</span>
      </Divider>
      <Upload.Dragger
        v-model:file-list="fileList"
        :multiple="true"
        :before-upload="() => false"
      >
        <p class="ant-upload-drag-icon"><InboxOutlined /></p>
        <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p class="ant-upload-hint">支持 Word、PDF、Excel 格式，可批量上传</p>
      </Upload.Dragger>

      <Divider orientation="left" class="section-title-divider" style="margin-top: 24px;">
        <span class="section-title">审核标准</span>
      </Divider>
      <Select
        v-model:value="formData.standardIds"
        mode="multiple"
        placeholder="请选择审核标准（可多选）"
        style="width: 100%; margin-bottom: 12px;"
        :options="standardOptions"
        :option-label-prop="'label'"
        :loading="standardLoading"
      />
      <Alert
        message="系统会自动附加通用规范（违法违规检测、敏感词检测、基础格式检查）"
        type="info"
        show-icon
      />

    </div>

    <!-- Step 2: 确认提交 -->
    <div v-show="currentStep === 1">
      <Divider orientation="left" class="section-title-divider">
        <span class="section-title">审核信息确认</span>
      </Divider>
      <Card size="small" style="margin-bottom: 16px;">
        <div style="line-height: 2.4;">
          <div><strong>文档数量：</strong>{{ fileList.length }} 份</div>
          <div>
            <strong>文档列表：</strong>
            <div v-for="f in fileList" :key="f.uid" style="padding-left: 16px; color: #666; font-size: 13px;">
              {{ f.name }}
            </div>
          </div>
          <div>
            <strong>审核标准：</strong>
            <div style="margin-top: 4px;">
              <Tag v-for="id in formData.standardIds" :key="id" color="blue" style="margin: 2px;">
                {{ standardOptions.find(s => s.value === id)?.label }}
              </Tag>
            </div>
          </div>
        </div>
      </Card>
      <Alert
        message="提交后AI将自动开始审核，审核完成后结果将返回给业务系统"
        type="success"
        show-icon
      />
    </div>
  </BasicDrawer>
</template>

<style scoped>
.section-title-divider {
  margin: 4px 0 12px;
}

.section-title-divider :deep(.ant-divider-inner-text) {
  padding-left: 0;
}

.section-title-divider::before {
  display: none !important;
}

.section-title {
  padding-left: 8px;
  border-left: 3px solid hsl(var(--primary));
  font-weight: 600;
  font-size: 16px;
  line-height: 1.5;
}
</style>
