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

// 🛠️ 트러블슈팅 [v0.0.4]: 원래는 위도/경도를 소수점 첫째 자리로 반올림해서 "같은 버킷이면 같은 지역"으로
// 판단했는데, 반올림 경계값 문제로 오작동했다. 예를 들어 37.549와 37.551은 실거리로 200m도
// 안 되지만 각각 37.5 / 37.6으로 반올림되어 "다른 지역"으로 오판했다.
// (내 위치 버튼은 GPS 실측 좌표를, 검색 추가는 지오코딩 DB의 대표 좌표를 쓰다 보니 같은 도시여도
// 값이 미세하게 달라서 경계를 넘나드는 일이 실제로 발생 → 같은 도시가 중복으로 추가되는 버그였음)
// 그래서 반올림 버킷 비교 대신, 두 좌표 사이의 실제 거리를 계산해서 비교하도록 고쳤다.
const EARTH_RADIUS_KM = 6371
const DUPLICATE_DISTANCE_KM = 5 // 이 거리 이내면 같은 지역으로 간주

const toRad = (deg) => (deg * Math.PI) / 180

// 두 좌표 사이의 실제 거리(km)를 하버사인 공식으로 계산
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

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
    // 🛠️ 트러블슈팅 [v0.0.0]: 처음엔 removedDefaultCityIds를 고려하지 않고 weatherMockData 전체와 비교해서,
    // "삭제한 기본 지역을 다시 검색해서 추가"하면 항상 "이미 등록된 도시"로 막혀버리는 버그가 있었다.
    // (삭제는 목록에서 숨기는 것뿐인데, 중복 체크는 원본 mock 데이터를 그대로 봤던 게 원인)
    // 그래서 아래처럼 삭제된 기본 지역은 먼저 걸러내고 비교하도록 고쳤다.
    const isDuplicateLocation = (lat, lon) => {
        const isSameSpot = (item) => getDistanceKm(item.lat, item.lon, lat, lon) <= DUPLICATE_DISTANCE_KM
        const inMock = weatherMockData
            .filter((item) => !removedDefaultCityIds.value.includes(item.id))
            .some(isSameSpot)
        const inCustom = cities.value.some(isSameSpot)
        return inMock || inCustom
    }

    // 검색/GPS로 찾은 지역을 내 지역 목록에 추가. 중복이면 추가하지 않고 { added: false }만 돌려준다
    const addCity = (city) => {
        if (isDuplicateLocation(city.lat, city.lon)) {
            return { added: false }
        }
        const id = `custom_${city.lat.toFixed(2)}_${city.lon.toFixed(2)}`
        // region이 따로 없으면(예: 예전 호출부) name으로 대체
        cities.value.push({ id, name: city.name, region: city.region || city.name, lat: city.lat, lon: city.lon })
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