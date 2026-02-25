<script setup lang="ts">
import type { BizBidProject } from '#/api/bid/project';

import { ref, computed, h } from 'vue';
import { useVbenDrawer } from '@vben/common-ui';
import { message, Steps } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { bidProjectInfo, bidProjectSaveStep1, bidProjectAnalyzeStep2, extractScoringCriteria } from '#/api/bid/project';
import { FileUpload } from '#/components/upload';
import SectionTitle from '#/views/resource/companyInfo/modules/section-title.vue';
import { useEditPageStyle } from '#/preferences/useEditPageStyle';

const emit = defineEmits<{
  reload: [];
}>();

const { formContainerStyle, drawerWidthStyle } = useEditPageStyle();

const isEdit = ref(false);
const isView = ref(false);
const projectId = ref<number>();
const currentStep = ref(0); // 当前步骤：0=第一步，1=第二步，2=第三步
const attachmentIds = ref<string[]>([]);

const [BasicDrawer, drawerApi] = useVbenDrawer({
  title: computed(() => {
    if (isView.value) return '查看招标项目';
    const prefix = isEdit.value ? '编辑' : '新增';
    const stepNames = ['基本信息', '上传附件', 'AI 分析'];
    const stepName = ` - ${stepNames[currentStep.value]}`;
    return `${prefix}招标项目${stepName}`;
  }),
  onOpenChange: async (visible) => {
    if (!visible) {
      await step1FormApi.resetForm();
      attachmentIds.value = [];
      await step3FormApi.resetForm();
      currentStep.value = 0;
      return;
    }
    const data = drawerApi.getData<{ id?: number; isEdit: boolean; isView?: boolean }>();
    if (data) {
      isEdit.value = data.isEdit;
      isView.value = data.isView || false;

      if ((data.isEdit || data.isView) && data.id) {
        projectId.value = data.id;
        drawerApi.drawerLoading(true);
        try {
          const res = await bidProjectInfo(data.id);
          const formData: any = { ...res };

          // 处理附件数据 - 转换为数组格式
          let attachmentsForForm: any[] = [];
          if (formData.attachments && typeof formData.attachments === 'string') {
            const ossIds = formData.attachments
              .split(',')
              .filter((item: string) => item && /^\d+$/.test(item));
            // FileUpload 组件需要的是 ossId 数组
            attachmentsForForm = ossIds;
          }

          // 第一步表单数据（不包含附件）
          const step1Data = { ...formData };
          delete step1Data.attachments;
          delete step1Data.attachmentName;
          await step1FormApi.setValues(step1Data);

          // 第二步附件数据 - 直接设置 ref，绕过表单值传递
          attachmentIds.value = attachmentsForForm;

          // 第三步表单数据（AI 配置）- 编辑时默认不重新分析
          await step3FormApi.setValues({
            enableAnalysis: false,
            aiPrompt: formData.aiPrompt || '',
            async: true,
          });

          if (data.isView) {
            step1FormApi.setState({ disabled: true });
            step3FormApi.setState({ disabled: true });
          } else {
            step1FormApi.setState({ disabled: false });
            step3FormApi.setState({ disabled: false });
          }
        } finally {
          drawerApi.drawerLoading(false);
        }
      } else {
        projectId.value = undefined;
        step1FormApi.setState({ disabled: false });
        step3FormApi.setState({ disabled: false });
        await step1FormApi.setValues({
          status: 'following',
          projectSource: 'manual',
          matchDegree: 0,
        });
        await step3FormApi.setValues({
          enableAnalysis: true,
          async: true,
        });
      }
    }
  },
  onConfirm: async () => {
    if (isView.value) {
      drawerApi.close();
      return;
    }

    if (currentStep.value === 0) {
      await handleStep1Submit();
    } else if (currentStep.value === 1) {
      await handleStep2Submit();
    } else {
      await handleStep3Submit();
    }
  },
  confirmText: computed(() => {
    if (isView.value) return '关闭';
    if (currentStep.value === 0 || currentStep.value === 1) return '下一步';
    return '完成';
  }),
  cancelText: computed(() => {
    return currentStep.value === 0 ? '取消' : '上一步';
  }),
  onCancel: () => {
    if (currentStep.value > 0) {
      currentStep.value--;
      return false; // 阻止关闭
    }
    return true; // 允许关闭
  },
});

// 第一步表单
const [Step1Form, step1FormApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
      allowClear: true,
    },
    labelWidth: 130,
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
      fieldName: 'projectName',
      component: 'Input',
      label: '项目名称',
      rules: 'required',
    },
    {
      fieldName: 'bidOrg',
      component: 'Input',
      label: '招标单位',
    },
    {
      fieldName: 'projectType',
      component: 'Select',
      label: '项目类型',
      componentProps: {
        options: [
          { label: '工程', value: 'engineering' },
          { label: '货物', value: 'goods' },
          { label: '服务', value: 'service' },
        ],
      },
    },
    {
      fieldName: 'budgetAmount',
      component: 'InputNumber',
      label: '预算金额(万元)',
      componentProps: {
        min: 0,
        precision: 2,
        class: 'w-full',
      },
    },
    // ---- 招标信息 ----
    {
      component: 'Divider',
      fieldName: '_divider_bid',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '招标信息' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'publishDate',
      component: 'DatePicker',
      label: '发布日期',
      componentProps: {
        valueFormat: 'YYYY-MM-DD',
        class: 'w-full',
      },
    },
    {
      fieldName: 'deadline',
      component: 'DatePicker',
      label: '截止日期',
      componentProps: {
        valueFormat: 'YYYY-MM-DD',
        class: 'w-full',
      },
    },
    {
      fieldName: 'status',
      component: 'Select',
      label: '状态',
      componentProps: {
        options: [
          { label: '跟进中', value: 'following' },
          { label: '已投标', value: 'bid' },
          { label: '已中标', value: 'won' },
          { label: '未中标', value: 'lost' },
          { label: '已放弃', value: 'abandoned' },
        ],
      },
    },
    {
      fieldName: 'matchDegree',
      component: 'InputNumber',
      label: '契合度',
      componentProps: {
        min: 0,
        max: 100,
        class: 'w-full',
      },
      help: '0-100之间的整数',
    },
    {
      fieldName: 'projectRegion',
      component: 'Input',
      label: '项目地区',
    },
    {
      fieldName: 'bidMethod',
      component: 'Select',
      label: '招标方式',
      componentProps: {
        options: [
          { label: '公开招标', value: 'public' },
          { label: '邀请招标', value: 'invite' },
          { label: '竞争性谈判', value: 'competitive' },
          { label: '询价采购', value: 'inquiry' },
          { label: '单一来源', value: 'single' },
        ],
      },
    },
    // ---- 联系信息 ----
    {
      component: 'Divider',
      fieldName: '_divider_contact',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '联系信息' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'contactPerson',
      component: 'Input',
      label: '联系人',
    },
    {
      fieldName: 'contactPhone',
      component: 'Input',
      label: '联系电话',
    },
    {
      fieldName: 'sourceUrl',
      component: 'Input',
      label: '来源链接',
      componentProps: {
        placeholder: '请输入项目来源URL',
      },
    },
    // ---- 补充信息 ----
    {
      component: 'Divider',
      fieldName: '_divider_extra',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '补充信息' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'projectDesc',
      component: 'Textarea',
      label: '项目描述',
      formItemClass: 'col-span-2',
      componentProps: {
        rows: 4,
      },
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

// 第三步表单 - AI 分析
const [Step3Form, step3FormApi] = useVbenForm({
  commonConfig: {
    componentProps: {
      class: 'w-full',
      allowClear: true,
    },
    labelWidth: 130,
  },
  schema: [
    // ---- AI 分析配置 ----
    {
      component: 'Divider',
      fieldName: '_divider_ai',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: 'AI 分析配置' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'enableAnalysis',
      component: 'Switch',
      label: '执行 AI 分析总结',
      defaultValue: true,
      componentProps: {
        class: '',
        checkedChildren: '是',
        unCheckedChildren: '否',
      },
      help: '关闭后将直接保存项目，不执行 AI 分析',
    },
    {
      fieldName: 'aiPrompt',
      component: 'Textarea',
      label: 'AI 分析提示词',
      formItemClass: 'col-span-2',
      componentProps: {
        rows: 10,
        placeholder: '请输入自定义的 AI 分析提示词，留空则使用默认提示词。\n\n默认提示词会分析：\n1. 项目概况总结\n2. 项目规模和预算评估\n3. 技术要求分析\n4. 竞争态势预判\n5. 投标建议和注意事项\n6. 风险点提示',
      },
      help: '不填写则使用系统默认的分析提示词',
      dependencies: {
        triggerFields: ['enableAnalysis'],
        if(values) {
          return values.enableAnalysis;
        },
      },
    },
    {
      fieldName: 'async',
      component: 'Switch',
      label: '异步分析',
      defaultValue: true,
      componentProps: {
        class: '',
        checkedChildren: '是',
        unCheckedChildren: '否',
      },
      help: '异步分析不会阻塞操作，分析完成后可在详情页查看结果',
      dependencies: {
        triggerFields: ['enableAnalysis'],
        if(values) {
          return values.enableAnalysis;
        },
      },
    },
    // ---- 评分标准提取 ----
    {
      component: 'Divider',
      fieldName: '_divider_scoring',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '评分标准提取' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'extractScoringCriteria',
      component: 'Switch',
      label: '自动提取评分标准',
      defaultValue: false,
      componentProps: {
        class: '',
        checkedChildren: '是',
        unCheckedChildren: '否',
      },
      help: '启用后将使用 AI 从招标文档中自动提取评分标准',
    },
  ],
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1',
});

// 第一步提交 - 保存基本信息
async function handleStep1Submit() {
  try {
    const { valid } = await step1FormApi.validate();
    if (!valid) return;

    drawerApi.lock(true);
    const values = await step1FormApi.getValues();

    // 第一步不包含附件，附件在第二步处理
    const data: Partial<BizBidProject> = {
      ...values,
      id: projectId.value,
    };

    const res = await bidProjectSaveStep1(data);
    projectId.value = res?.id;
    isEdit.value = true;

    // 进入第二步（不显示成功提示）
    currentStep.value = 1;
  } finally {
    drawerApi.lock(false);
  }
}

// 第二步提交 - 保存附件
async function handleStep2Submit() {
  if (!projectId.value) {
    message.error('项目ID不存在');
    return;
  }

  try {
    drawerApi.lock(true);
    const step1Values = await step1FormApi.getValues();

    // 处理附件 - 直接从 ref 读取
    const attachments = attachmentIds.value
      .filter((item: string) => /^\d+$/.test(item))
      .join(',');

    // 保存附件（即使为空也保存，清空附件的情况）
    // 需要带上第一步的数据，否则后端校验必填字段会失败
    await bidProjectSaveStep1({
      ...step1Values,
      id: projectId.value,
      attachments,
    });

    // 进入第三步（不显示成功提示）
    currentStep.value = 2;
  } catch (error) {
    console.error('保存附件失败:', error);
  } finally {
    drawerApi.lock(false);
  }
}

// 第三步提交 - 执行 AI 分析
async function handleStep3Submit() {
  try {
    if (!projectId.value) {
      message.error('项目ID不存在');
      return;
    }

    drawerApi.lock(true);
    const values = await step3FormApi.getValues();

    if (values.enableAnalysis) {
      // 执行 AI 分析
      await bidProjectAnalyzeStep2({
        projectId: projectId.value,
        aiPrompt: values.aiPrompt,
        async: values.async,
      });

      if (values.async) {
        message.success('保存成功，AI 分析任务已提交，请稍后查看结果');
      } else {
        message.success('保存成功，AI 分析已完成');
      }
    } else {
      message.success('保存成功');
    }

    // 提取评分标准
    if (values.extractScoringCriteria) {
      try {
        await extractScoringCriteria({
          projectId: projectId.value,
          async: true,
        });
        message.info('评分标准提取任务已提交，请稍后查看结果');
      } catch (error) {
        message.error('评分标准提取失败，请重试');
        console.error('提取评分标准失败:', error);
      }
    }

    emit('reload');
    drawerApi.close();
  } finally {
    drawerApi.lock(false);
  }
}
</script>

<template>
  <BasicDrawer class="w-[1000px]" :style="drawerWidthStyle">
    <div class="mb-6" :style="formContainerStyle">
      <Steps :current="currentStep" size="small">
        <Steps.Step title="基本信息" description="填写项目基本信息" />
        <Steps.Step title="上传附件" description="上传招标文档等附件" />
        <Steps.Step title="AI 分析" description="配置 AI 分析提示词" />
      </Steps>
    </div>

    <div v-show="currentStep === 0" :style="formContainerStyle">
      <Step1Form />
    </div>

    <div v-if="currentStep === 1" :style="formContainerStyle">
      <div class="section-title-divider-standalone">
        <SectionTitle title="上传附件" />
      </div>
      <div class="px-4">
        <FileUpload
          v-model:value="attachmentIds"
          :max-count="10"
          :max-size="50"
          accept="application/pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,image/jpg,image/jpeg,image/png,.zip,.rar"
          multiple
          :help-message="false"
          :disabled="isView"
        />
        <div class="mt-2 text-xs text-gray-400">
          支持 PDF、Word、Excel、图片、压缩包等格式，单个文件不超过50MB，最多10个文件
        </div>
      </div>
    </div>

    <div v-show="currentStep === 2" :style="formContainerStyle">
      <Step3Form />
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

.section-title-divider-standalone {
  margin: 4px 0 12px;
}
</style>
