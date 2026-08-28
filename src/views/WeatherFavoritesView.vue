<script setup>
import { ref, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { weatherMockData } from '@/mock/weatherMock.js'
import { fetchWeatherByCoords } from '@/api/weather.js'
import { useFavoritesStore } from '@/stores/favorites'
import { useConfigStore } from '@/stores/configStore'
import { useCustomCitiesStore } from '@/stores/customCities'

const favoritesStore = useFavoritesStore()
const configStore = useConfigStore()
const customCitiesStore = useCustomCitiesStore()
const { favoriteCityIds } = storeToRefs(favoritesStore)

const favoriteCities = ref([])
const isLoading = ref(false)

// 즐겨찾기로 등록된 지역들의 실시간 날씨를 불러온다
//
// 🛠️ 트러블슈팅 [v0.0.0]: 원래는 weatherMockData(기본 지역)만 보고 즐겨찾기 대상을 걸러서,
// 내가 검색으로 추가한 지역을 즐겨찾기해도 이 페이지에는 안 뜨는 버그가 있었다.
// customCitiesStore.cities도 같이 합쳐서 걸러주도록 고쳤다. (지역 삭제 시 숨김 처리되는
// removedDefaultCityIds도 같이 빼줘야 지운 지역이 여기 남아있지 않는다)
const loadFavoriteCities = async () => {
    // 삭제(숨김)된 기본 지역은 제외하고, 커스텀으로 추가한 지역도 함께 대상에 포함
    const allCities = [
        ...weatherMockData.filter((item) => !customCitiesStore.removedDefaultCityIds.includes(item.id)),
        ...customCitiesStore.cities,
    ]
    const targets = allCities.filter((item) => favoriteCityIds.value.includes(item.id))

    if (targets.length === 0) {
        favoriteCities.value = []
        return
    }

    isLoading.value = true
    try {
        const results = await Promise.all(
            targets.map(async (city) => {
                const weather = await fetchWeatherByCoords(city.lat, city.lon)
                return { ...city, ...weather }
            })
        )
        favoriteCities.value = results
    } catch (error) {
        console.error('즐겨찾기 날씨 데이터를 가져오는 중 오류가 발생했습니다:', error)
    } finally {
        isLoading.value = false
    }
}

onMounted(loadFavoriteCities)
watch(favoriteCityIds, loadFavoriteCities, { deep: true }) // 즐겨찾기 추가/삭제될 때마다 다시 불러오기
watch(() => customCitiesStore.removedDefaultCityIds, loadFavoriteCities, { deep: true })
watch(() => customCitiesStore.cities, loadFavoriteCities, { deep: true })

const router = useRouter()

const emojiMap = { 맑음: '☀️', 비: '🌧️', 구름: '☁️' }
const getEmoji = (status) => emojiMap[status] || '🌈'

// 즐겨찾기 카드를 클릭하면 그 지역 상세 페이지로 이동
const goDetail = (cityId) => {
    router.push('/weather/' + cityId)
}

// 설정에 따라 섭씨 원본 값을 화씨로 변환해서 보여준다
const displayTemp = (city) => {
    const rawTemp = city.temp
    if (configStore.unit === 'fahrenheit') {
        return Math.round(((rawTemp * 9) / 5 + 32) * 10) / 10
    }
    return rawTemp
}

const displayFeelsLike = (city) => {
    const rawFeelsLike = city.feelsLike
    if (configStore.unit === 'fahrenheit') {
        return Math.round(((rawFeelsLike * 9) / 5 + 32) * 10) / 10
    }
    return rawFeelsLike
}
</script>

<template>
    <div class="practice-section page-pad">
        <div class="fav-header">
            <div class="fav-header-icon">⭐</div>
            <div>
                <h2 class="fav-title">즐겨찾기 도시</h2>
                <p class="fav-subtitle">{{ favoriteCities.length }}곳을 즐겨찾기에 담아뒀어요</p>
            </div>
        </div>
        <div v-if="isLoading" class="loading">
            <el-icon class="is-loading"><Loading /></el-icon> 즐겨찾기 날씨를 불러오는 중...
        </div>
        <div v-if="favoriteCities.length" class="fav-grid">
            <div
                v-for="city in favoriteCities" :key="city.id" class="fav-card" @click="goDetail(city.id)">
                <div class="fav-card-top">
                    <span class="fav-emoji">{{ getEmoji(city.status) }}</span>
                    <span class="fav-star">★</span>
                </div>
                <div class="fav-name">{{ city.name }}</div>
                <div class="fav-status">{{ city.status }}</div>
                <div class="fav-temp">{{ displayTemp(city).toFixed(1) }}{{ configStore.unitSymbol }}</div>
                <div class="fav-feels">체감 {{ displayFeelsLike(city).toFixed(1) }}{{ configStore.unitSymbol }}</div>
            </div>
        </div>

        <el-empty
            v-else
            description="아직 즐겨찾기한 도시가 없어요. 대시보드에서 카드를 눌러 즐겨찾기에 추가해보세요."
            :image-size="90"
            class="fav-empty"
        />

        <el-button tag="router-link" to="/" text class="back-link">
            <el-icon><ArrowLeft /></el-icon> 메인 대시보드로 돌아가기
        </el-button>
    </div>
</template>

<style scoped>
.page-pad { padding-top: clamp(18px, 4vw, 28px); }

.fav-header {
    display: flex;
    align-items: center;
    gap: 12px;
    background: linear-gradient(135deg, #fff7e6, var(--wx-surface));
    border-radius: var(--wx-radius-lg);
    box-shadow: var(--wx-shadow-sm);
    padding: 18px 20px;
    margin-bottom: 16px;
}
.fav-header-icon {
    font-size: 26px;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff3d6;
    border-radius: 50%;
    flex-shrink: 0;
}
.fav-title { margin: 0; font-size: 15px; font-weight: 800; color: var(--wx-text); }
.fav-subtitle { margin: 2px 0 0; font-size: 12px; color: #9a7b2f; }

.fav-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
}
.fav-card {
    background: var(--wx-surface);
    border-radius: var(--wx-radius-md);
    box-shadow: var(--wx-shadow-sm);
    padding: 16px;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.fav-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--wx-shadow);
}
.fav-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}
.fav-emoji { font-size: 24px; }
.fav-star { color: var(--wx-warm); font-size: 14px; }
.fav-name { font-size: 14px; font-weight: 800; color: var(--wx-text); }
.fav-status { font-size: 11.5px; color: var(--wx-text-soft); margin: 2px 0 8px; }
.fav-temp { font-size: 20px; font-weight: 800; color: var(--wx-text); }
.fav-feels { font-size: 11px; color: var(--wx-text-faint); margin-top: 2px; }

.fav-empty {
    background: var(--wx-surface);
    border-radius: var(--wx-radius-lg);
    box-shadow: var(--wx-shadow-sm);
    margin-bottom: 16px;
}

.back-link {
    display: flex;
    width: 100%;
    justify-content: center;
    font-size: 13px;
}

.loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 12.5px;
    color: var(--wx-text-soft);
    padding: 12px 0;
}
</style>