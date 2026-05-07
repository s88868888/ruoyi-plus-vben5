<script setup lang="ts">
import { ref, computed } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import {
  message, Steps, Upload, Select, Checkbox, Tag, Alert, Card, Space,
} from 'ant-design-vue';
import { InboxOutlined } from '@ant-design/icons-vue';

const emit = defineEmits<{ reload: [] }>();

const currentStep = ref(0);
const fileList = ref<any[]>([]);
const formData = ref({
  docType: undefined as string | undefined,
  standardIds: [] as string[],
  useKnowledge: true,
});

const standardOptions = [
  { id: '1', name: '政府采购合同审核标准 v2.1', ruleCount: 38 },
  { id: '2', name: '企业财务报销规范 v1.3', ruleCount: 25 },
  { id: '3', name: '合同通用条款检查 v3.0', ruleCount: 15 },
  { id: '4', name: '内部审批表单规范 v3.0', ruleCount: 20 },
  { id: '5', name: '租赁合同审核标准 v1.0', ruleCount: 32 },
  { id: '6', name: '标书格式规范 v2.0', ruleCount: 28 },
];

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => {
    const stepNames = ['上传文档', '选择审核标准', '确认提交'];
    return `新建审核 - ${stepNames[currentStep.value]}`;
  }),
  onOpenChange: (visible) => {
    if (!visible) {
      currentStep.value = 0;
      fileList.value = [];
      formData.value = { docType: undefined, standardIds: [], useKnowledge: true };
    }
  },
  onConfirm: async () => {
    if (currentStep.value === 0) {
      if (fileList.value.length === 0) {
        message.warning('请先上传待审核文档');
        return;
      }
      currentStep.value = 1;
      return;
    }
    if (currentStep.value === 1) {
      if (formData.value.standardIds.length === 0) {
        message.warning('请选择至少一个审核标准');
        return;
      }
      currentStep.value = 2;
      return;
    }
    // 最后一步：提交
    message.success('审核任务已提交，AI正在审核中...');
    drawerApi.close();
    emit('reload');
  },
  confirmText: computed(() => currentStep.value < 2 ? '下一步' : '提交审核'),
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
      <Steps.Step title="上传文档" />
      <Steps.Step title="选择标准" />
      <Steps.Step title="确认提交" />
    </Steps>

    <!-- Step 1: 上传文档 -->
    <div v-show="currentStep === 0">
      <div style="margin-bottom: 16px;">
        <label style="display: block; font-weight: 500; margin-bottom: 8px;">文档类型</label>
        <Select
          v-model:value="formData.docType"
          placeholder="请选择文档类型"
          style="width: 100%;"
          :options="[
            { label: '合同', value: 'contract' },
            { label: '财务账单', value: 'finance' },
            { label: '表单', value: 'form' },
            { label: '标书', value: 'bid' },
          ]"
        />
      </div>
      <div>
        <label style="display: block; font-weight: 500; margin-bottom: 8px;">上传文档</label>
        <Upload.Dragger
          v-model:file-list="fileList"
          :multiple="true"
          :before-upload="() => false"
        >
          <p class="ant-upload-drag-icon"><InboxOutlined /></p>
          <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p class="ant-upload-hint">支持 Word、PDF、Excel 格式，可批量上传</p>
        </Upload.Dragger>
      </div>
    </div>

    <!-- Step 2: 选择审核标准 -->
    <div v-show="currentStep === 1">
      <Alert
        message="系统会自动附加通用规范（违法违规检测、敏感词检测、基础格式检查）"
        type="info"
        show-icon
        style="margin-bottom: 16px;"
      />
      <label style="display: block; font-weight: 500; margin-bottom: 12px;">选择审核标准（可多选）</label>
      <Checkbox.Group v-model:value="formData.standardIds" style="width: 100%;">
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <Card
            v-for="std in standardOptions"
            :key="std.id"
            size="small"
            hoverable
            :style="{
              border: formData.standardIds.includes(std.id) ? '2px solid #1890ff' : '1px solid #f0f0f0',
              borderRadius: '8px',
            }"
          >
            <Checkbox :value="std.id" style="width: 100%;">
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <span style="font-weight: 500;">{{ std.name }}</span>
                <Tag size="small" color="blue">{{ std.ruleCount }} 条规则</Tag>
              </div>
            </Checkbox>
          </Card>
        </div>
      </Checkbox.Group>
      <div style="margin-top: 16px;">
        <Checkbox v-model:checked="formData.useKnowledge">结合知识库经验提升审核准确率</Checkbox>
      </div>
    </div>

    <!-- Step 3: 确认提交 -->
    <div v-show="currentStep === 2">
      <Card size="small" style="margin-bottom: 16px;">
        <div style="line-height: 2.4;">
          <div><strong>文档数量：</strong>{{ fileList.length }} 份</div>
          <div>
            <strong>文档列表：</strong>
            <div v-for="f in fileList" :key="f.uid" style="padding-left: 16px; color: #666; font-size: 13px;">
              📄 {{ f.name }}
            </div>
          </div>
          <div><strong>文档类型：</strong>{{ formData.docType || '未指定' }}</div>
          <div>
            <strong>审核标准：</strong>
            <div style="margin-top: 4px;">
              <Tag v-for="id in formData.standardIds" :key="id" color="blue" style="margin: 2px;">
                {{ standardOptions.find(s => s.id === id)?.name }}
              </Tag>
            </div>
          </div>
          <div><strong>知识库辅助：</strong>{{ formData.useKnowledge ? '是' : '否' }}</div>
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
