import type { ID, IDS, PageQuery, PageResult } from '#/api/common';

import { requestClient } from '#/api/request';

enum Api {
  root = '/resource/personnel',
  personnelList = '/resource/personnel/list',
  personnelByDept = '/resource/personnel/byDept/',
  certificate = '/resource/personnel/certificate',
  project = '/resource/personnel/project',
}

/**
 * 人员信息查询参数
 */
export interface PersonnelQuery extends PageQuery {
  deptId?: number;
  name?: string;
  gender?: string;
  idCardType?: string;
  idCardNumber?: string;
  phone?: string;
  position?: string;
  status?: string;
}

/**
 * 人员信息
 */
export interface BizPersonnel {
  id?: number;
  deptId?: number;
  deptName?: string;
  name?: string;
  gender?: string;
  genderText?: string;
  birthDate?: string;
  idCardType?: string;
  idCardNumber?: string;
  phone?: string;
  position?: string;
  hireDate?: string;
  workYears?: number;
  status?: string;
  statusText?: string;
  photo?: string;
  idCardFront?: string;
  idCardBack?: string;
  socialSecurity?: string;
  resumeFile?: string;
  remark?: string;
  createTime?: string;
}

/**
 * 人员资格证书
 */
export interface PersonnelCertificate {
  id?: number;
  personnelId?: number;
  certificateName?: string;
  certificateNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  certificateLevel?: string;
  major?: string;
  certificateImage?: string;
  remark?: string;
}

/**
 * 人员项目经验
 */
export interface PersonnelProject {
  id?: number;
  personnelId?: number;
  projectName?: string;
  projectRole?: string;
  projectDescription?: string;
  startDate?: string;
  endDate?: string;
  remark?: string;
}

// ==================== 人员基本信息 ====================

/**
 * 查询人员信息分页列表
 */
export function personnelList(params?: PersonnelQuery) {
  return requestClient.get<PageResult<BizPersonnel>>(Api.personnelList, { params });
}

/**
 * 根据部门ID查询人员列表
 */
export function personnelByDept(deptId: ID) {
  return requestClient.get<BizPersonnel[]>(`${Api.personnelByDept}${deptId}`);
}

/**
 * 查询人员信息详情
 */
export function personnelInfo(id: ID) {
  return requestClient.get<BizPersonnel>(`${Api.root}/${id}`);
}

/**
 * 新增人员信息
 */
export function personnelAdd(data: Partial<BizPersonnel>) {
  return requestClient.postWithMsg<BizPersonnel>(Api.root, data);
}

/**
 * 修改人员信息
 */
export function personnelUpdate(data: Partial<BizPersonnel>) {
  return requestClient.putWithMsg<void>(Api.root, data);
}

/**
 * 删除人员信息
 */
export function personnelRemove(ids: IDS) {
  return requestClient.deleteWithMsg<void>(`${Api.root}/${ids}`);
}

// ==================== 资格证书 ====================

/**
 * 查询人员资格证书列表
 */
export function certificateList(personnelId: ID) {
  return requestClient.get<PersonnelCertificate[]>(`${Api.certificate}/${personnelId}`);
}

/**
 * 新增资格证书
 */
export function certificateAdd(data: Partial<PersonnelCertificate>) {
  return requestClient.postWithMsg<void>(Api.certificate, data);
}

/**
 * 修改资格证书
 */
export function certificateUpdate(data: Partial<PersonnelCertificate>) {
  return requestClient.putWithMsg<void>(Api.certificate, data);
}

/**
 * 删除资格证书
 */
export function certificateRemove(ids: IDS) {
  return requestClient.deleteWithMsg<void>(`${Api.certificate}/${ids}`);
}

// ==================== 项目经验 ====================

/**
 * 查询人员项目经验列表
 */
export function projectList(personnelId: ID) {
  return requestClient.get<PersonnelProject[]>(`${Api.project}/${personnelId}`);
}

/**
 * 新增项目经验
 */
export function projectAdd(data: Partial<PersonnelProject>) {
  return requestClient.postWithMsg<void>(Api.project, data);
}

/**
 * 修改项目经验
 */
export function projectUpdate(data: Partial<PersonnelProject>) {
  return requestClient.putWithMsg<void>(Api.project, data);
}

/**
 * 删除项目经验
 */
export function projectRemove(ids: IDS) {
  return requestClient.deleteWithMsg<void>(`${Api.project}/${ids}`);
}
