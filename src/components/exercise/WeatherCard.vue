<script setup>
import { computed } from 'vue'
import { useConfigStore } from '@/stores/configStore'

const props = defineProps({
    city: { type: Object, required: true },
    isFavorite: { type: Boolean, default: false },
    isCustom: { type: Boolean, default: false },
})

const emit = defineEmits(['select-card', 'click-detail', 'remove-card'])

const configStore = useConfigStore()

// 날씨 상태에 맞는 이모지를 보여주기 위한 헬퍼(helper, 헬퍼 - 반복 작업을 줄여주는 보조 함수)
const emojiMap = { 맑음: '☀️', 비: '🌧️', 구름: '☁️' }
const getEmoji = (weatherStatus) => emojiMap[weatherStatus] || '🌈'

// 아이콘 원 배경도 날씨 상태에 맞춰 톤을 바꿔준다
const toneMap = { 맑음: 'is-sunny', 비: 'is-rainy', 구름: 'is-cloudy' }
const getTone = (weatherStatus) => toneMap[weatherStatus] || 'is-cloudy'

const displayTemp = computed(() => {
    const rawTemp = props.city.temp // 기본 원본 데이터는 섭씨 숫자
    if (configStore.unit === 'fahrenheit') {
        return Math.round(((rawTemp * 9) / 5 + 32) * 10) / 10
    }
    return rawTemp
})

const displayFeelsLike = computed(() => {
    const rawFeelsLike = props.city.feelsLike
    if (configStore.unit === 'fahrenheit') {
        return Math.round(((rawFeelsLike * 9) / 5 + 32) * 10) / 10
    }
    return rawFeelsLike
})
</script>

<template>
    <div class="weather-card" @click="emit('select-card', city)">
        <button class="remove-btn" @click.stop="emit('remove-card', city.id)" aria-label="삭제">
            <el-icon><Close /></el-icon>
        </button>

        <div class="weather-info">
            <div class="weather-icon" :class="getTone(city.status)">{{ getEmoji(city.status) }}</div>
            <div class="weather-text">
                <div class="city-line">
                    <span v-if="isFavorite" class="fav-star active">★</span>
                    <span v-else class="fav-star">☆</span>
                    <span class="city-name">{{ city.name }}</span>
                    <span class="status">{{ city.status }}</span>
                </div>
                <!-- 이름만 같고 좌표가 다른 카드(예: 기본 "서울" vs 내 위치로 추가한 "서울")를
                     구분할 수 있도록 지역 정보를 작게 함께 표시한다 -->
                <div v-if="city.region && city.region !== city.name" class="region-line">{{ city.region }}</div>
                <div class="temp-line">{{ displayTemp.toFixed(1) }}{{ configStore.unitSymbol }}</div>
                <div class="feels-line">체감 {{ displayFeelsLike.toFixed(1) }}{{ configStore.unitSymbol }}</div>
                <el-tag v-if="city.temp >= 25" type="danger" round effect="light" size="small">🔥 더움</el-tag>
                <el-tag v-else type="primary" round effect="light" size="small">❄️ 선선함</el-tag>
            </div>
        </div>

        <el-button class="action-btn" round type="primary" plain @click.stop="emit('click-detail', city)">
            상세보기
        </el-button>
    </div>
</template>

<style scoped>
.weather-card {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    background: var(--wx-surface);
    border-radius: var(--wx-radius-md);
    padding: 14px 16px;
    margin-bottom: 10px;
    cursor: pointer;
    box-shadow: var(--wx-shadow-sm);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.weather-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--wx-shadow);
}

.remove-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 50%;
    background: var(--wx-bg);
    color: var(--wx-text-soft);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
}
.remove-btn:hover { background: var(--wx-danger); color: #fff; }

.weather-info { display: flex; align-items: center; gap: 12px; min-width: 0; }

.weather-icon {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
    background: var(--wx-primary-light);
}
.weather-icon.is-sunny { background: linear-gradient(145deg, #ffe3a3, #ffcf6b); }
.weather-icon.is-rainy { background: linear-gradient(145deg, #cdd8f7, #a9bbf0); }
.weather-icon.is-cloudy { background: linear-gradient(145deg, #e4e7f6, #ccd2ee); }

.weather-text { min-width: 0; }
.city-line {
    display: flex;
    align-items: baseline;
    gap: 5px;
    font-size: 16px;
    font-weight: 800;
    color: var(--wx-text);
}
.city-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.city-line .status { font-weight: 500; color: var(--wx-text-soft); font-size: 12.5px; }
.region-line {
    font-size: 11px;
    color: var(--wx-text-faint);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-top: 1px;
}
.temp-line { font-size: 14px; font-weight: 700; color: var(--wx-text); margin: 2px 0 0; }
.feels-line { font-size: 11px; color: var(--wx-text-faint); margin: 0 0 6px; }

.fav-star { color: var(--wx-text-faint); font-size: 13px; }
.fav-star.active { color: var(--wx-warm); }

.action-btn { flex-shrink: 0; }

@media (max-width: 360px) {
    .action-btn { padding: 8px 12px; font-size: 12px; }
}
</style>
