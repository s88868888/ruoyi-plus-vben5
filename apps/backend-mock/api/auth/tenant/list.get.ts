import { defineEventHandler } from 'h3';
import { useResponseSuccess } from '~/utils/response';

export default defineEventHandler(() => {
  return useResponseSuccess({
    // 设置为 false 表示关闭多租户模式
    tenantEnabled: false,
    voList: [],
  });
});
