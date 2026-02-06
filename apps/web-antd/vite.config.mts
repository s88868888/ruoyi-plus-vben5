import { defineConfig } from '@vben/vite-config';

// 自行取消注释来启用按需导入功能
// import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers';
// import Components from 'unplugin-vue-components/vite';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      plugins: [
        // Components({
        //   dirs: [], // 默认会导入src/components目录下所有组件 不需要
        //   dts: './types/components.d.ts', // 输出类型文件
        //   resolvers: [
        //     AntDesignVueResolver({
        //       // 需要排除Button组件 全局已经默认导入了
        //       exclude: ['Button'],
        //       importStyle: false, // css in js
        //     }),
        //   ],
        // }),
      ],
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            // 如果后端接口路径不包含 /api 前缀，取消下面这行注释
            rewrite: (path) => path.replace(/^\/api/, ''),
            // 后端代理目标地址
            target: 'http://localhost:8080',
            ws: true,
          },
        },
      },
    },
  };
}) as any;
