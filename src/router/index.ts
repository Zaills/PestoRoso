import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import NotFound from '@/components/NotFound.vue'
import GameView from '@/views/GameView.vue'
import AboutView from '@/views/AboutView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView,
    },
    {
      path: '/:roomId/:name',
      name: 'game',
      component: GameView,
    },
    {
      path: '/:catchAll(.*)',
      component: NotFound,
    },
  ],
})

export default router
