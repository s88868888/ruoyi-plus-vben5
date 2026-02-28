import type { ID, IDS, PageQuery, PageResult } from '#/api/common';

import { requestClient } from '#/api/request';

enum Api {
  root = '/resource/companyInfo',
  companyList = '/resource/companyInfo/list',
  companyInfo = '/resource/companyInfo/',
  syncVector = '/resource/companyInfo/syncVector',
}

/**
 * 公司列表查询参数
 */
export interface CompanyListQuery extends PageQuery {
  deptName?: string;
  status?: string;
}

/**
 * 公司列表卡片VO
 */
export interface CompanyListVo {
  deptId?: number;
  deptName?: string;
  leader?: number;
  leaderName?: string;
  phone?: string;
  status?: string;
  unifiedCreditCode?: string;
  companyLogo?: string;
  enterpriseAbbr?: string;
  companyInfoId?: number;
  qualificationCount?: number;
  personnelCount?: number;
  certificateCount?: number;
}

/**
 * 企业信息详情
 */
export interface BizCompanyInfo {
  id?: number;
  deptId?: number;
  // 营业执照信息
  unifiedCreditCode?: string;
  legalPerson?: string;
  registeredCapital?: string;
  enterpriseNature?: string;
  establishmentDate?: string;
  registrationAuthority?: string;
  registrationDate?: string;
  businessLongTerm?: string;
  businessEndDate?: string;
  enterpriseAbbr?: string;
  enterpriseRegion?: string;
  registeredAddress?: string;
  businessScope?: string;
  businessLicenseImg?: string;
  businessBreakthrough?: string;
  // 企业信息
  companyLogo?: string;
  taxCertificate?: string;
  socialSecurityAttachment?: string;
  housingFundAttachment?: string;
  taxpayerCertificate?: string;
  labAttachment?: string;
  enterpriseScale?: string;
  industryCategory?: string;
  companyAddress?: string;
  companyWebsite?: string;
  enterprisePhone?: string;
  enterpriseFax?: string;
  rdExpense?: number;
  totalEmployees?: number;
  seniorTitleCount?: number;
  juniorTitleCount?: number;
  bidManagerCount?: number;
  bidWorkerCount?: number;
  bidCostManagerCount?: number;
  certificateNumber?: string;
  orgStructure?: string;
  safetyPermitExpiry?: string;
  safetyPermitImg?: string;
  // 开户信息
  accountName?: string;
  accountBank?: string;
  accountNumber?: string;
  bankUnionNumber?: string;
  bankPhone?: string;
  bankAddress?: string;
  bankAccountImg?: string;
  // 其他信息
  annualProductionCapacity?: string;
  holdingService?: string;
  holdingShareholderRatio?: string;
  entrustedService?: string;
  actualShareholderRatio?: string;
  managementCertification?: string;
  socialGroupLevel?: string;
  creditPenaltyInfo?: string;
  recentLitigation?: string;
  // 审计字段
  createTime?: string;
  updateTime?: string;
}

/**
 * 查询公司卡片列表
 */
export function companyList(params?: CompanyListQuery) {
  return requestClient.get<PageResult<CompanyListVo>>(Api.companyList, { params });
}

/**
 * 根据部门ID查询企业详细信息
 */
export function companyInfo(deptId: ID) {
  return requestClient.get<BizCompanyInfo>(`${Api.companyInfo}${deptId}`);
}

/**
 * 新增企业信息
 */
export function companyInfoAdd(data: Partial<BizCompanyInfo>) {
  return requestClient.postWithMsg<void>(Api.root, data);
}

/**
 * 修改企业信息
 */
export function companyInfoUpdate(data: Partial<BizCompanyInfo>) {
  return requestClient.putWithMsg<void>(Api.root, data);
}

/**
 * 删除企业信息
 */
export function companyInfoRemove(ids: IDS) {
  return requestClient.deleteWithMsg<void>(`${Api.root}/${ids}`);
}

/**
 * 同步所有企业信息到向量库
 */
export function companyInfoSyncVector() {
  return requestClient.postWithMsg<string>(Api.syncVector);
}

/**
 * 同步指定企业信息到向量库
 */
export function companyInfoSyncVectorByDept(deptId: ID) {
  return requestClient.postWithMsg<void>(`${Api.syncVector}/${deptId}`);
}
