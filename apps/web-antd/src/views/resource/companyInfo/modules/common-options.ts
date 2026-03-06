/**
 * 公司信息各模块常用选项配置
 */

/** 将字符串数组转为 { label, value } 格式（供 a-select 使用） */
function toSelectOptions(arr: string[]) {
  return arr.map((item) => ({ label: item, value: item }));
}

// ============ 资质信息 ============

// 证书类别
export const qualificationCertCategoryList = [
  '行业资质',
  '安全资质',
  '体系认证',
  '能力成熟度',
  '高新技术企业认定',
  '专精特新企业认定',
  '信用等级证书',
  '其他资质证书',
];
export const qualificationCertCategoryOptions = toSelectOptions(qualificationCertCategoryList);

// 证书状态
export const qualificationCertStatusList = [
  '有效',
  '即将到期',
  '已过期',
  '审核中',
  '暂停使用',
];
export const qualificationCertStatusOptions = toSelectOptions(qualificationCertStatusList);

// 发证机关
export const qualificationIssuingAuthorityList = [
  'CMMI Institute',
  '中国信息安全认证中心',
  '中国电子信息行业联合会',
  '中国质量认证中心',
  '广东省公安厅',
  '广东省工业和信息化厅',
  '住房和城乡建设部',
  '省住房和城乡建设厅',
  '国家认证认可监督管理委员会',
  '科学技术部',
];
export const qualificationIssuingAuthorityOptions = toSelectOptions(qualificationIssuingAuthorityList);

/** 资质信息常用选项（供 AutoComplete 使用） */
export const qualificationOptions = {
  certCategory: qualificationCertCategoryList,
  certStatus: qualificationCertStatusList,
  issuingAuthority: qualificationIssuingAuthorityList,
};

// ============ 业绩信息 ============

// 业绩分类
export const performanceCategoryList = [
  '信息化建设',
  '系统集成',
  '大数据',
  '物联网',
  '网络安全',
  '软件开发',
  '智慧城市',
  '云计算',
];
export const performanceCategoryOptions = toSelectOptions(performanceCategoryList);

// 工艺类型（采购方式）
export const performanceProcessTypeList = [
  '公开招标',
  '邀请招标',
  '竞争性谈判',
  '竞争性磋商',
  '询价采购',
  '单一来源采购',
];
export const performanceProcessTypeOptions = toSelectOptions(performanceProcessTypeList);

// 项目状态
export const performanceProjectStatusList = [
  '在建',
  '已完工',
  '已验收',
  '运营中',
  '暂停',
];
export const performanceProjectStatusOptions = toSelectOptions(performanceProjectStatusList);

// 业主单位性质
export const performanceOwnerUnitNatureList = [
  '政府机关',
  '事业单位',
  '国有企业',
  '民营企业',
  '外资企业',
  '合资企业',
  '其他',
];
export const performanceOwnerUnitNatureOptions = toSelectOptions(performanceOwnerUnitNatureList);

/** 业绩信息常用选项（供 AutoComplete 使用） */
export const performanceOptions = {
  performanceCategory: performanceCategoryList,
  projectStatus: performanceProjectStatusList,
  ownerUnitNature: performanceOwnerUnitNatureList,
  processType: performanceProcessTypeList,
};

// ============ 专利荣誉 ============

// 专利类型
export const patentTypeList = [
  { label: '发明专利', value: '1' },
  { label: '实用新型专利', value: '2' },
  { label: '外观设计专利', value: '3' },
  { label: '软件著作权', value: '4' },
  { label: '荣誉证书', value: '5' },
  { label: '奖项', value: '6' },
];

// 领域
export const patentFieldList = [
  '信息技术',
  '软件',
  '物联网',
  '网络安全',
  '节能环保',
  '科技奖励',
  '电子信息',
  '新材料',
  '其他',
];
export const patentFieldOptions = toSelectOptions(patentFieldList);

// 专利状态
export const patentStatusOptions = [
  { label: '有效', value: '0' },
  { label: '无效', value: '1' },
];

/** 专利荣誉常用选项（供 AutoComplete 使用） */
export const patentMedalOptions = {
  patentType: ['发明专利', '实用新型专利', '外观设计专利', '软件著作权', '荣誉证书', '奖项'],
  field: patentFieldList,
};

// ============ 财务信息 ============

// 信息类型
export const financeInfoTypeList = [
  '财务报表',
  '审计报告',
  '纳税证明',
  '银行资信证明',
  '资产负债表',
  '利润表',
  '现金流量表',
  '其他财务资料',
];
export const financeInfoTypeOptions = toSelectOptions(financeInfoTypeList);

/** 财务信息常用选项（供 AutoComplete 使用） */
export const financeOptions = {
  infoType: financeInfoTypeList,
};

// ============ 知识库 ============

// 项目类型
export const knowledgeProjectTypeList = [
  '信息化建设',
  '系统集成',
  '大数据',
  '物联网',
  '网络安全',
  '软件开发',
  '智慧城市',
  '其他项目',
];
export const knowledgeProjectTypeOptions = toSelectOptions(knowledgeProjectTypeList);

// 数据权限
export const dataPermissionTypeOptions = [
  { label: '私域', value: '0' },
  { label: '公域', value: '1' },
];

/** 知识库常用选项（供 AutoComplete 使用） */
export const knowledgeOptions = {
  projectType: knowledgeProjectTypeList,
};

// ============ 竞争公司 ============

// 公司类型
export const competitorCompanyTypeList = [
  '国有企业',
  '民营企业',
  '外资企业',
  '合资企业',
  '上市公司',
  '其他',
];
export const competitorCompanyTypeOptions = toSelectOptions(competitorCompanyTypeList);

// 竞争级别
export const competitorLevelOptions = [
  { label: '强', value: '强' },
  { label: '中', value: '中' },
  { label: '弱', value: '弱' },
];

/** 竞争公司常用选项（供 AutoComplete 使用） */
export const competitorOptions = {
  companyType: competitorCompanyTypeList,
};
