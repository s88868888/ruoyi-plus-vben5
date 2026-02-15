<script setup lang="ts">
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { ref, h } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';
import { Button, Popconfirm, Space, message } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useVbenForm } from '#/adapter/form';
import SectionTitle from './section-title.vue';
import {
  projectList,
  projectAdd,
  projectUpdate,
  projectRemove,
} from '#/api/resource/personnel';

const props = defineProps<{
  personnelId: number;
}>();

// 表格配置
const gridOptions: VxeTableGridOptions = {
  columns: [
    { field: 'projectName', title: '项目名称', minWidth: 200 },
    { field: 'projectRole', title: '项目角色', width: 120 },
    { field: 'startDate', title: '开始日期', width: 120, formatter: ({ cellValue }: any) => cellValue ? cellValue.split(' ')[0] : '' },
    { field: 'endDate', title: '结束日期', width: 120, formatter: ({ cellValue }: any) => cellValue ? cellValue.split(' ')[0] : '' },
    {
      field: 'action',
      title: '操作',
      width: 120,
      fixed: 'right',
      slots: { default: 'action' },
    },
  ],
  height: 300,
  keepSource: true,
  pagerConfig: {
    enabled: false,
  },
  proxyConfig: {
    ajax: {
      query: async () => {
        return await projectList(props.personnelId);
      },
    },
  },
  rowConfig: {
    keyField: 'id',
  },
  toolbarConfig: {
    enabled: false,
  },
  id: 'personnel-project-list',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  gridOptions,
});

// 表单弹窗
const isEdit = ref(false);
const currentId = ref<number>();

const [FormModal, formModalApi] = useVbenModal({
  onOpenChange: async (visible) => {
    if (!visible) {
      await formApi.resetForm();
    }
  },
  onConfirm: async () => {
    await handleSave();
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
      fieldName: 'projectName',
      component: 'Input',
      label: '项目名称',
      rules: 'required',
    },
    {
      fieldName: 'projectRole',
      component: 'Input',
      label: '项目角色',
    },
    {
      fieldName: 'startDate',
      component: 'DatePicker',
      label: '开始日期',
      componentProps: {
        valueFormat: 'YYYY-MM-DD',
        class: 'w-full',
      },
    },
    {
      fieldName: 'endDate',
      component: 'DatePicker',
      label: '结束日期',
      componentProps: {
        valueFormat: 'YYYY-MM-DD',
        class: 'w-full',
      },
    },
    // ---- 项目介绍 ----
    {
      component: 'Divider',
      fieldName: '_divider_desc',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '项目介绍' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'projectDescription',
      component: 'Textarea',
      label: '项目介绍',
      formItemClass: 'col-span-2',
      componentProps: {
        rows: 4,
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
        rows: 2,
      },
    },
  ],
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2',
});

function handleAdd() {
  isEdit.value = false;
  currentId.value = undefined;
  formApi.resetForm();
  formModalApi.setState({ title: '新增项目经验' });
  formModalApi.open();
}

function handleEdit(row: any) {
  isEdit.value = true;
  currentId.value = row.id;
  formApi.setValues(row);
  formModalApi.setState({ title: '编辑项目经验' });
  formModalApi.open();
}

async function handleSave() {
  try {
    const { valid } = await formApi.validate();
    if (!valid) return;

    formModalApi.lock(true);
    const values = await formApi.getValues();
    const data = {
      ...values,
      id: isEdit.value ? currentId.value : undefined,
      personnelId: props.personnelId,
    };

    if (isEdit.value) {
      await projectUpdate(data);
    } else {
      await projectAdd(data);
    }

    formModalApi.close();
    await tableApi.query();
  } finally {
    formModalApi.lock(false);
  }
}

async function handleDelete(row: any) {
  await projectRemove([row.id]);
  message.success('删除成功');
  await tableApi.query();
}
</script>

<template>
  <div class="personnel-project">
    <div class="mb-2 flex justify-end">
      <Button type="primary" size="small" @click="handleAdd">
        <PlusOutlined />
        新增项目经验
      </Button>
    </div>

    <BasicTable>
      <template #action="{ row }">
        <Space>
          <ghost-button @click.stop="handleEdit(row)">
            编辑
          </ghost-button>
          <Popconfirm
            :get-popup-container="getVxePopupContainer"
            placement="left"
            title="确认删除该项目经验吗？"
            @confirm="handleDelete(row)"
          >
            <ghost-button danger @click.stop="">
              删除
            </ghost-button>
          </Popconfirm>
        </Space>
      </template>
    </BasicTable>

    <FormModal class="w-[600px]">
      <Form />
    </FormModal>
  </div>
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
