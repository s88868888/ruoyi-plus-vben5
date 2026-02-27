import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:file-text',
      order: 10,
      title: '招标管理',
    },
    name: 'Bid',
    path: '/bid',
    children: [
      {
        name: 'BidProject',
        path: '/bid/project',
        component: () => import('#/views/bid/project/index.vue'),
        meta: {
          icon: 'lucide:folder',
          title: '招标项目',
        },
      },
      {
        name: 'BidProjectDetail',
        path: '/bid/project/detail/:id',
        component: () => import('#/views/bid/project/detail.vue'),
        meta: {
          hideInMenu: true,
          icon: 'lucide:file-text',
          title: '项目详情',
          activePath: '/bid/project',
        },
      },
      {
        name: 'BidSubmission',
        path: '/bid/submission',
        component: () => import('#/views/bid/submission/index.vue'),
        meta: {
          icon: 'lucide:file-check',
          title: '投标项目管理',
        },
      },
      {
        name: 'BidSubmissionDetail',
        path: '/bid/submission/detail/:id',
        component: () => import('#/views/bid/submission/detail.vue'),
        meta: {
          hideInMenu: true,
          icon: 'lucide:file-check',
          title: '投标项目详情',
          activePath: '/bid/submission',
        },
      },
      {
        name: 'BidSubmissionEditor',
        path: '/bid/submission/editor/:id',
        component: () => import('#/views/bid/submission/editor.vue'),
        meta: {
          hideInMenu: true,
          icon: 'lucide:file-edit',
          title: '标书编辑',
          activePath: '/bid/submission',
        },
      },
    ],
  },
];

export default routes;
