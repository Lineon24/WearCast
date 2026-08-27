<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseDashboardCard from '@/components/exercise/BaseDashboardCard.vue'
import { weatherMockData } from '@/mock/weatherMock.js'
import {
    fetchWeatherByCoords,
    fetchAirPollution,
    fetchForecast,
    fetchUvIndex,
    fetchUvForecast,
    findUvAtTime,
} from '@/api/weather.js'
import { useConfigStore } from '@/stores/configStore'
import { useCustomCitiesStore } from '@/stores/customCities'

const route = useRoute()
const router = useRouter()
const city = ref(null)
const airQuality = ref(null)
const forecastList = ref([])
const isLoading = ref(false)
const uvIndex = ref(null)
const hourlyUvData = ref(null)

const configStore = useConfigStore()
const customCitiesStore = useCustomCitiesStore()
const emojiMap = { 맑음: '☀️', 비: '🌧️', 구름: '☁️', 눈: '❄️' }
const getEmoji = (status) => emojiMap[status] || '🌈'

// URL의 cityId로 기본/커스텀 지역 정보를 찾아서, 현재 날씨·대기질·예보·자외선을 한 번에 불러온다
const loadCity = async () => {
    const cityMeta =
        weatherMockData.find((item) => item.id === route.params.cityId) ||
        customCitiesStore.cities.find((item) => item.id === route.params.cityId)

    if (!cityMeta) {
        city.value = null
        return
    }

    isLoading.value = true
    try {
        const [weather, air, forecast, uv, hourlyUv] = await Promise.all([
            fetchWeatherByCoords(cityMeta.lat, cityMeta.lon),
            fetchAirPollution(cityMeta.lat, cityMeta.lon),
            fetchForecast(cityMeta.lat, cityMeta.lon),
            fetchUvIndex(cityMeta.lat, cityMeta.lon),
            fetchUvForecast(cityMeta.lat, cityMeta.lon),
        ])
        city.value = { ...cityMeta, ...weather }
        airQuality.value = air
        forecastList.value = forecast
        uvIndex.value = uv
        hourlyUvData.value = hourlyUv
    } catch (error) {
        console.error('상세 날씨 데이터를 가져오는 중 오류가 발생했습니다:', error)
        city.value = null
    } finally {
        isLoading.value = false
    }
}

const precipitationProbability = computed(() => forecastList.value[0]?.pop ?? 0)

const uvLabel = computed(() => {
    if (uvIndex.value === null) return ''
    if (uvIndex.value <= 2) return '낮음'
    if (uvIndex.value <= 5) return '보통'
    if (uvIndex.value <= 7) return '높음'
    if (uvIndex.value <= 10) return '매우 높음'
    return '위험'
})

const uvPercentage = computed(() => Math.min(Math.round(((uvIndex.value ?? 0) / 11) * 100), 100))
const showSunscreenAlert = computed(() => (uvIndex.value ?? 0) >= 3)

const uvGaugeColor = [
    { color: '#67c23a', percentage: 30 },
    { color: '#e6a23c', percentage: 60 },
    { color: '#f56c6c', percentage: 100 },
]

onMounted(loadCity)
watch(() => route.params.cityId, loadCity)

const displayTemp = computed(() => {
    if (!city.value) return null
    const rawTemp = city.value.temp
    if (configStore.unit === 'fahrenheit') {
        return Math.round((rawTemp * 9) / 5 + 32)
    }
    return rawTemp
})

const goHome = () => {
    router.push('/')
}

// 배열에서 가장 많이 등장한 값을 반환 (하루치 3시간 예보들 중 대표 날씨 상태를 뽑을 때 사용)
const getMostFrequent = (arr) => {
    const counts = {}
    arr.forEach((v) => { counts[v] = (counts[v] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토']
const formatWeekday = (dateStr) => weekdayLabels[new Date(dateStr).getDay()]

// 3시간 단위 24시간치 (앞 8개) + 각 시간대별 UV
const hourlyForecast = computed(() =>
    forecastList.value.slice(0, 8).map((item) => ({
        ...item,
        uv: hourlyUvData.value ? findUvAtTime(hourlyUvData.value, item.timestamp) : null,
    }))
)

// 날짜별로 묶어서 하루 최저/최고/대표날씨 + 최대 강수확률/UV 계산
const dailyForecast = computed(() => {
    const grouped = {}
    forecastList.value.forEach((item) => {
        if (!grouped[item.date]) grouped[item.date] = { temps: [], statuses: [], pops: [], uvs: [], rains: [] }
        grouped[item.date].temps.push(item.temp)
        grouped[item.date].statuses.push(item.status)
        grouped[item.date].pops.push(item.pop)
        grouped[item.date].rains.push(item.rainAmount ?? 0)
        if (hourlyUvData.value) {
            grouped[item.date].uvs.push(findUvAtTime(hourlyUvData.value, item.timestamp))
        }
    })

    return Object.entries(grouped).map(([date, info]) => ({
        date,
        minTemp: Math.min(...info.temps),
        maxTemp: Math.max(...info.temps),
        status: getMostFrequent(info.statuses),
        maxPop: Math.max(...info.pops),
        maxUv: info.uvs.length ? Math.max(...info.uvs) : null,
        totalRain: Math.round(info.rains.reduce((sum, v) => sum + v, 0) * 10) / 10,
    }))
})
</script>

<template>
    <div class="practice-section page-pad">
        <div v-if="isLoading" class="loading">
            <el-icon class="is-loading"><Loading /></el-icon> 날씨 정보를 불러오는 중...
        </div>

        <template v-if="city">
            <div class="hero-card">
                <div class="hero-region">
                    <el-icon><Location /></el-icon> {{ city.region }}
                </div>
                <div class="hero-icon" :class="`is-${city.status === '맑음' ? 'sunny' : city.status === '비' ? 'rainy' : 'cloudy'}`">
                    {{ getEmoji(city.status) }}
                </div>
                <div class="hero-temp">{{ displayTemp }}{{ configStore.unitSymbol }}</div>
                <div class="hero-status">지금은 {{ city.status }}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-box">
                    <el-icon><Odometer /></el-icon>
                    <div class="stat-label">습도</div>
                    <div class="stat-value">{{ city.humidity }}%</div>
                </div>
                <div class="stat-box">
                    <el-icon><WindPower /></el-icon>
                    <div class="stat-label">풍속</div>
                    <div class="stat-value">{{ city.windSpeed }}m/s</div>
                </div>
                <div class="stat-box" v-if="dailyForecast[0]">
                    <el-icon><Umbrella /></el-icon>
                    <div class="stat-label">오늘 강수량</div>
                    <div class="stat-value">{{ dailyForecast[0].totalRain }}mm</div>
                </div>
                <div class="stat-box" v-if="airQuality">
                    <el-icon><MagicStick /></el-icon>
                    <div class="stat-label">공기질</div>
                    <div class="stat-value">{{ airQuality.aqiLabel }}</div>
                </div>
            </div>

            <BaseDashboardCard v-if="uvIndex !== null" icon="🧴" title="자외선 / 강수확률">
                <div class="gauge-row">
                    <div class="gauge-box">
                        <div class="gauge-wrap">
                            <el-progress type="dashboard" :percentage="uvPercentage" :color="uvGaugeColor" :show-text="false" :stroke-width="9" />
                            <div class="gauge-overlay">
                                <div class="gauge-value">{{ uvIndex }}</div>
                                <div class="gauge-sub">{{ uvLabel }}</div>
                            </div>
                        </div>
                        <div class="gauge-title">자외선 지수</div>
                    </div>

                    <div class="gauge-box">
                        <div class="gauge-wrap">
                            <el-progress type="dashboard" :percentage="precipitationProbability" color="#6f83e8" :show-text="false" :stroke-width="9" />
                            <div class="gauge-overlay">
                                <div class="gauge-value">{{ precipitationProbability }}%</div>
                            </div>
                        </div>
                        <div class="gauge-title">강수확률</div>
                    </div>
                </div>

                <el-alert
                    v-if="showSunscreenAlert"
                    title="자외선이 강해요. 선크림을 발라주세요!"
                    type="warning"
                    :closable="false"
                    center
                    show-icon
                    class="sunscreen-alert"
                />
            </BaseDashboardCard>

            <BaseDashboardCard v-if="hourlyForecast.length" icon="⏱️" title="24시간 예보 (3시간 단위)">
                <div class="forecast-list">
                    <div v-for="item in hourlyForecast" :key="item.time" class="forecast-item">
                        <div class="forecast-time">{{ item.time }}</div>
                        <div class="forecast-emoji">{{ getEmoji(item.status) }}</div>
                        <div class="forecast-temp">{{ item.temp }}°</div>
                        <div class="forecast-sub">☔ {{ item.pop }}%</div>
                        <div class="forecast-sub">💧 {{ item.rainAmount }}mm</div>
                        <div class="forecast-sub">🧴 UV {{ item.uv }}</div>
                    </div>
                </div>
            </BaseDashboardCard>

            <BaseDashboardCard v-if="dailyForecast.length" icon="📅" title="5일 예보">
                <div class="forecast-list">
                    <div v-for="day in dailyForecast" :key="day.date" class="forecast-item">
                        <div class="forecast-time">{{ formatWeekday(day.date) }}요일</div>
                        <div class="forecast-emoji">{{ getEmoji(day.status) }}</div>
                        <div class="forecast-temp">{{ day.maxTemp }}° / {{ day.minTemp }}°</div>
                        <div class="forecast-sub">☔ {{ day.maxPop }}%</div>
                        <div class="forecast-sub">💧 {{ day.totalRain }}mm</div>
                        <div class="forecast-sub">🧴 UV {{ day.maxUv }}</div>
                    </div>
                </div>
            </BaseDashboardCard>
        </template>

        <el-empty v-else-if="!isLoading" description="해당 도시 정보를 찾을 수 없습니다." class="empty-card" />

        <el-button class="back-btn" round size="large" @click="goHome">
            <el-icon><ArrowLeft /></el-icon>&nbsp;메인 대시보드로 돌아가기
        </el-button>
    </div>
</template>

<style scoped>
.page-pad { padding-top: clamp(18px, 4vw, 28px); }

.hero-card {
    background: linear-gradient(160deg, var(--wx-primary), var(--wx-primary-dark));
    border-radius: var(--wx-radius-lg);
    box-shadow: var(--wx-shadow);
    padding: 28px 20px 24px;
    text-align: center;
    color: #fff;
    margin-bottom: 14px;
}
.hero-region {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 600;
    opacity: 0.9;
    margin-bottom: 12px;
}
.hero-icon {
    width: 84px;
    height: 84px;
    margin: 0 auto 10px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 42px;
    background: rgba(255, 255, 255, 0.18);
}
.hero-temp { font-size: 44px; font-weight: 800; line-height: 1; }
.hero-status { font-size: 13px; opacity: 0.85; margin-top: 6px; }

.stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
    gap: 10px;
    margin-bottom: 16px;
}
.stat-box {
    background: var(--wx-surface);
    border-radius: var(--wx-radius-md);
    box-shadow: var(--wx-shadow-sm);
    padding: 14px 8px;
    text-align: center;
}
.stat-box .el-icon { font-size: 18px; color: var(--wx-primary); margin-bottom: 4px; }
.stat-label { font-size: 11px; color: var(--wx-text-soft); margin-bottom: 2px; }
.stat-value { font-size: 14.5px; font-weight: 800; color: var(--wx-text); }

.empty-card {
    background: var(--wx-surface);
    border-radius: var(--wx-radius-lg);
    box-shadow: var(--wx-shadow-sm);
    margin-bottom: 16px;
}

.back-btn {
    display: flex;
    width: 100%;
    margin-top: 4px;
}

.loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 12.5px;
    color: var(--wx-text-soft);
    padding: 16px 0;
}

.forecast-list {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 4px;
}
.forecast-item {
    flex: 0 0 auto;
    text-align: center;
    background: var(--wx-bg);
    border-radius: var(--wx-radius-sm);
    padding: 10px 12px;
    min-width: 72px;
}
.forecast-time { font-size: 11px; color: var(--wx-text-soft); margin-bottom: 4px; }
.forecast-emoji { font-size: 20px; margin-bottom: 4px; }
.forecast-temp { font-size: 13px; font-weight: 700; color: var(--wx-text); }
.forecast-sub { font-size: 10.5px; color: var(--wx-text-soft); margin-top: 2px; }

.gauge-row {
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 8px 0;
}
.gauge-box { text-align: center; }
.gauge-wrap {
    position: relative;
    display: inline-block;
}
.gauge-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    pointer-events: none;
}
.gauge-value { font-size: 20px; font-weight: 700; color: var(--wx-text); }
.gauge-sub { font-size: 11px; color: var(--wx-text-soft); margin-top: 2px; }
.gauge-title { margin-top: 8px; font-size: 12.5px; color: var(--wx-text-soft); font-weight: 600; }
.sunscreen-alert { margin-top: 12px; border-radius: var(--wx-radius-sm); }
</style>