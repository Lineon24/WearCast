import axios from 'axios'

// 🛠️ 트러블슈팅 [v0.0.0]: 이 키가 소스 코드에 그대로 하드코딩돼 있었다 - git에도 그대로 올라가고,
// 프런트엔드에서 직접 호출하는 구조라 브라우저 네트워크 탭에서도 어차피 보이긴 하지만,
// 최소한 소스코드/git 이력에는 안 남도록 .env.local로 옮겼다.
// (완전히 숨기려면 챗봇 키처럼 백엔드 프록시를 거치게 해야 하는데, 이 프로젝트에선
// 여러 화면에서 직접 호출하는 구조라 일단 여기까지만 정리함)
const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather'
const AIR_POLLUTION_URL = 'https://api.openweathermap.org/data/2.5/air_pollution'
const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast'
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'

// 🛠️ 트러블슈팅 [v0.0.3]: 이 두 지오코딩 URL만 http://로 남아있었다(나머지는 전부 https://).
// 로컬 dev 서버(http://localhost)에서는 페이지 자체가 http라 문제없이 나갔지만, Vercel에
// https://로 배포하고 나니 "도시 검색으로 지역 추가"와 "내 위치 버튼"(reverseGeocode 호출)이
// 전부 조용히 실패했다. https 페이지에서 http로 나가는 요청은 브라우저가 mixed content로
// 판단해 차단하기 때문. http:// → https://로 바꿔서 해결했다.
const GEO_DIRECT_URL = 'https://api.openweathermap.org/geo/1.0/direct'
const GEO_REVERSE_URL = 'https://api.openweathermap.org/geo/1.0/reverse'

// OpenWeatherMap의 영문 날씨 코드를 기존 emojiMap과 맞는 한글로 변환
const statusMap = {
    Clear: '맑음',
    Clouds: '구름',
    Rain: '비',
    Drizzle: '비',
    Thunderstorm: '비',
    Snow: '눈',
}

// 대기질 지수(1~5)를 한글 라벨로 변환
const aqiLabelMap = {
    1: '좋음',
    2: '보통',
    3: '민감군 주의',
    4: '나쁨',
    5: '매우 나쁨',
}

// 좌표로 현재 날씨(기온/상태/습도/풍속) 조회
export const fetchWeatherByCoords = async (lat, lon) => {
    const response = await axios.get(BASE_URL, {
        params: { lat, lon, appid: API_KEY, units: 'metric', lang: 'kr' },
    })

    const data = response.data
    return {
        temp: Math.round(data.main.temp),
        status: statusMap[data.weather[0].main] || data.weather[0].main,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
    }
}

// 좌표로 대기질(AQI 등급, PM2.5, PM10) 조회
export const fetchAirPollution = async (lat, lon) => {
    const response = await axios.get(AIR_POLLUTION_URL, {
        params: { lat, lon, appid: API_KEY },
    })

    const data = response.data.list[0]
    return {
        aqiLabel: aqiLabelMap[data.main.aqi] || '알 수 없음',
        pm2_5: Math.round(data.components.pm2_5),
        pm10: Math.round(data.components.pm10),
    }
}

// 좌표로 5일치 3시간 간격 예보 목록 조회 (상세 페이지의 24시간/5일 예보가 여기서 나옴)
export const fetchForecast = async (lat, lon) => {
    const response = await axios.get(FORECAST_URL, {
        params: { lat, lon, appid: API_KEY, units: 'metric', lang: 'kr' },
    })

    return response.data.list.map((item) => ({
        date: item.dt_txt.slice(0, 10),
        time: item.dt_txt.slice(11, 16),
        timestamp: item.dt * 1000,
        temp: Math.round(item.main.temp),
        status: statusMap[item.weather[0].main] || item.weather[0].main,
        pop: Math.round(item.pop * 100),
        // 3시간 동안의 강수량(비+눈, mm) - 없으면 0
        rainAmount: Math.round(((item.rain?.['3h'] ?? 0) + (item.snow?.['3h'] ?? 0)) * 10) / 10,
    }))
}

// Open-Meteo에서 시간대별 자외선 지수 예보를 통째로 가져온다 (OpenWeatherMap엔 UV가 없어서 다른 API를 씀)
export const fetchUvForecast = async (lat, lon) => {
    const response = await axios.get(OPEN_METEO_URL, {
        params: { latitude: lat, longitude: lon, hourly: 'uv_index', timezone: 'auto' },
    })
    return response.data.hourly // { time: [...], uv_index: [...] }
}

// Open-Meteo 시간대별 자외선 배열에서 목표 시각과 가장 가까운 값을 찾아 반환
export const findUvAtTime = (hourlyUv, targetTimestampMs) => {
    const { time, uv_index } = hourlyUv
    let closestIndex = 0
    let minDiff = Infinity
    time.forEach((t, idx) => {
        const diff = Math.abs(new Date(t).getTime() - targetTimestampMs)
        if (diff < minDiff) {
            minDiff = diff
            closestIndex = idx
        }
    })
    return Math.round(uv_index[closestIndex])
}

// 현재 시각 기준 자외선 지수 하나만 필요할 때 쓰는 축약 버전 (내부적으로 fetchUvForecast + findUvAtTime 조합)
export const fetchUvIndex = async (lat, lon) => {
    const hourlyUv = await fetchUvForecast(lat, lon)
    return findUvAtTime(hourlyUv, Date.now())
}

// 브라우저 GPS로 현재 좌표 가져오기
export const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('이 브라우저는 위치 정보를 지원하지 않습니다.'))
            return
        }
        navigator.geolocation.getCurrentPosition(
            (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
            (error) => reject(error),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        )
    })
}

// 도시 이름 → 좌표 (수동 검색용)
export const searchCityByName = async (cityName) => {
    const response = await axios.get(GEO_DIRECT_URL, {
        params: { q: cityName, limit: 1, appid: API_KEY },
    })
    if (!response.data.length) return null
    const place = response.data[0]
    return { name: place.local_names?.ko || place.name, lat: place.lat, lon: place.lon }
}

// 좌표 → 도시 이름 (GPS 감지 후 라벨 표시용)
export const reverseGeocode = async (lat, lon) => {
    const response = await axios.get(GEO_REVERSE_URL, {
        params: { lat, lon, limit: 1, appid: API_KEY },
    })
    if (!response.data.length) return null
    const place = response.data[0]
    return { name: place.local_names?.ko || place.name, lat, lon }
}