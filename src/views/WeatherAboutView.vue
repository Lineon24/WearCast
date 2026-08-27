<script setup>
import { useRouter } from 'vue-router'
import BaseDashboardCard from '@/components/exercise/BaseDashboardCard.vue'

const router = useRouter()
const goHome = () => {
    router.push('/')
}
</script>

<template>
    <div class="practice-section page-pad">
        <BaseDashboardCard icon="👋" title="WearCast, 처음이신가요?">
            <p class="intro-text">
                관심 있는 지역의 날씨를 등록해두고, 궁금할 때마다 AI 챗봇에게 "오늘 뭐 입지?", "우산 챙겨야 돼?"라고
                편하게 물어보는 서비스예요. 아래 순서대로 한 번만 따라 해보시면 바로 익숙해지실 거예요.
            </p>
        </BaseDashboardCard>

        <BaseDashboardCard title="1. 내 지역 추가하기">
            <div class="step-row">
                <span class="step-num">1</span>
                <p class="step-text">
                    대시보드 맨 위 <strong>"내 지역 카드 추가"</strong>에서 도시 이름을 검색하거나
                    <strong>📍 내 위치</strong> 버튼을 눌러보세요. 서울·수원·부산 등 몇몇 지역은 이미 등록되어 있어요.
                </p>
            </div>
        </BaseDashboardCard>

        <BaseDashboardCard title="2. 카드 확인하고 즐겨찾기">
            <div class="step-row">
                <span class="step-num">2</span>
                <p class="step-text">
                    등록된 지역은 카드로 보여요. 카드를 <strong>한 번 누르면 즐겨찾기(★)</strong>에 등록되고,
                    필요 없어진 지역은 카드 우측 상단 <strong>× 버튼</strong>으로 지울 수 있어요 (실수 방지를 위해 확인창이 한 번 떠요).
                </p>
            </div>
        </BaseDashboardCard>

        <BaseDashboardCard title="3. 상세보기로 더 자세히">
            <div class="step-row">
                <span class="step-num">3</span>
                <p class="step-text">
                    카드의 <strong>상세보기</strong> 버튼을 누르면 기온·습도·풍속·공기질은 물론
                    자외선 지수, 강수확률·강수량, 24시간·5일 예보까지 한눈에 볼 수 있어요.
                </p>
            </div>
        </BaseDashboardCard>

        <BaseDashboardCard title="4. 챗봇에게 물어보기">
            <div class="step-row">
                <span class="step-num">4</span>
                <p class="step-text">
                    상단 <strong>🤖 챗봇</strong> 메뉴에서 지역을 하나 고르면, 그 지역의 실제 날씨를 바탕으로
                    옷차림이나 우산이 필요한지 실시간으로 답해줘요. 대화 내용은 저장되어 나중에 다시 봐도 그대로예요.
                </p>
            </div>
        </BaseDashboardCard>

        <BaseDashboardCard title="+ 알아두면 좋은 것">
            <ul class="tip-list">
                <li><el-icon><Switch /></el-icon> 우측 상단 스위치로 섭씨(°C)/화씨(°F)를 바꿀 수 있어요.</li>
                <li><el-icon><Search /></el-icon> 검색창에 도시명을 입력하면 등록된 카드가 바로 걸러져요.</li>
            </ul>
        </BaseDashboardCard>

        <el-button class="home-btn" type="primary" round size="large" @click="goHome">
            대시보드 홈으로 이동
        </el-button>
    </div>
</template>

<style scoped>
.page-pad { padding-top: clamp(18px, 4vw, 28px); }

.intro-text {
    font-size: 13px;
    color: var(--wx-text-soft);
    line-height: 1.6;
    margin: 0;
}

.step-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
}
.step-num {
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--wx-primary);
    color: #fff;
    font-size: 13px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
}
.step-text {
    margin: 0;
    font-size: 13px;
    color: var(--wx-text);
    line-height: 1.6;
}
.step-text strong { color: var(--wx-primary-dark); }

.tip-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 12.5px;
    color: var(--wx-text);
}
.tip-list li {
    display: flex;
    align-items: center;
    gap: 8px;
    line-height: 1.5;
}
.tip-list .el-icon { color: var(--wx-primary); flex-shrink: 0; }

.home-btn {
    display: flex;
    width: 100%;
    margin-top: 4px;
}
</style>
