import { createRouter, createWebHistory } from 'vue-router'
import LobbyView from '@/views/LobbyView.vue'
import GameContainerView from '@/views/GameContainerView.vue'
import LeaderboardView from '@/views/LeaderboardView.vue'
import ShopView from '@/views/ShopView.vue'
import ProfileView from '@/views/ProfileView.vue'

const routes = [
  {
    path: '/',
    name: 'lobby',
    component: LobbyView,
    meta: { title: '游戏大厅 - KK Arcade Hub' }
  },
  {
    path: '/game/:id',
    name: 'game',
    component: GameContainerView,
    meta: { title: '正在游戏中 - KK Arcade Hub' }
  },
  {
    path: '/leaderboard',
    name: 'leaderboard',
    component: LeaderboardView,
    meta: { title: '名人堂排行榜 - KK Arcade Hub' }
  },
  {
    path: '/shop',
    name: 'shop',
    component: ShopView,
    meta: { title: '主题商城 - KK Arcade Hub' }
  },
  {
    path: '/profile',
    name: 'profile',
    component: ProfileView,
    meta: { title: '个人战绩与成就 - KK Arcade Hub' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach((to) => {
  if (to.meta.title) {
    document.title = to.meta.title as string
  }
})

export default router
