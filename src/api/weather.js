import axios from 'axios'

// 🛠️ 트러블슈팅 [v0.0.6]: OpenWeatherMap 관련 API(현재 날씨/대기질/예보/지오코딩)는 원래
// 여기서 axios로 OpenWeatherMap을 직접 호출하면서 VITE_ 접두사가 붙은 키를 그대로 썼는데,
// VITE_ 접두사는 Vite가 빌드 시 브라우저 번들에 그대로 넣는 "공개용" 값이라 키가 그대로 노출됐다.
// 챗봇(api/chat.js)과 동일하게 백엔드 프록시(api/weather.js · server/index.js)를 거치도록 바꿔서,
// 이제 실제 키(OPENWEATHER_API_KEY, VITE_ 접두사 없음)는 서버에만 존재하고 브라우저에는
// 전혀 노출되지 않는다.
const WEATHER_PROXY_URL = '/api/weather'

// Open-Meteo(자외선 지수)는 API 키가 필요 없는 공개 API라 프록시를 거치지 않고 그대로 직접 호출한다
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'

// 우리 백엔드 프록시를 호출하는 공통 함수. type으로 어떤 OpenWeatherMap 엔드포인트인지 알려주고
// 나머지 params는 그대로 전달한다 (appid는 서버에서 붙여서 보냄)
const fetchFromWeatherProxy = async (type, params) => {
    const response = await axios.get(WEATHER_PROXY_URL, { params: { type, ...params } })
    return response.data
}

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

// 좌표로 현재 날씨(기온/체감온도/상태/습도/풍속) 조회
//
// 🛠️ 트러블슈팅 [v0.0.11]: feels_like(체감온도) 필드를 새로 추가하고,
// temp/feelsLike 반올림을 정수에서 소수점 첫째 자리까지로 변경.
export const fetchWeatherByCoords = async (lat, lon) => {
    const data = await fetchFromWeatherProxy('current', { lat, lon, units: 'metric', lang: 'kr' })
    return {
        temp: Math.round(data.main.temp * 10) / 10,
        feelsLike: Math.round(data.main.feels_like * 10) / 10,
        status: statusMap[data.weather[0].main] || data.weather[0].main,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
    }
}

// 좌표로 대기질(AQI 등급, PM2.5, PM10) 조회
export const fetchAirPollution = async (lat, lon) => {
    const data = await fetchFromWeatherProxy('air', { lat, lon })
    const item = data.list[0]
    return {
        aqiLabel: aqiLabelMap[item.main.aqi] || '알 수 없음',
        pm2_5: Math.round(item.components.pm2_5),
        pm10: Math.round(item.components.pm10),
    }
}

// 좌표로 5일치 3시간 간격 예보 목록 조회 (상세 페이지의 24시간/5일 예보가 여기서 나옴)
//
// 🛠️ 트러블슈팅 [v0.0.10]: date/time을 dt_txt(UTC 문자열) slice 대신,
// dt(UTC epoch)로 Date를 만들어 로컬(한국) 시간 기준으로 계산하도록 변경.
export const fetchForecast = async (lat, lon) => {
    const data = await fetchFromWeatherProxy('forecast', { lat, lon, units: 'metric', lang: 'kr' })
    const pad = (n) => String(n).padStart(2, '0')
    return data.list.map((item) => {
        const local = new Date(item.dt * 1000)
        return {
            date: `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`,
            time: `${pad(local.getHours())}:${pad(local.getMinutes())}`,
            timestamp: item.dt * 1000,
            temp: Math.round(item.main.temp * 10) / 10,
            status: statusMap[item.weather[0].main] || item.weather[0].main,
            pop: Math.round(item.pop * 100),
            // 3시간 동안의 강수량(비+눈, mm) - 없으면 0
            rainAmount: Math.round(((item.rain?.['3h'] ?? 0) + (item.snow?.['3h'] ?? 0)) * 10) / 10,
        }
    })
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

// 국가 코드를 한글 국가명으로 변환 (이 앱은 한국 사용자 위주라 KR만 우선 처리하고, 나머지는 코드 그대로 둔다)
const COUNTRY_LABELS = { KR: '대한민국' }

// 지오코딩 응답에서 "국가 + 시/도 + 지명"을 이어붙여 지역 구분용 라벨을 만든다.
//
// 🛠️ 트러블슈팅 [v0.0.5]: 같은 "서울"이어도 기본 제공 카드와 GPS로 추가한 카드의 실제 좌표가
// 달라 날씨 수치가 다르게 나오는데, 카드에는 name만 보여주고 있어서 사용자 입장에선 왜 다른지
// 구분할 방법이 없었다. OpenWeatherMap의 역지오코딩(GeoNames 기반)은 한국 주소를 구/동 단위까지
// 안정적으로 보장하진 않지만(좌표에 따라 "서울"처럼 시 단위로만 잡히기도 하고, "Gangnam-gu"처럼
// 구 단위로 더 정확하게 잡히기도 함), 응답에 들어있는 국가/시도(state)/지명 정보를 최대한 이어붙여서
// region으로 노출하면 최소한 있는 정보만큼은 구분에 도움이 된다.
// (동 단위까지 안정적으로 뽑으려면 카카오/네이버 로컬 API처럼 한국 주소에 특화된 별도 서비스가
// 필요한데, 이번엔 API 키를 새로 추가하지 않고 기존 정보만으로 개선하는 쪽을 선택함)
const buildRegionLabel = (place) => {
    const countryLabel = COUNTRY_LABELS[place.country] || place.country
    const placeName = place.local_names?.ko || place.name
    // state와 placeName이 같은 값(예: 둘 다 "Seoul")이면 중복 표기하지 않는다
    const parts = [countryLabel, place.state, place.state !== placeName ? placeName : null]
    return parts.filter(Boolean).join(' ')
}

// 🛠️ 트러블슈팅 [v0.0.8]: "안산"으로 검색하면 한국 경기도 안산시가 아니라 중국 랴오닝성
// 안산시(鞍山, 한자 발음이 같아서 local_names.ko도 우연히 똑같이 "안산시")가 뜨는 경우가 있었다.
// OpenWeatherMap 지오코딩이 이름 일치보다 자체 순위(인구 등으로 추정)를 우선하다 보니
// limit:1만 요청하면 엉뚱한 도시가 걸릴 수 있었다. country=KR로 필터링해도 "안산" 검색에
// 관련 없는 "양산시"가 먼저 나오는 경우까지 있어서, 국가 필터만으로는 부족했다.
// 그래서 후보를 여러 개(limit 10) 받아온 뒤, 검색어와 이름이 실제로 일치하는 후보만 추리고,
// 그중에서도 한국(KR)을 우선하도록 골라내는 방식으로 바꿨다.
const pickBestMatch = (candidates, query) => {
    const trimmedQuery = query.trim()
    const normalizedQuery = trimmedQuery.toLowerCase()
    const matchesQuery = (place) => {
        // 한국 지명은 API가 "안산시"처럼 "시/군/구"를 붙여 내려주므로, 접두어 일치로 비교한다
        if (place.local_names?.ko?.startsWith(trimmedQuery)) return true
        return place.name.toLowerCase() === normalizedQuery
    }

    const nameMatches = candidates.filter(matchesQuery)
    return nameMatches.find((place) => place.country === 'KR') || nameMatches[0] || candidates[0]
}

// 도시 이름 → 좌표 (수동 검색용)
export const searchCityByName = async (cityName) => {
    const data = await fetchFromWeatherProxy('geo-direct', { q: cityName, limit: 10 })
    if (!data.length) return null
    const place = pickBestMatch(data, cityName)
    return {
        name: place.local_names?.ko || place.name,
        lat: place.lat,
        lon: place.lon,
        region: buildRegionLabel(place),
    }
}

// 좌표 → 도시 이름 (GPS 감지 후 라벨 표시용)
export const reverseGeocode = async (lat, lon) => {
    const data = await fetchFromWeatherProxy('geo-reverse', { lat, lon, limit: 1 })
    if (!data.length) return null
    const place = data[0]
    return { name: place.local_names?.ko || place.name, lat, lon, region: buildRegionLabel(place) }
}
