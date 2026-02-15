<script setup lang="ts">

import { ref, computed, h } from 'vue';
import { useVbenDrawer, useVbenForm } from '@vben/common-ui';
import { Button, message, Steps } from 'ant-design-vue';

import { IconifyIcon } from '@vben/icons';

import SectionTitle from './section-title.vue';
import { personnelInfo, personnelAdd, personnelUpdate } from '#/api/resource/personnel';

import PersonnelCertificate from './personnel-certificate.vue';
import PersonnelProject from './personnel-project.vue';

const emit = defineEmits<{
  success: [];
}>();

const isEdit = ref(false);
const personnelId = ref<number>();
const deptId = ref<number>();
const currentStep = ref(0);
const submitting = ref(false);

const steps = [
  { title: '基本信息' },
  { title: '资格证书' },
  { title: '项目经验' },
];

// 分区图标
const sectionIcon = computed(() => {
  return 'material-symbols-light:person';
});

const drawerTitle = computed(() => (isEdit.value ? '编辑人员' : '新增人员'));

const [BasicDrawer, drawerApi] = useVbenDrawer({
  footer: false,
  onOpenChange: async (visible) => {
    if (!visible) {
      await formApi.resetForm();
      currentStep.value = 0;
      return;
    }
    const data = drawerApi.getData<{ id?: number; deptId?: number; isEdit: boolean }>();
    if (data) {
      isEdit.value = data.isEdit;
      deptId.value = data.deptId;
      if (data.isEdit && data.id) {
        personnelId.value = data.id;
        drawerApi.drawerLoading(true);
        try {
          const res = await personnelInfo(data.id);
          await formApi.setValues(res);
        } finally {
          drawerApi.drawerLoading(false);
        }
      } else {
        personnelId.value = undefined;
        await formApi.setValues({ deptId: data.deptId, status: '0', gender: '0' });
      }
    }
  },
});

const [Form, formApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
      allowClear: true,
    },
    labelWidth: 100,
  },
  schema: [
    // ---- 基本信息 ----
    {
      component: 'Divider',
      fieldName: '_divider_basic',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '基本信息' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'name',
      component: 'Input',
      label: '姓名',
      rules: 'required',
    },
    {
      fieldName: 'gender',
      component: 'RadioGroup',
      label: '性别',
      rules: 'required',
      componentProps: {
        options: [
          { label: '男', value: '0' },
          { label: '女', value: '1' },
        ],
      },
    },
    {
      fieldName: 'birthDate',
      component: 'DatePicker',
      label: '出生日期',
      componentProps: {
        valueFormat: 'YYYY-MM-DD',
        class: 'w-full',
      },
    },
    {
      fieldName: 'position',
      component: 'Input',
      label: '职务',
    },
    {
      fieldName: 'hireDate',
      component: 'DatePicker',
      label: '入职时间',
      componentProps: {
        valueFormat: 'YYYY-MM-DD',
        class: 'w-full',
      },
    },
    {
      fieldName: 'workYears',
      component: 'InputNumber',
      label: '工作年限',
      componentProps: {
        min: 0,
        class: 'w-full',
      },
    },
    {
      fieldName: 'status',
      component: 'RadioGroup',
      label: '状态',
      componentProps: {
        options: [
          { label: '在职', value: '0' },
          { label: '离职', value: '1' },
        ],
      },
    },
    {
      fieldName: 'phone',
      component: 'Input',
      label: '联系方式',
    },
    // ---- 证件信息 ----
    {
      component: 'Divider',
      fieldName: '_divider_id_card',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '证件信息' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'idCardType',
      component: 'Select',
      label: '证件类型',
      componentProps: {
        options: [
          { label: '身份证', value: '身份证' },
          { label: '护照', value: '护照' },
          { label: '军官证', value: '军官证' },
          { label: '其他', value: '其他' },
        ],
      },
    },
    {
      fieldName: 'idCardNumber',
      component: 'Input',
      label: '证件号码',
    },
    {
      fieldName: 'idCardFront',
      component: 'ImageUpload',
      label: '身份证人像面',
      componentProps: {
        maxCount: 1,
        maxSize: 10,
        accept: 'image/jpg,image/jpeg,image/png',
        helpMessage: false,
      },
    },
    {
      fieldName: 'idCardBack',
      component: 'ImageUpload',
      label: '身份证国徽面',
      componentProps: {
        maxCount: 1,
        maxSize: 10,
        accept: 'image/jpg,image/jpeg,image/png',
        helpMessage: false,
      },
    },
    {
      fieldName: 'socialSecurity',
      component: 'ImageUpload',
      label: '社保材料',
      componentProps: {
        maxCount: 1,
        maxSize: 10,
        accept: 'image/jpg,image/jpeg,image/png',
        helpMessage: false,
      },
    },
    // ---- 备注 ----
    {
      component: 'Divider',
      fieldName: '_divider_remark',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '备注' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'remark',
      component: 'Textarea',
      label: '备注',
      formItemClass: 'col-span-2',
      componentProps: {
        rows: 3,
      },
    },
  ],
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});

async function handleSaveBasic() {
  try {
    const { valid } = await formApi.validate();
    if (!valid) return false;

    submitting.value = true;
    const values = await formApi.getValues();
    const data = {
      ...values,
      id: isEdit.value ? personnelId.value : undefined,
      deptId: deptId.value,
    };

    if (isEdit.value) {
      await personnelUpdate(data);
    } else {
      const res = await personnelAdd(data);
      personnelId.value = res?.id;
      isEdit.value = true;
    }
    emit('success');
    return true;
  } finally {
    submitting.value = false;
  }
}

async function handleNext() {
  if (currentStep.value === 0) {
    const saved = await handleSaveBasic();
    if (!saved) return;
  }
  currentStep.value++;
}

function handlePrev() {
  currentStep.value--;
}

function handleStepClick(step: number) {
  // 新增模式下未保存基本信息时，不允许跳到后续步骤
  if (!personnelId.value && step > 0) return;
  currentStep.value = step;
}

function handleFinish() {
  emit('success');
  drawerApi.close();
}
</script>

<template>
  <BasicDrawer :title="drawerTitle" class="w-[1000px]">
    <template #headerPrefix>
      <IconifyIcon :icon="sectionIcon" class="text-lg text-primary" />
    </template>

    <div class="mb-6">
      <Steps :current="currentStep" size="small">
        <Steps.Step
          v-for="(step, index) in steps"
          :key="index"
          :title="step.title"
          :status="index < currentStep ? 'finish' : index === currentStep ? 'process' : 'wait'"
          class="cursor-pointer"
          @click="handleStepClick(index)"
        />
      </Steps>
    </div>

    <!-- 步骤1：基本信息 -->
    <div v-show="currentStep === 0">
      <Form />
    </div>

    <!-- 步骤2：资格证书 -->
    <div v-show="currentStep === 1">
      <PersonnelCertificate v-if="personnelId" :personnel-id="personnelId" />
    </div>

    <!-- 步骤3：项目经验 -->
    <div v-show="currentStep === 2">
      <PersonnelProject v-if="personnelId" :personnel-id="personnelId" />
    </div>

    <!-- 底部按钮栏 -->
    <div class="mt-6 flex justify-end gap-3">
      <Button v-if="currentStep > 0" @click="handlePrev">
        上一步
      </Button>
      <Button
        v-if="currentStep === 0 && isEdit"
        :loading="submitting"
        @click="handleSaveBasic"
      >
        保存基本信息
      </Button>
      <Button
        v-if="currentStep < steps.length - 1"
        type="primary"
        :loading="submitting"
        @click="handleNext"
      >
        {{ currentStep === 0 && !personnelId ? '保存并下一步' : '下一步' }}
      </Button>
      <Button
        v-if="currentStep === steps.length - 1"
        type="primary"
        @click="handleFinish"
      >
        完成
      </Button>
    </div>
  </BasicDrawer>
</template>

<style scoped>
:deep(.section-title-divider.ant-divider-horizontal.ant-divider-with-text)::before,
:deep(.section-title-divider.ant-divider-horizontal.ant-divider-with-text)::after {
  display: none;
}

:deep(.section-title-divider .ant-divider-inner-text) {
  padding-left: 0;
}
</style>
