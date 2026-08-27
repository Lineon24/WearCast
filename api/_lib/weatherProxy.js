// OpenWeatherMap 관련 API를 한 곳에서 프록시하는 공용 핸들러.
//
// 🛠️ 트러블슈팅 [v0.0.6]: OpenWeatherMap 키(VITE_OPENWEATHER_API_KEY)를 프런트엔드에서
// 직접 썼더니 브라우저 네트워크 탭/번들에 그대로 노출됐다. 챗봇 키(OPENAI_API_KEY)처럼
// 백엔드 프록시를 거치도록 바꿔서, 이제 이 키는 서버(Vercel 서버리스 함수 / 로컬 Express)에만
// 존재하고 브라우저에는 전혀 노출되지 않는다.
// Vercel 서버리스 함수(../weather.js)와 로컬 dev용 Express 서버(../../server/index.js)가
// req.query / res.status().json() 인터페이스가 서로 호환되기 때문에, 이 핸들러 하나를 그대로
// 같이 쓴다(로직을 두 곳에 따로 둘 필요가 없었음).
const OPENWEATHER_BASE = 'https://api.openweathermap.org'

const ENDPOINTS = {
    current: '/data/2.5/weather',
    air: '/data/2.5/air_pollution',
    forecast: '/data/2.5/forecast',
    'geo-direct': '/geo/1.0/direct',
    'geo-reverse': '/geo/1.0/reverse',
}

export const handleWeatherProxy = async (req, res) => {
    const apiKey = process.env.OPENWEATHER_API_KEY
    if (!apiKey) {
        res.status(500).json({ error: 'OPENWEATHER_API_KEY가 설정되어 있지 않습니다. 환경변수를 확인해주세요.' })
        return
    }

    const { type, ...params } = req.query
    const path = ENDPOINTS[type]
    if (!path) {
        res.status(400).json({ error: `지원하지 않는 요청 타입입니다: ${type}` })
        return
    }

    const url = new URL(OPENWEATHER_BASE + path)
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) url.searchParams.set(key, String(value))
    }
    url.searchParams.set('appid', apiKey)

    try {
        const upstream = await fetch(url)
        const data = await upstream.json()
        res.status(upstream.status).json(data)
    } catch (error) {
        console.error('OpenWeatherMap 프록시 호출 실패:', error)
        res.status(502).json({ error: '날씨 데이터를 가져오지 못했습니다.' })
    }
}
