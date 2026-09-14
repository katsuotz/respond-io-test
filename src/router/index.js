import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/:pathMatch(.*)*',
      component: () => import('@/features/workflow/views/WorkflowView.vue'),
    },
    { path: '/', component: () => import('@/features/workflow/views/WorkflowView.vue') },
    {
      path: '/nodes/new',
      name: 'create-node',
      component: () => import('@/features/workflow/views/WorkflowView.vue'),
    },
    {
      path: '/nodes/:nodeId',
      name: 'node-details',
      component: () => import('@/features/workflow/views/WorkflowView.vue'),
    },
  ],
})

export default router
