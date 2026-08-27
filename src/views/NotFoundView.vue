<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
const goHome = () => {
    router.push('/')
}
</script>

<template>
    <div class="practice-section page-pad">
        <div class="notfound-card">
            <img src="/favicon.svg" alt="" class="notfound-logo" />
            <h2 class="notfound-title">페이지를 찾을 수 없습니다.</h2>
            <p class="notfound-desc">
                요청하신 주소가 존재하지 않거나,<br />
                아직 개발되지 않았습니다.
            </p>
            <el-button type="primary" round size="large" @click="goHome">날씨 메인으로 이동</el-button>
        </div>
    </div>
</template>

<style scoped>
.page-pad { padding-top: clamp(24px, 6vw, 40px); }

.notfound-card {
    background: var(--wx-surface);
    border-radius: var(--wx-radius-lg);
    padding: clamp(32px, 8vw, 48px) 24px 40px;
    text-align: center;
    box-shadow: var(--wx-shadow);
}

.notfound-logo {
    display: block;
    width: clamp(72px, 16vw, 96px);
    height: clamp(72px, 16vw, 96px);
    margin: 0 auto 20px;
    border-radius: var(--wx-radius-md);
    box-shadow: var(--wx-shadow);
}

.notfound-title {
    margin: 0 0 10px;
    font-size: clamp(22px, 5vw, 32px);
    font-weight: 800;
    color: var(--wx-text);
}

.notfound-desc {
    margin: 0 0 24px;
    font-size: clamp(14px, 3vw, 18px);
    color: var(--wx-text-soft);
    line-height: 1.6;
}
</style>
