<script setup>
import { computed, ref, watch, watchEffect, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'

import SearchBar from '@/components/exercise/SearchBar.vue'
import BaseDashboardCard from '@/components/exercise/BaseDashboardCard.vue'
import WeatherCard from '@/components/exercise/WeatherCard.vue'
import StatusBar from '@/components/exercise/StatusBar.vue'
import AddCityBar from '@/components/exercise/AddCityBar.vue'

import { useCustomCitiesStore } from '@/stores/customCities'
import { weatherMockData } from '@/mock/weatherMock.js'
import { fetchWeatherByCoords } from '@/api/weather.js'

import { useFavoritesStore } from '@/stores/favorites'
const favoritesStore = useFavoritesStore()
const customCitiesStore = useCustomCitiesStore()

const router = useRouter()

const weatherList = ref([])
const isLoading = ref(false)

// 기본 제공 지역(삭제된 것 제외) + 내가 추가한 지역(최근 추가 순)을 합쳐서
// 각 지역의 실시간 날씨를 불러와 weatherList에 담는다
const loadWeatherList = async () => {
  isLoading.value = true
  try {
    const allCities = [
      ...weatherMockData
        .filter((c) => !customCitiesStore.removedDefaultCityIds.includes(c.id))
        .map((c) => ({ ...c, isCustom: false })),
      // 최근에 추가한 지역이 먼저 보이도록 추가한 순서의 역순으로 배치
      ...[...customCitiesStore.cities].reverse().map((c) => ({ ...c, isCustom: true })),
    ]
    const results = await Promise.all(
      allCities.map(async (city) => {
        const weather = await fetchWeatherByCoords(city.lat, city.lon)
        return { ...city, ...weather }
      }),
    )
    weatherList.value = results
  } catch (error) {
    console.error('날씨 데이터를 가져오는 중 오류가 발생했습니다:', error)
  } finally {
    isLoading.value = false
  }
}

// 카드의 × 버튼을 눌렀을 때: 확인창을 띄우고, 확인하면 그 지역을 지운다.
// 기본 지역인지 내가 추가한 지역인지에 따라 실제로 지우는 방식이 다르다
// (기본 지역은 removeDefaultCity로 "숨김" 처리, 내가 추가한 지역은 removeCity로 완전히 삭제)
const handleRemoveCard = async (cityId) => {
  try {
    await ElMessageBox.confirm('정말 삭제하시겠습니까?', '지역 삭제', {
      confirmButtonText: '삭제',
      cancelButtonText: '취소',
      confirmButtonClass: 'el-button--danger',
      type: 'warning',
    })
  } catch {
    return // 취소 선택
  }

  const isCustomCity = customCitiesStore.cities.some((item) => item.id === cityId)
  if (isCustomCity) {
    customCitiesStore.removeCity(cityId)
  } else {
    customCitiesStore.removeDefaultCity(cityId)
  }
  favoritesStore.removeFavorite(cityId) // 삭제된 지역은 즐겨찾기에도 남지 않도록 함께 정리
}

onMounted(loadWeatherList)
watch(() => customCitiesStore.cities, loadWeatherList, { deep: true }) // 도시 추가/삭제될 때마다 목록 다시 불러오기
watch(() => customCitiesStore.removedDefaultCityIds, loadWeatherList, { deep: true }) // 기본 지역 삭제될 때마다 목록 다시 불러오기

const searchQuery = ref('')
const selectedCityInfo = ref('')

// 카드를 클릭하면(상세보기/삭제 버튼 제외) 상태바 문구를 갱신하고 즐겨찾기를 토글한다
const selectCard = (city) => {
  selectedCityInfo.value = `${city.name}이 선택되었습니다.`
  favoritesStore.toggleFavorite(city.id)
}

const filteredWeatherList = computed(() =>
  weatherList.value.filter((item) => item.name.includes(searchQuery.value)),
)

const resultCount = computed(() => filteredWeatherList.value.length)

// "상세보기" 버튼을 누르면 해당 지역의 상세 페이지로 이동
const showDetail = (city) => {
  router.push('/weather/' + city.id)
}

// SearchBar에서 올려보낸 검색어를 반영해서 카드 목록을 필터링한다 (검색 로직 자체는 filteredWeatherList computed에서 처리)
const handleSearchQuery = (value) => {
  searchQuery.value = value
}

// 🛠️ 트러블슈팅 [v0.0.0]: watch의 콜백은 (newValue, oldValue) 순서로 인자를 받는데,
// 예전에 이 순서를 반대로 알고 써서 최신 값이 필요한 곳에서 계속 "이전 값"만 가져오는 버그를 겪었다.
// (파라미터 이름만 봐서는 잘 안 헷갈릴 것 같아도, 급하게 짤 때 순서를 뒤집어 쓰기 쉬움)
// 그 뒤로는 watch를 쓸 때마다 콜백 시그니처가 (newValue, oldValue) 순서인지 한 번씩 확인하는 습관을 들임.
watch(selectedCityInfo, (newselectedCityInfo) => {
  console.log(`🤖 [watch 감지] 상태 바 문구가 업데이트되었습니다. "${newselectedCityInfo}"`)
})

watch(resultCount, (newCount) => {
  console.log(`🔎 [watch 감지] 현재 검색 결과: ${newCount}건`)
})

watch(
  () => favoritesStore.favoriteCityIds,
  (newFavoriteCityIds) => {
    console.log(`🤖 [watch 감지] 즐겨찾기가 업데이트되었습니다. "${newFavoriteCityIds}"`)
  },
  { deep: true },
)

watchEffect(() => {
  console.log(
    `🤖 [watchEffect 자동 호출] 현재 검색어 '${searchQuery.value}'에 매칭되는 API 데이터를 필터링 했습니다.`,
  )
})
</script>

<template>
  <div class="practice-section page-pad">
    <!-- 도시 검색 박스 -->
    <AddCityBar />
    <BaseDashboardCard icon="🔍" title="내 지역 카드 검색">
      <SearchBar :search-Query="searchQuery" @update-query="handleSearchQuery" />
    </BaseDashboardCard>

    <BaseDashboardCard icon="📍" title="지역별 날씨 현황">
      <div v-if="isLoading" class="loading-text">
        <el-icon class="is-loading"><Loading /></el-icon> 날씨 정보를 불러오는 중...
      </div>

      <WeatherCard
        v-for="item in filteredWeatherList"
        :key="item.id"
        :city="item"
        :is-favorite="favoritesStore.isFavoriteCity(item.id)"
        :is-custom="item.isCustom"
        @select-card="selectCard"
        @click-detail="showDetail"
        @remove-card="handleRemoveCard"
      />
      <el-empty
        v-if="filteredWeatherList.length === 0"
        :description="`'${searchQuery}'와(과) 일치하는 도시가 없습니다.`"
        :image-size="72"
      />
    </BaseDashboardCard>

    <!-- 상태바 -->
    <StatusBar :message="selectedCityInfo" />
  </div>
</template>

<style scoped>
.page-pad {
  padding-top: clamp(18px, 4vw, 28px);
}

.loading-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-align: center;
  font-size: 12.5px;
  color: var(--wx-text-soft);
  padding: 16px 0;
}
</style>
