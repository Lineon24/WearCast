<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getCurrentPosition, searchCityByName, reverseGeocode } from '@/api/weather.js'
import { useCustomCitiesStore } from '@/stores/customCities'

const customCitiesStore = useCustomCitiesStore()
const searchInput = ref('')
const isLoading = ref(false)

// 한글 등 조합형 입력(IME) 중에 Enter를 누르면, 글자가 다 조합되기 전에
// keyup.enter가 먼저 발동해서 완성되지 않은 텍스트로 검색이 실행되는 문제가 있어 이를 막아준다
const handleEnterKey = (event) => {
  if (event.isComposing || event.keyCode === 229) return
  // v-model(searchInput)이 조합 완료 값으로 아직 갱신되기 전에 keyup이 먼저 발생하는 경우가 있어
  // 실제 DOM에 입력된 값을 직접 읽어와 동기화한 뒤 검색한다
  searchInput.value = event.target.value
  handleSearch()
}

const handleSearch = async () => {
  if (isLoading.value) return // 검색이 중복으로 겹쳐 실행되는 것을 방지
  if (!searchInput.value.trim()) return
  isLoading.value = true
  try {
    const place = await searchCityByName(searchInput.value.trim())
    if (!place) {
      ElMessage.warning(
        `'${searchInput.value}'에 대한 검색 결과가 없습니다. 영문 도시명으로 시도해보세요.`,
      )
      return
    }
    const result = customCitiesStore.addCity(place)
    if (!result.added) {
      ElMessage.warning(`'${place.name}'은(는) 이미 목록에 있는 도시입니다.`)
    } else {
      searchInput.value = ''
      ElMessage.success(`'${place.name}' 지역을 추가하였습니다!`)
    }
  } catch (error) {
    console.error('도시 검색 실패:', error)
    ElMessage.error('검색 중 오류가 발생했습니다.')
  } finally {
    isLoading.value = false
  }
}

const handleDetectLocation = async () => {
  if (isLoading.value) return
  isLoading.value = true
  try {
    const { lat, lon } = await getCurrentPosition()
    const place = await reverseGeocode(lat, lon)
    const cityName = place?.name || '내 위치'
    const result = customCitiesStore.addCity({ name: cityName, lat, lon })
    if (!result.added) {
      ElMessage.warning(`'${cityName}'은(는) 이미 목록에 있는 도시입니다.`)
    } else {
      ElMessage.success(`'${cityName}' 지역을 추가하였습니다!`)
    }
  } catch (error) {
    console.error('위치 감지 실패:', error)
    if (error.code === 1) {
      ElMessage.error('위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.')
    } else if (error.code === 2) {
      ElMessage.error('위치를 확인할 수 없습니다. 위치 서비스에서 브라우저 권한을 확인해주세요.')
    } else if (error.code === 3) {
      ElMessage.error('위치 확인이 너무 오래 걸렸습니다. 다시 시도해주세요.')
    } else {
      ElMessage.error('위치 감지에 실패했습니다. 아래에서 직접 검색해보세요.')
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="add-city-bar">
    <span class="add-city-title">내 지역 카드 추가</span>
    <div class="add-city-search">
      <el-input
        v-model="searchInput"
        placeholder="도시 이름으로 검색해서 카드 추가 (예: Seoul, Jeju)"
        :disabled="isLoading"
        @keyup.enter="handleEnterKey"
      />
      <div class="add-city-actions">
        <el-button type="primary" round :loading="isLoading" @click="handleSearch">추가</el-button>
        <el-button class="location-btn" round :disabled="isLoading" @click="handleDetectLocation">
          📍 내 위치
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.add-city-title {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: var(--wx-text);
  margin-bottom: 10px;
}

.add-city-bar {
  background: var(--wx-surface);
  border-radius: var(--wx-radius-lg);
  box-shadow: var(--wx-shadow-sm);
  padding: 18px 20px;
  margin-bottom: 16px;
}
.add-city-search {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.add-city-actions {
  display: flex;
  gap: 8px;
}
.add-city-actions .el-button {
  flex: 1;
  margin-left: 0;
}

:deep(.el-input__wrapper) {
  border-radius: var(--wx-radius-pill);
  background: var(--wx-bg);
  box-shadow: none;
  padding: 4px 16px;
}
:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--wx-primary) inset;
}

.add-city-search .location-btn {
  --el-button-bg-color: var(--wx-success);
  --el-button-border-color: var(--wx-success);
  --el-button-hover-bg-color: #4cb47c;
  --el-button-hover-border-color: #4cb47c;
  color: #fff;
}
</style>
