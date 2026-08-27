<script setup>
import { RouterLink, RouterView, useRoute } from 'vue-router'
import UnitToggler from '@/components/exercise/UnitToggler.vue'

const route = useRoute()
// 🛠️ 트러블슈팅 [v0.0.0]: 처음엔 아이콘을 이모지(📋ℹ️⭐🤖)로 썼는데, 브라우저/OS마다 이모지 색·굵기가
// 제각각이라 지저분해 보인다는 피드백을 받았다. Element Plus 아이콘(벡터, 단색)으로 바꿔서
// 톤이 일관되게 나오도록 했다.
const navItems = [
    { to: '/', label: '대시보드', icon: 'HomeFilled' },
    { to: '/about', label: '소개', icon: 'InfoFilled' },
    { to: '/favorites', label: '즐겨찾기', icon: 'StarFilled' },
    { to: '/chatbot', label: '챗봇', icon: 'ChatDotRound' },
]
</script>

<template>
    <header class="app-header-bar">
        <div class="practice-section app-header-inner">
            <RouterLink to="/" class="brand">
                <img src="/favicon.svg" class="brand-mark" alt="" width="24" height="24" />
                <span class="brand-text">WearCast</span>
            </RouterLink>

            <div class="app-toolbar">
                <nav class="app-nav">
                    <RouterLink
                        v-for="item in navItems" :key="item.to"
                        :to="item.to"
                        class="app-nav__item"
                        :class="{ 'is-active': route.path === item.to }"
                    >
                        <el-icon class="app-nav__icon"><component :is="item.icon" /></el-icon>
                        <span class="app-nav__label">{{ item.label }}</span>
                    </RouterLink>
                </nav>
                <UnitToggler />
            </div>
        </div>
    </header>

    <main>
        <RouterView />
    </main>
</template>

<style scoped>
.app-header-bar {
    background: var(--wx-surface);
    border-bottom: 1px solid var(--wx-border);
    position: sticky;
    top: 0;
    z-index: 20;
}

/* 🛠️ 트러블슈팅 [v0.0.0]: 처음엔 로고를 위 줄, 메뉴+단위 스위치를 아래 줄로 나눠서(column) 배치했는데,
   화면이 좁아지면 로고와 메뉴 사이에 이상하게 빈 공간이 생기고 "챗봇" 메뉴가 오른쪽으로
   치우쳐 보이는 문제가 있었다. flex-wrap: wrap이 남아있으면 폭이 애매한 구간(약 450~560px)에서
   줄바꿈이 되기도 했다. 그래서 한 줄(row) + nowrap으로 바꾸고, 로고/스위치는 flex-shrink: 0으로
   고정해서 항상 한 줄을 유지하도록 했다 (메뉴 부분만 자체 스크롤로 흡수). */
.app-header-inner {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    column-gap: 10px;
    padding-top: clamp(14px, 3vw, 20px);
    padding-bottom: 12px;
}

.brand {
    display: flex;
    align-items: center;
    gap: 6px;
    text-decoration: none;
    flex-shrink: 0;
}
.brand-mark {
    width: 24px;
    height: 24px;
    display: block;
}
.brand-text {
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0.02em;
    color: var(--wx-text);
    white-space: nowrap;
}

.app-toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 10px;
    min-width: 0;
}

/* 🛠️ 트러블슈팅 [v0.0.0]: 원래 flex: 1이었는데, 그러면 메뉴 4개짜리 배경(연한 회색 알약)이
   남는 공간을 억지로 다 채우면서 늘어나서 메뉴와 단위 스위치 사이에 이상한 빈 공간이 생겼다.
   flex: 0 1 auto로 바꿔서 배경이 메뉴 4개 크기에 딱 맞게 줄어들도록 고쳤다. */
.app-nav {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--wx-bg);
    border-radius: var(--wx-radius-pill);
    padding: 3px;
    overflow-x: auto;
    scrollbar-width: none;
    flex: 0 1 auto;
    min-width: 0;
}
.app-nav::-webkit-scrollbar { display: none; }

/* 🛠️ 트러블슈팅 [v0.0.0]: 라벨 글자 수가 달라서("소개"/"챗봇" 2글자 vs "대시보드"/"즐겨찾기" 4글자)
   버튼 폭이 71px/92px로 들쭉날쭉했고, 그래서 간격이 고르지 않은 것처럼 보인다는 피드백을 받았다.
   실제 gap은 4px로 항상 일정했지만(개발자도구로 직접 재서 확인), 눈에는 안 고르게 보였다.
   min-width로 폭을 84px/76px 정도로 맞췄더니 이번엔 좁은 화면에서 "챗봇" 라벨이 살짝 잘려서,
   좌우 패딩(14px→10px)과 컨테이너 패딩(4px→3px)도 같이 줄여서 딱 맞게 조정했다. */
.app-nav__item {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex-shrink: 0;
    text-decoration: none;
    color: var(--wx-text-soft);
    font-size: 12.5px;
    font-weight: 600;
    height: 34px;
    min-width: 76px;
    padding: 0 10px;
    border-radius: var(--wx-radius-pill);
    transition: background 0.15s ease, color 0.15s ease;
    white-space: nowrap;
}
.app-nav__item:hover { color: var(--wx-primary); background: var(--wx-surface); }
.app-nav__item.is-active {
    background: var(--wx-primary);
    color: #fff;
    box-shadow: var(--wx-shadow-sm);
}
.app-nav__item.is-active:hover { color: #fff; }
.app-nav__icon { font-size: 15px; }

@media (max-width: 420px) {
    .app-nav__label { display: none; }
    .app-nav__item { width: 34px; min-width: 34px; padding: 0; }
}

main {
    display: block;
}
</style>
