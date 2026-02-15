import type { FormSchemaGetter } from '#/adapter/form';

import { h } from 'vue';

import SectionTitle from './modules/section-title.vue';

/**
 * 列表页搜索表单配置
 */
export const querySchema: FormSchemaGetter = () => [
  {
    component: 'Input',
    fieldName: 'deptName',
    label: '公司名称',
    componentProps: {
      placeholder: '请输入公司名称',
      allowClear: true,
    },
  },
  {
    component: 'Select',
    fieldName: 'status',
    label: '状态',
    componentProps: {
      options: [
        { label: '正常', value: '0' },
        { label: '停用', value: '1' },
      ],
      placeholder: '请选择状态',
      allowClear: true,
    },
  },
];

/**
 * 营业执照表单配置
 */
export const businessLicenseSchema: FormSchemaGetter = () => [
  // ---- 基本信息 ----
  {
    component: 'Divider',
    fieldName: '_divider_license_basic',
    label: '',
    hideLabel: true,
    componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
    renderComponentContent: () => ({
      default: () => h(SectionTitle, { title: '基本信息' }),
    }),
    formItemClass: 'col-span-2',
  },
  {
    component: 'Input',
    fieldName: 'unifiedCreditCode',
    label: '信用代码',
    componentProps: { placeholder: '请输入统一社会信用代码' },
  },
  {
    component: 'Input',
    fieldName: 'legalPerson',
    label: '法定代表',
    componentProps: { placeholder: '请输入法定代表人' },
  },
  {
    component: 'Input',
    fieldName: 'registeredCapital',
    label: '注册资本',
    componentProps: { placeholder: '请输入注册资本' },
  },
  {
    component: 'Input',
    fieldName: 'enterpriseNature',
    label: '企业性质',
    componentProps: { placeholder: '请输入企业性质' },
  },
  {
    component: 'Input',
    fieldName: 'enterpriseAbbr',
    label: '企业简称',
    componentProps: { placeholder: '请输入企业简称' },
  },
  // ---- 注册登记 ----
  {
    component: 'Divider',
    fieldName: '_divider_license_reg',
    label: '',
    hideLabel: true,
    componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
    renderComponentContent: () => ({
      default: () => h(SectionTitle, { title: '注册登记' }),
    }),
    formItemClass: 'col-span-2',
  },
  {
    component: 'DatePicker',
    fieldName: 'establishmentDate',
    label: '成立日期',
    componentProps: {
      format: 'YYYY-MM-DD',
      valueFormat: 'YYYY-MM-DD',
      style: { width: '100%' },
    },
  },
  {
    component: 'Input',
    fieldName: 'registrationAuthority',
    label: '登记机关',
    componentProps: { placeholder: '请输入登记机关' },
  },
  {
    component: 'DatePicker',
    fieldName: 'registrationDate',
    label: '核准日期',
    componentProps: {
      format: 'YYYY-MM-DD',
      valueFormat: 'YYYY-MM-DD',
      style: { width: '100%' },
    },
  },
  {
    component: 'RadioGroup',
    fieldName: 'businessLongTerm',
    label: '营业期限',
    componentProps: {
      options: [
        { label: '长期', value: '1' },
        { label: '非长期', value: '0' },
      ],
    },
    defaultValue: '0',
  },
  {
    component: 'DatePicker',
    fieldName: 'businessEndDate',
    label: '截止日期',
    componentProps: {
      format: 'YYYY-MM-DD',
      valueFormat: 'YYYY-MM-DD',
      style: { width: '100%' },
    },
    dependencies: {
      triggerFields: ['businessLongTerm'],
      show: (values:any) => values.businessLongTerm === '0',
    },
  },
  // ---- 地址信息 ----
  {
    component: 'Divider',
    fieldName: '_divider_license_addr',
    label: '',
    hideLabel: true,
    componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
    renderComponentContent: () => ({
      default: () => h(SectionTitle, { title: '地址信息' }),
    }),
    formItemClass: 'col-span-2',
  },
  {
    component: 'Input',
    fieldName: 'enterpriseRegion',
    label: '所在地区',
    componentProps: { placeholder: '请输入企业所在地区' },
  },
  {
    component: 'Input',
    fieldName: 'registeredAddress',
    label: '注册地址',
    componentProps: { placeholder: '请输入注册地址' },
  },
  {
    component: 'Textarea',
    fieldName: 'businessScope',
    label: '经营范围',
    formItemClass: 'col-span-2',
    componentProps: {
      placeholder: '请输入经营范围',
      rows: 4,
    },
  },
  // ---- 证照附件 ----
  {
    component: 'Divider',
    fieldName: '_divider_license_img',
    label: '',
    hideLabel: true,
    componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
    renderComponentContent: () => ({
      default: () => h(SectionTitle, { title: '证照附件' }),
    }),
    formItemClass: 'col-span-2',
  },
  {
    component: 'ImageUpload',
    fieldName: 'businessLicenseImg',
    label: '营业执照',
    formItemClass: 'col-span-2',
    componentProps: {
      maxCount: 1,
      maxSize: 10,
      accept: 'image/jpg,image/jpeg,image/png',
      helpMessage: false,
    },
  },
];

/**
 * 企业信息表单配置
 */
export const enterpriseInfoSchema: FormSchemaGetter = () => [
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
    component: 'Input',
    fieldName: 'enterpriseScale',
    label: '企业规模',
    componentProps: { placeholder: '请输入企业规模' },
  },
  {
    component: 'Input',
    fieldName: 'industryCategory',
    label: '行业类别',
    componentProps: { placeholder: '请输入行业类别' },
  },
  {
    component: 'Input',
    fieldName: 'companyAddress',
    label: '公司地址',
    componentProps: { placeholder: '请输入公司地址' },
  },
  {
    component: 'Input',
    fieldName: 'companyWebsite',
    label: '公司网站',
    componentProps: { placeholder: '请输入公司网站' },
  },
  {
    component: 'Input',
    fieldName: 'enterprisePhone',
    label: '企业电话',
    componentProps: { placeholder: '请输入企业电话' },
  },
  {
    component: 'Input',
    fieldName: 'enterpriseFax',
    label: '企业传真',
    componentProps: { placeholder: '请输入企业传真' },
  },
  // ---- 人员与费用 ----
  {
    component: 'Divider',
    fieldName: '_divider_staff',
    label: '',
    hideLabel: true,
    componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
    renderComponentContent: () => ({
      default: () => h(SectionTitle, { title: '人员与费用' }),
    }),
    formItemClass: 'col-span-2',
  },
  {
    component: 'InputNumber',
    fieldName: 'rdExpense',
    label: '研发费用(万元)',
    componentProps: {
      placeholder: '请输入研发费用',
      min: 0,
      precision: 2,
      style: { width: '100%' },
    },
  },
  {
    component: 'InputNumber',
    fieldName: 'totalEmployees',
    label: '员工总数',
    componentProps: {
      placeholder: '请输入员工总数',
      min: 0,
      precision: 0,
      style: { width: '100%' },
    },
  },
  {
    component: 'InputNumber',
    fieldName: 'seniorTitleCount',
    label: '高级职称人数',
    componentProps: {
      placeholder: '请输入高级职称人数',
      min: 0,
      precision: 0,
      style: { width: '100%' },
    },
  },
  {
    component: 'InputNumber',
    fieldName: 'juniorTitleCount',
    label: '中级职称人数',
    componentProps: {
      placeholder: '请输入中级职称人数',
      min: 0,
      precision: 0,
      style: { width: '100%' },
    },
  },
  {
    component: 'InputNumber',
    fieldName: 'bidManagerCount',
    label: '投标经理人数',
    componentProps: {
      placeholder: '请输入投标经理人数',
      min: 0,
      precision: 0,
      style: { width: '100%' },
    },
  },
  {
    component: 'InputNumber',
    fieldName: 'bidWorkerCount',
    label: '投标员人数',
    componentProps: {
      placeholder: '请输入投标员人数',
      min: 0,
      precision: 0,
      style: { width: '100%' },
    },
  },
  {
    component: 'InputNumber',
    fieldName: 'bidCostManagerCount',
    label: '造价师人数',
    componentProps: {
      placeholder: '请输入造价师人数',
      min: 0,
      precision: 0,
      style: { width: '100%' },
    },
  },
  // ---- 安全许可 ----
  {
    component: 'Divider',
    fieldName: '_divider_safety',
    label: '',
    hideLabel: true,
    componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
    renderComponentContent: () => ({
      default: () => h(SectionTitle, { title: '安全许可' }),
    }),
    formItemClass: 'col-span-2',
  },
  {
    component: 'Input',
    fieldName: 'certificateNumber',
    label: '证书编号',
    componentProps: { placeholder: '请输入证书编号' },
  },
  {
    component: 'DatePicker',
    fieldName: 'safetyPermitExpiry',
    label: '安全许可证到期日',
    componentProps: {
      format: 'YYYY-MM-DD',
      valueFormat: 'YYYY-MM-DD',
      style: { width: '100%' },
    },
  },
  // ---- 图片资料 ----
  {
    component: 'Divider',
    fieldName: '_divider_images',
    label: '',
    hideLabel: true,
    componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
    renderComponentContent: () => ({
      default: () => h(SectionTitle, { title: '图片资料' }),
    }),
    formItemClass: 'col-span-2',
  },
  {
    component: 'ImageUpload',
    fieldName: 'companyLogo',
    label: '公司Logo',
    componentProps: {
      maxCount: 1,
      maxSize: 10,
      accept: 'image/jpg,image/jpeg,image/png',
      helpMessage: false,
    },
  },
  {
    component: 'ImageUpload',
    fieldName: 'safetyPermitImg',
    label: '安全生产许可证',
    componentProps: {
      maxCount: 1,
      maxSize: 10,
      accept: 'image/jpg,image/jpeg,image/png',
      helpMessage: false,
    },
  },
  {
    component: 'ImageUpload',
    fieldName: 'orgStructure',
    label: '组织架构图',
    componentProps: {
      maxCount: 1,
      maxSize: 10,
      accept: 'image/jpg,image/jpeg,image/png',
      helpMessage: false,
    },
  },
  // ---- PDF附件 ----
  {
    component: 'Divider',
    fieldName: '_divider_files',
    label: '',
    hideLabel: true,
    componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
    renderComponentContent: () => ({
      default: () => h(SectionTitle, { title: 'PDF附件' }),
    }),
    formItemClass: 'col-span-2',
  },
  {
    component: 'FileUpload',
    fieldName: 'taxCertificate',
    label: '税务登记证',
    componentProps: {
      maxCount: 1,
      maxSize: 20,
      accept: '.pdf',
      helpMessage: false,
    },
  },
  {
    component: 'FileUpload',
    fieldName: 'socialSecurityAttachment',
    label: '社保附件',
    componentProps: {
      maxCount: 1,
      maxSize: 20,
      accept: '.pdf',
      helpMessage: false,
    },
  },
  {
    component: 'FileUpload',
    fieldName: 'housingFundAttachment',
    label: '公积金附件',
    componentProps: {
      maxCount: 1,
      maxSize: 20,
      accept: '.pdf',
      helpMessage: false,
    },
  },
  {
    component: 'FileUpload',
    fieldName: 'taxpayerCertificate',
    label: '纳税人资格证',
    componentProps: {
      maxCount: 1,
      maxSize: 20,
      accept: '.pdf',
      helpMessage: false,
    },
  },
  {
    component: 'FileUpload',
    fieldName: 'labAttachment',
    label: '实验室附件',
    componentProps: {
      maxCount: 1,
      maxSize: 20,
      accept: '.pdf',
      helpMessage: false,
    },
  },
];

/**
 * 开户信息表单配置
 */
export const bankInfoSchema: FormSchemaGetter = () => [
  // ---- 账户信息 ----
  {
    component: 'Divider',
    fieldName: '_divider_bank_account',
    label: '',
    hideLabel: true,
    componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
    renderComponentContent: () => ({
      default: () => h(SectionTitle, { title: '账户信息' }),
    }),
    formItemClass: 'col-span-2',
  },
  {
    component: 'Input',
    fieldName: 'accountName',
    label: '开户名称',
    componentProps: { placeholder: '请输入开户名称' },
  },
  {
    component: 'Input',
    fieldName: 'accountBank',
    label: '开户银行',
    componentProps: { placeholder: '请输入开户银行' },
  },
  {
    component: 'Input',
    fieldName: 'accountNumber',
    label: '银行账号',
    componentProps: { placeholder: '请输入银行账号' },
  },
  {
    component: 'Input',
    fieldName: 'bankUnionNumber',
    label: '联行号',
    componentProps: { placeholder: '请输入联行号' },
  },
  // ---- 联系信息 ----
  {
    component: 'Divider',
    fieldName: '_divider_bank_contact',
    label: '',
    hideLabel: true,
    componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
    renderComponentContent: () => ({
      default: () => h(SectionTitle, { title: '联系信息' }),
    }),
    formItemClass: 'col-span-2',
  },
  {
    component: 'Input',
    fieldName: 'bankPhone',
    label: '银行电话',
    componentProps: { placeholder: '请输入银行电话' },
  },
  {
    component: 'Input',
    fieldName: 'bankAddress',
    label: '银行地址',
    componentProps: { placeholder: '请输入银行地址' },
  },
  // ---- 证照附件 ----
  {
    component: 'Divider',
    fieldName: '_divider_bank_img',
    label: '',
    hideLabel: true,
    componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
    renderComponentContent: () => ({
      default: () => h(SectionTitle, { title: '证照附件' }),
    }),
    formItemClass: 'col-span-2',
  },
  {
    component: 'ImageUpload',
    fieldName: 'bankAccountImg',
    label: '开户许可证',
    formItemClass: 'col-span-2',
    componentProps: {
      maxCount: 1,
      maxSize: 10,
      accept: 'image/jpg,image/jpeg,image/png',
      helpMessage: false,
    },
  },
];

/**
 * 其他信息表单配置
 */
export const otherInfoSchema: FormSchemaGetter = () => [
  // ---- 生产与认证 ----
  {
    component: 'Divider',
    fieldName: '_divider_other_prod',
    label: '',
    hideLabel: true,
    componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
    renderComponentContent: () => ({
      default: () => h(SectionTitle, { title: '生产与认证' }),
    }),
    formItemClass: 'col-span-2',
  },
  {
    component: 'Input',
    fieldName: 'annualProductionCapacity',
    label: '年生产能力',
    componentProps: { placeholder: '请输入年生产能力' },
  },
  {
    component: 'Input',
    fieldName: 'managementCertification',
    label: '管理体系认证',
    componentProps: { placeholder: '请输入管理体系认证' },
  },
  {
    component: 'Input',
    fieldName: 'socialGroupLevel',
    label: '社会团体等级',
    componentProps: { placeholder: '请输入社会团体等级' },
  },
  // ---- 股权信息 ----
  {
    component: 'Divider',
    fieldName: '_divider_other_equity',
    label: '',
    hideLabel: true,
    componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
    renderComponentContent: () => ({
      default: () => h(SectionTitle, { title: '股权信息' }),
    }),
    formItemClass: 'col-span-2',
  },
  {
    component: 'Input',
    fieldName: 'holdingService',
    label: '控股服务',
    componentProps: { placeholder: '请输入控股服务' },
  },
  {
    component: 'Input',
    fieldName: 'holdingShareholderRatio',
    label: '控股股东比例',
    componentProps: { placeholder: '请输入控股股东比例' },
  },
  {
    component: 'Input',
    fieldName: 'entrustedService',
    label: '委托服务',
    componentProps: { placeholder: '请输入委托服务' },
  },
  {
    component: 'Input',
    fieldName: 'actualShareholderRatio',
    label: '实际股东比例',
    componentProps: { placeholder: '请输入实际股东比例' },
  },
  // ---- 法律信息 ----
  {
    component: 'Divider',
    fieldName: '_divider_other_legal',
    label: '',
    hideLabel: true,
    componentProps: { orientation: 'left', class: 'section-title-divider', style: { margin: '4px 0 12px' } },
    renderComponentContent: () => ({
      default: () => h(SectionTitle, { title: '法律信息' }),
    }),
    formItemClass: 'col-span-2',
  },
  {
    component: 'Textarea',
    fieldName: 'creditPenaltyInfo',
    label: '信用处罚信息',
    componentProps: {
      placeholder: '请输入信用处罚信息',
      rows: 3,
    },
  },
  {
    component: 'Textarea',
    fieldName: 'recentLitigation',
    label: '近期诉讼',
    componentProps: {
      placeholder: '请输入近期诉讼',
      rows: 3,
    },
  },
];
