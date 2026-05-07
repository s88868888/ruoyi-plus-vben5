<script setup lang="ts">
import { ref, computed } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { Form, FormItem, Input, Select, AutoComplete, message } from 'ant-design-vue';

const emit = defineEmits<{ reload: [] }>();

const isEdit = ref(false);

const formData = ref({
  content: '',
  severity: undefined as string | undefined,
  category: undefined as string | undefined,
});

const severityOptions = [
  { label: '严重', value: 'must' },
  { label: '一般', value: 'should' },
  { label: '提示', value: 'suggest' },
];

const categoryOptions = [
  { label: '主体信息', value: '主体信息' },
  { label: '基本信息', value: '基本信息' },
  { label: '金额条款', value: '金额条款' },
  { label: '期限条款', value: '期限条款' },
  { label: '付款条款', value: '付款条款' },
  { label: '验收条款', value: '验收条款' },
  { label: '违约条款', value: '违约条款' },
  { label: '知识产权', value: '知识产权' },
  { label: '保密条款', value: '保密条款' },
  { label: '争议解决', value: '争议解决' },
  { label: '其他', value: '其他' },
];

const [BasicDrawer] = useVbenDrawer({
  title: computed(() => isEdit.value ? '编辑规则' : '添加规则'),
  onOpenChange: (visible) => {
    if (!visible) {
      isEdit.value = false;
      formData.value = { content: '', severity: undefined, category: undefined };
    }
  },
  onData: (data: any) => {
    if (data && data.content) {
      isEdit.value = true;
      formData.value = {
        content: data.content,
        severity: data.severity,
        category: data.category,
      };
    }
  },
  onConfirm: async () => {
    if (!formData.value.content) {
      message.warning('请输入规则内容');
      return;
    }
    if (!formData.value.severity) {
      message.warning('请选择等级');
      return;
    }
    if (!formData.value.category) {
      message.warning('请选择或输入分类');
      return;
    }
    message.success(isEdit.value ? '规则修改成功' : '规则添加成功');
    emit('reload');
  },
});
</script>

<template>
  <BasicDrawer>
    <Form layout="vertical">
      <FormItem label="规则内容" required>
        <Input.TextArea
          v-model:value="formData.content"
          placeholder="请输入规则内容"
          :rows="4"
          show-count
          :maxlength="500"
        />
      </FormItem>
      <FormItem label="等级" required>
        <Select
          v-model:value="formData.severity"
          placeholder="请选择等级"
          :options="severityOptions"
        />
      </FormItem>
      <FormItem label="分类" required>
        <AutoComplete
          v-model:value="formData.category"
          placeholder="请选择或输入分类"
          :options="categoryOptions"
          :filter-option="(input: string, option: any) => option.value.includes(input)"
        />
      </FormItem>
    </Form>
  </BasicDrawer>
</template>
