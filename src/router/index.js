import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: () => import('@/views/WeatherHomeView.vue'),
        },
        {
            path: '/about',
            name: 'about',
            component: () => import('@/views/WeatherAboutView.vue'),
        },
        {
            path: '/weather/:cityId',
            name: 'weather-detail',
            component: () => import('@/views/WeatherDetailView.vue'),
        },
        {
            path: '/favorites',
            name: 'favorites',
            component: () => import('@/views/WeatherFavoritesView.vue'),
        },
        {
            path: '/chatbot',
            name: 'chatbot',
            component: () => import('@/views/WeatherChatbotView.vue'),
        },
        // 반드시 맨 마지막에 위치
        {
            path: '/:pathMatch(.*)*',
            name: 'not-found',
            component: () => import('@/views/NotFoundView.vue'),
        },
    ],
})

export default router

