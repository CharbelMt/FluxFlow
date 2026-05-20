import type { RouteRecordRaw } from 'vue-router';
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
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
        redirect: () => {
          try {
            const raw = localStorage.getItem('user');
            if (!raw) return { name: 'dashboard' };
            const parsed = JSON.parse(raw);
            return parsed?.role === 'supervisor' ? { name: 'scanner' } : { name: 'dashboard' };
          } catch {
            return { name: 'dashboard' };
          }
        },
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('pages/DashboardPage.vue'),
        meta: { allowedRoles: ['admin', 'manager'] },
      },
      {
        path: 'sites',
        name: 'sites',
        component: () => import('pages/SitesPage.vue'),
        meta: { allowedRoles: ['admin', 'manager'] },
      },
      {
        path: 'assets',
        name: 'assets',
        component: () => import('pages/AssetsPage.vue'),
      },
      {
        path: 'assets/:asset_id',
        name: 'asset-detail',
        component: () => import('pages/AssetDetailView.vue'),
        meta: { showBackButton: true },
      },
      {
        path: 'assets/models',
        name: 'asset-models',
        component: () => import('pages/AssetModelsPage.vue'),
        meta: { allowedRoles: ['admin', 'manager'], showBackButton: true },
      },
      {
        path: 'supervisors',
        name: 'supervisors',
        component: () => import('pages/SupervisorManagementPage.vue'),
        meta: { allowedRoles: ['admin', 'manager'] },
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
