<script setup lang="ts">
import { ref, computed } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import {
  message, Upload, Select, Input, Form, FormItem, Alert, Textarea, Button, Divider,
} from 'ant-design-vue';
import { InboxOutlined } from '@ant-design/icons-vue';

const emit = defineEmits<{ reload: [] }>();

const fileList = ref<any[]>([]);
const formData = ref({
  name: '',
  type: undefined as string | undefined,
  description: '',
});

const typeOptions = [
  { label: '合同类', value: 'contract' },
  { label: '财务类', value: 'finance' },
  { label: '表单类', value: 'form' },
  { label: '标书类', value: 'bid' },
  { label: '综合类', value: 'general' },
];

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: '新建知识库',
  onOpenChange: (visible) => {
    if (!visible) {
      fileList.value = [];
      formData.value = { name: '', type: undefined, description: '' };
    }
  },
  onConfirm: async () => {
    if (!formData.value.name) {
      message.warning('请输入知识库名称');
      return;
    }
    if (!formData.value.type) {
      message.warning('请选择知识库类型');
      return;
    }
    message.success('知识库创建成功');
    drawerApi.close();
    emit('reload');
  },
});
</script>

<template>
  <BasicDrawer class="w-[560px]">
    <Form layout="vertical">
      <Divider orientation="left" class="section-title-divider">
        <span class="section-title">基本信息</span>
      </Divider>
      <div class="form-grid">
        <FormItem label="知识库名称" required>
          <Input v-model:value="formData.name" placeholder="如：政府采购合同案例库" />
        </FormItem>
        <FormItem label="类型" required>
          <Select
            v-model:value="formData.type"
            placeholder="请选择"
            style="width: 100%;"
            :options="typeOptions"
          />
        </FormItem>
        <FormItem label="描述说明" class="col-span-2">
          <Textarea v-model:value="formData.description" placeholder="描述该知识库的用途、数据来源、适用场景等..." :rows="3" />
        </FormItem>
      </div>

      <Divider orientation="left" class="section-title-divider">
        <span class="section-title">初始数据（可选）</span>
      </Divider>
      <FormItem class="col-span-2" style="margin-bottom: 0;">
        <Upload.Dragger
          v-model:file-list="fileList"
          :multiple="true"
          :before-upload="() => false"
        >
          <p class="ant-upload-drag-icon"><InboxOutlined /></p>
          <p class="ant-upload-text">拖拽历史审核文档到此处批量导入</p>
          <p class="ant-upload-hint">支持 Word、PDF、Excel 格式，系统将自动提取审核案例</p>
        </Upload.Dragger>
        <Alert
          message="创建后也可以在知识库详情中手动添加案例，或通过审核反馈自动积累"
          type="info"
          show-icon
          style="margin-top: 12px;"
        />
      </FormItem>
    </Form>
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

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 24px;
}

.col-span-2 {
  grid-column: span 2;
}
</style>
