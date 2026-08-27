import { ref, watch } from 'vue'
import { defineStore, acceptHMRUpdate } from 'pinia'
import { weatherMockData } from '@/mock/weatherMock.js'

const STORAGE_KEY = 'weather-app-custom-cities'
const REMOVED_DEFAULT_STORAGE_KEY = 'weather-app-removed-default-cities'

const loadFromStorage = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch (error) {
        console.error('로컬스토리지에서 커스텀 도시를 불러오는 중 오류:', error)
        return []
    }
}

const loadRemovedDefaultsFromStorage = () => {
    try {
        const raw = localStorage.getItem(REMOVED_DEFAULT_STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch (error) {
        console.error('로컬스토리지에서 삭제된 기본 도시 목록을 불러오는 중 오류:', error)
        return []
    }
}

// 위도/경도를 소수점 첫째 자리로 반올림해서 "위치 버킷" 키를 만든다 (약 11km 이내면 같은 지역으로 간주)
// isDuplicateLocation에서 정확히 같은 좌표가 아니어도 같은 동네면 중복으로 잡기 위해 사용
const toLocationKey = (lat, lon) => `${lat.toFixed(1)}_${lon.toFixed(1)}`

export const useCustomCitiesStore = defineStore('customCities', () => {
    const cities = ref(loadFromStorage())
    const removedDefaultCityIds = ref(loadRemovedDefaultsFromStorage())

    watch(cities, (newCities) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newCities))
    }, { deep: true })

    watch(removedDefaultCityIds, (newIds) => {
        localStorage.setItem(REMOVED_DEFAULT_STORAGE_KEY, JSON.stringify(newIds))
    }, { deep: true })

    // 이미 등록된 지역(기본 제공 + 내가 추가한 지역)과 같은 위치인지 확인
    //
    // 🛠️ 트러블슈팅: 처음엔 removedDefaultCityIds를 고려하지 않고 weatherMockData 전체와 비교해서,
    // "삭제한 기본 지역을 다시 검색해서 추가"하면 항상 "이미 등록된 도시"로 막혀버리는 버그가 있었다.
    // (삭제는 목록에서 숨기는 것뿐인데, 중복 체크는 원본 mock 데이터를 그대로 봤던 게 원인)
    // 그래서 아래처럼 삭제된 기본 지역은 먼저 걸러내고 비교하도록 고쳤다.
    const isDuplicateLocation = (lat, lon) => {
        const key = toLocationKey(lat, lon)
        const inMock = weatherMockData
            .filter((item) => !removedDefaultCityIds.value.includes(item.id))
            .some((item) => toLocationKey(item.lat, item.lon) === key)
        const inCustom = cities.value.some((item) => toLocationKey(item.lat, item.lon) === key)
        return inMock || inCustom
    }

    // 검색/GPS로 찾은 지역을 내 지역 목록에 추가. 중복이면 추가하지 않고 { added: false }만 돌려준다
    const addCity = (city) => {
        if (isDuplicateLocation(city.lat, city.lon)) {
            return { added: false }
        }
        const id = `custom_${city.lat.toFixed(2)}_${city.lon.toFixed(2)}`
        cities.value.push({ id, name: city.name, region: city.name, lat: city.lat, lon: city.lon })
        return { added: true }
    }

    // 내가 직접 추가한 지역을 목록에서 완전히 제거
    const removeCity = (cityId) => {
        cities.value = cities.value.filter((item) => item.id !== cityId)
    }

    // 기본 제공 지역은 실제로 삭제하지 않고, 삭제된 것으로 표시해서 목록에서만 숨긴다
    const removeDefaultCity = (cityId) => {
        if (!removedDefaultCityIds.value.includes(cityId)) {
            removedDefaultCityIds.value.push(cityId)
        }
    }

    return { cities, removedDefaultCityIds, addCity, removeCity, removeDefaultCity }
})

// 개발 중 이 파일만 수정했을 때도 새로고침 없이 스토어 로직이 바로 반영되도록 처리
if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useCustomCitiesStore, import.meta.hot))
}