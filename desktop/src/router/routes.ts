import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('pages/LoginPage.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: { name: 'dashboard' },
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('pages/DashboardPage.vue'),
      },
      {
        path: 'sites',
        name: 'sites',
        component: () => import('pages/SitesPage.vue'),
      },
      {
        path: 'assets',
        name: 'assets',
        component: () => import('pages/AssetsPage.vue'),
      },
      {
        path: 'supervisors',
        name: 'supervisors',
        component: () => import('pages/SupervisorManagementPage.vue'),
      },
      {
        path: 'scanner',
        name: 'scanner',
        component: () => import('pages/ScannerPage.vue'),
        meta: { allowedRoles: ['supervisor'] },
      },
      {
        path: 'account',
        name: 'account',
        component: () => import('pages/AccountPage.vue'),
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
    beforeEnter: (to) => {
      if (to.hash && to.hash.length > 1) {
        return false;
      }
    },
  },
];

export default routes;
