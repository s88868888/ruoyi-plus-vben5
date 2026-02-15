<script setup lang="ts">
import type { VxeGridProps } from '#/adapter/vxe-table';

import { ref, computed, h } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';
import { Button, Popconfirm, Space, message } from 'ant-design-vue';
import { PlusOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useVbenForm } from '#/adapter/form';
import SectionTitle from './section-title.vue';
import {
  certificateList,
  certificateAdd,
  certificateUpdate,
  certificateRemove,
} from '#/api/resource/personnel';

const props = defineProps<{
  personnelId: number;
}>();

// 表格配置
const gridOptions: VxeGridProps = {
  columns: [
    { field: 'certificateName', title: '证书名称', minWidth: 150 },
    { field: 'certificateNumber', title: '证书编号', minWidth: 150 },
    { field: 'certificateLevel', title: '证书等级', width: 100 },
    { field: 'major', title: '专业', minWidth: 120 },
    { field: 'issueDate', title: '发证日期', width: 120, formatter: ({ cellValue }: any) => cellValue ? cellValue.split(' ')[0] : '' },
    { field: 'expiryDate', title: '有效期至', width: 120, formatter: ({ cellValue }: any) => cellValue ? cellValue.split(' ')[0] : '' },
    { field: 'issuingAuthority', title: '发证机关', minWidth: 150 },
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
        return await certificateList(props.personnelId);
      },
    },
  },
  rowConfig: {
    keyField: 'id',
  },
  toolbarConfig: {
    enabled: false,
  },
  id: 'personnel-certificate-list',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  gridOptions,
});

// 表单弹窗
const isEdit = ref(false);
const currentId = ref<number>();

const [FormModal, formModalApi] = useVbenModal({
  title: computed(() => (isEdit.value ? '编辑证书' : '新增证书')),
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
      fieldName: 'certificateName',
      component: 'Input',
      label: '证书名称',
      rules: 'required',
    },
    {
      fieldName: 'certificateNumber',
      component: 'Input',
      label: '证书编号',
    },
    {
      fieldName: 'certificateLevel',
      component: 'Select',
      label: '证书等级',
      componentProps: {
        options: [
          { label: '初级', value: '初级' },
          { label: '中级', value: '中级' },
          { label: '高级', value: '高级' },
          { label: '特级', value: '特级' },
        ],
      },
    },
    {
      fieldName: 'major',
      component: 'Input',
      label: '专业',
    },
    {
      fieldName: 'issueDate',
      component: 'DatePicker',
      label: '发证日期',
      componentProps: {
        valueFormat: 'YYYY-MM-DD',
        class: 'w-full',
      },
    },
    {
      fieldName: 'expiryDate',
      component: 'DatePicker',
      label: '有效期至',
      componentProps: {
        valueFormat: 'YYYY-MM-DD',
        class: 'w-full',
      },
    },
    {
      fieldName: 'issuingAuthority',
      component: 'Input',
      label: '发证机关',
    },
    // ---- 证书图片 ----
    {
      component: 'Divider',
      fieldName: '_divider_image',
      label: '',
      hideLabel: true,
      componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
      renderComponentContent: () => ({
        default: () => h(SectionTitle, { title: '证书图片' }),
      }),
      formItemClass: 'col-span-2',
    },
    {
      fieldName: 'certificateImage',
      component: 'ImageUpload',
      label: '证书图片',
      formItemClass: 'col-span-2',
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
  formModalApi.open();
}

function handleEdit(row: any) {
  isEdit.value = true;
  currentId.value = row.id;
  formApi.setValues(row);
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
      await certificateUpdate(data);
    } else {
      await certificateAdd(data);
    }

    formModalApi.close();
    await tableApi.query();
  } finally {
    formModalApi.lock(false);
  }
}

async function handleDelete(row: any) {
  await certificateRemove([row.id]);
  message.success('删除成功');
  await tableApi.query();
}
</script>

<template>
  <div class="personnel-certificate">
    <div class="mb-2 flex justify-end">
      <Button type="primary" size="small" @click="handleAdd">
        <PlusOutlined />
        新增证书
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
            title="确认删除该证书吗？"
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
