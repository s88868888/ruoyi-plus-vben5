<script setup lang="ts">
import { computed, h, ref } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { useVbenForm } from '#/adapter/form';
import { companyList as getCompanyList } from '#/api/resource/companyInfo';

const emit = defineEmits<{ success: [data: any] }>();

const companyList = ref<any[]>([]);

// 分栏标题组件
const SectionTitle = (props: { title: string }) => {
  return h('span', {
    style: {
      paddingLeft: '8px',
      borderLeft: '3px solid hsl(var(--primary))',
      fontWeight: '600',
      fontSize: '16px',
      lineHeight: '1.5',
    },
  }, props.title);
};

const [BasicForm, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
  },
  layout: 'horizontal',
  schema: [
    {
      component: 'Divider',
      fieldName: '_divider_basic',
      label: '',
      hideLabel: true,
      componentProps: {
        orientation: 'left',
        orientationMargin: '0',
        class: 'section-title-divider',
        style: { margin: '4px 0 12px', border: 'none' },
      },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '基本信息' }),
      }),
    },
    {
      component: 'Select',
      componentProps: computed(() => ({
        options: companyList.value.map((company) => ({
          label: company.deptName,
          value: company.deptId,
        })),
        placeholder: '请选择公司',
        showSearch: true,
      })),
      fieldName: 'companyId',
      label: '选择公司',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        options: [
          { label: '商务标', value: 'commercial' },
          { label: '技术标', value: 'technical' },
          { label: '整本标书', value: 'complete' },
        ],
        placeholder: '请选择文档类型',
      },
      defaultValue: 'commercial',
      fieldName: 'documentType',
      label: '文档类型',
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: {
        max: 99,
        min: 1,
        placeholder: '留空自动计算',
      },
      fieldName: 'documentNo',
      label: '同类型序号',
      help: '留空将自动计算下一个可用序号',
    },
    {
      component: 'Divider',
      fieldName: '_divider_other',
      label: '',
      hideLabel: true,
      componentProps: {
        orientation: 'left',
        orientationMargin: '0',
        class: 'section-title-divider',
        style: { margin: '16px 0 12px', border: 'none' },
      },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '其他信息' }),
      }),
    },
    {
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入备注',
        rows: 3,
      },
      fieldName: 'remark',
      label: '备注',
    },
  ],
  showDefaultActions: false,
});

async function loadCompanyList() {
  try {
    const res = await getCompanyList({});
    companyList.value = res.rows || [];
  } catch (error) {
    console.error('加载公司列表失败', error);
  }
}

async function handleConfirm() {
  try {
    const { valid } = await formApi.validate();
    if (!valid) return;

    const values = await formApi.getValues();
    const company = companyList.value.find((c) => c.deptId === values.companyId);

    emit('success', {
      companyId: values.companyId,
      companyName: company?.deptName || '',
      documentType: values.documentType,
      documentNo: values.documentNo,
      remark: values.remark,
    });

    drawerApi.close();
  } catch (error) {
    console.error('表单验证失败', error);
  }
}

function handleClosed() {
  formApi.resetForm();
}

const [BasicDrawer, drawerApi] = useVbenDrawer({
  class: 'w-[600px]',
  onClosed: handleClosed,
  onConfirm: handleConfirm,
  async onOpenChange(isOpen) {
    if (isOpen) {
      await formApi.resetForm();
      await loadCompanyList();
    }
  },
  title: '添加标书配置',
});

defineExpose({
  drawerApi,
});
</script>

<template>
  <BasicDrawer>
    <BasicForm />
  </BasicDrawer>
</template>

<style scoped>
:deep(.section-title-divider) {
  border: none !important;
}

:deep(.section-title-divider::before),
:deep(.section-title-divider::after) {
  display: none !important;
}
</style>
