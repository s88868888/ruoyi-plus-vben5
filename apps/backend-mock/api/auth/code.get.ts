import { defineEventHandler } from 'h3';
import { useResponseSuccess } from '~/utils/response';

export default defineEventHandler(() => {
  // 生成一个简单的验证码
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  return useResponseSuccess({
    captchaEnabled: true,
    img: `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><text x="10" y="30" font-size="24" fill="#333">${code}</text></svg>`).toString('base64')}`,
    uuid: Math.random().toString(36).substring(2, 15),
  });
});
