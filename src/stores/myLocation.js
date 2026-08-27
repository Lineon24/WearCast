import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
    getCurrentPosition,
    searchCityByName,
    reverseGeocode,
    fetchWeatherByCoords,
    fetchAirPollution,
    fetchUvIndex,
    fetchForecast,
} from '@/api/weather.js'

export const useMyLocationStore = defineStore('myLocation', () => {
    const name = ref('')
    const weather = ref(null)
    const airQuality = ref(null)
    const uvIndex = ref(null)
    const precipitationProbability = ref(0)
    const isLoading = ref(false)
    const errorMessage = ref('')

    const loadForCoords = async (lat, lon, placeName) => {
        isLoading.value = true
        errorMessage.value = ''
        try {
            const [w, air, uv, forecast] = await Promise.all([
                fetchWeatherByCoords(lat, lon),
                fetchAirPollution(lat, lon),
                fetchUvIndex(lat, lon),
                fetchForecast(lat, lon),
            ])
            name.value = placeName
            weather.value = w
            airQuality.value = air
            uvIndex.value = uv
            precipitationProbability.value = forecast[0]?.pop ?? 0
        } catch (error) {
            console.error('내 위치 날씨를 가져오는 중 오류:', error)
            errorMessage.value = '날씨 정보를 가져오지 못했습니다.'
        } finally {
            isLoading.value = false
        }
    }

    const detectMyLocation = async () => {
        isLoading.value = true
        errorMessage.value = ''
        try {
            const { lat, lon } = await getCurrentPosition()
            const place = await reverseGeocode(lat, lon)
            await loadForCoords(lat, lon, place?.name || '현재 위치')
        } catch (error) {
            console.error('위치 감지 실패:', error)
            errorMessage.value = '위치 권한이 거부되었거나 감지에 실패했습니다. 아래에서 직접 검색해보세요.'
            isLoading.value = false
        }
    }

    const searchMyLocation = async (cityName) => {
        isLoading.value = true
        errorMessage.value = ''
        try {
            const place = await searchCityByName(cityName)
            if (!place) {
                errorMessage.value = `'${cityName}'에 대한 검색 결과가 없습니다. 영문 도시명으로 시도해보세요.`
                isLoading.value = false
                return
            }
            await loadForCoords(place.lat, place.lon, place.name)
        } catch (error) {
            console.error('도시 검색 실패:', error)
            errorMessage.value = '검색 중 오류가 발생했습니다.'
            isLoading.value = false
        }
    }

    return {
        name,
        weather,
        airQuality,
        uvIndex,
        precipitationProbability,
        isLoading,
        errorMessage,
        detectMyLocation,
        searchMyLocation,
    }
})