import type { BasePageQuery, BasePageResult } from '#/api/model/baseModel';

import { requestClient } from '#/api/request';

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
  createTime?: string;
  updateTime?: string;
}

/**
 * 产品信息查询参数
 */
export interface BizProductQuery extends BasePageQuery {
  deptId?: number;
  productName?: string;
  productCategory?: string;
}

/**
 * 查询产品信息分页列表
 */
export async function productList(params: BizProductQuery) {
  return requestClient.get<BasePageResult<BizProduct>>('/resource/product/list', {
    params,
  });
}

/**
 * 查询产品信息详情
 */
export async function productInfo(id: number) {
  return requestClient.get<BizProduct>(`/resource/product/${id}`);
}

/**
 * 新增产品信息
 */
export async function productAdd(data: BizProduct) {
  return requestClient.post<BizProduct>('/resource/product', data);
}

/**
 * 修改产品信息
 */
export async function productUpdate(data: BizProduct) {
  return requestClient.put('/resource/product', data);
}

/**
 * 删除产品信息
 */
export async function productRemove(ids: number[]) {
  return requestClient.delete(`/resource/product/${ids.join(',')}`);
}
