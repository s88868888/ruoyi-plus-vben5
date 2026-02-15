import type { ID, IDS, PageQuery, PageResult } from '#/api/common';

import { requestClient } from '#/api/request';

enum Api {
  root = '/resource/product',
  productList = '/resource/product/list',
}

/**
 * 产品信息查询参数
 */
export interface ProductQuery extends PageQuery {
  productName?: string;
  productModel?: string;
  hasPurchaseContract?: string;
  productCategory?: string;
}

/**
 * 产品信息
 */
export interface BizProduct {
  id?: number;
  deptId?: number;
  productName?: string;
  productModel?: string;
  quantity?: number;
  performanceDesc?: string;
  useStartDate?: string;
  useEndDate?: string;
  hasPurchaseContract?: string;
  productCategory?: string;
  productImage?: string;
  relatedImages?: string;
  remark?: string;
  createBy?: number;
  createTime?: string;
}

/**
 * 查询产品信息分页列表
 */
export function productList(params?: ProductQuery) {
  return requestClient.get<PageResult<BizProduct>>(Api.productList, { params });
}

/**
 * 查询产品信息详情
 */
export function productInfo(id: ID) {
  return requestClient.get<BizProduct>(`${Api.root}/${id}`);
}

/**
 * 新增产品信息
 */
export function productAdd(data: Partial<BizProduct>) {
  return requestClient.postWithMsg<BizProduct>(Api.root, data);
}

/**
 * 修改产品信息
 */
export function productUpdate(data: Partial<BizProduct>) {
  return requestClient.putWithMsg<void>(Api.root, data);
}

/**
 * 删除产品信息
 */
export function productRemove(ids: IDS) {
  return requestClient.deleteWithMsg<void>(`${Api.root}/${ids}`);
}
