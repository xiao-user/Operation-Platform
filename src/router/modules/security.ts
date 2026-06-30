import type { RouteRecordRaw } from 'vue-router'

export const securityRoutes: RouteRecordRaw[] = [
  {
    path: 'security/new-gate',
    redirect: '/security/new-gate/device-list',
  },
  {
    path: 'security/new-gate/device-list',
    name: 'device-list',
    component: () => import('@/views/security/new-gate/DeviceListView.vue'),
    meta: {
      moduleKey: 'security',
      menuKey: 'device-list',
      sectionKey: 'new-gate',
      title: '设备列表',
    },
  },
  {
    path: 'security/new-gate/person-group',
    name: 'person-group',
    component: () => import('@/views/security/new-gate/PersonGroupView.vue'),
    meta: {
      moduleKey: 'security',
      menuKey: 'person-group',
      sectionKey: 'new-gate',
      title: '人员分组',
    },
  },
  {
    path: 'security/new-gate/special-date',
    name: 'special-date',
    component: () => import('@/views/security/new-gate/SpecialDateView.vue'),
    meta: {
      moduleKey: 'security',
      menuKey: 'special-date',
      sectionKey: 'new-gate',
      title: '特殊日期',
    },
  },
  {
    path: 'security/new-gate/temp-auth',
    name: 'temp-auth',
    component: () => import('@/views/security/new-gate/TempAuthView.vue'),
    meta: {
      moduleKey: 'security',
      menuKey: 'temp-auth',
      sectionKey: 'new-gate',
      title: '临时授权',
    },
  },
  {
    path: 'security/new-gate/settings',
    name: 'settings',
    component: () => import('@/views/security/new-gate/SettingsView.vue'),
    meta: {
      moduleKey: 'security',
      menuKey: 'settings',
      sectionKey: 'new-gate',
      title: '设置',
    },
  },
  {
    path: 'security/visitor',
    name: 'visitor',
    component: () => import('@/views/PlaceholderView.vue'),
    meta: {
      moduleKey: 'security',
      menuKey: 'visitor',
      title: '访客管理',
    },
  },
]
