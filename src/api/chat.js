const CHAT_PROXY_URL = '/api/chat'

// 선택한 지역의 날씨 데이터를 모델이 참고할 시스템 프롬프트로 정리해서 문자열로 반환하는 함수
//
// 🛠️ 트러블슈팅: 처음에는 "날씨 질문에만 답하고 나머지는 거절"이라는 규칙만 대충 넣었더니,
// "이번주 날씨 전반적으로 어때?" 같은 명백한 날씨 질문까지 예시 문구("오늘 뭐 입지" 등)와
// 정확히 안 겹친다는 이유로 자꾸 거절해버리는 과잉 거절 버그가 있었다.
// 그래서 규칙을 "1) 날씨 질문 2) 가벼운 일상 대화 3) 전문 지식/작업 요청"으로 나누고,
// 애매하면 거절보다는 답변 쪽으로 기울도록(허용 범위를 넓게) 다시 썼다.
export const buildWeatherSystemPrompt = (city, weatherData) => {
  const { current, hourlyForecast, dailyForecast, uvIndex, airQuality } = weatherData

  const summary = {
    지역: city.region || city.name,
    현재날씨: current
      ? {
          기온: current.temp,
          체감상태: current.status,
          습도: current.humidity,
          풍속: current.windSpeed,
        }
      : null,
    시간별예보_24시간_3시간단위: hourlyForecast?.map((item) => ({
      시각: item.time,
      기온: item.temp,
      날씨: item.status,
      강수확률: `${item.pop}%`,
      자외선: item.uv,
    })),
    일별예보_5일: dailyForecast?.map((day) => ({
      날짜: day.date,
      최저기온: day.minTemp,
      최고기온: day.maxTemp,
      날씨: day.status,
      최대강수확률: `${day.maxPop}%`,
      최대자외선: day.maxUv,
    })),
    현재자외선지수: uvIndex,
    대기질: airQuality
      ? { 등급: airQuality.aqiLabel, 'PM2.5': airQuality.pm2_5, PM10: airQuality.pm10 }
      : null,
  }

  return [
    '너는 "날씨 챗봇"이야. 아래 날씨 데이터를 바탕으로 실용적인 조언만 해주는 게 역할이야.',
    '아래는 사용자가 선택한 지역의 실제 날씨 데이터(JSON, 현재/24시간/5일치)야. 반드시 이 데이터에 근거해서만 답변해.',
    '기온/날씨상태/강수확률/자외선/대기질/옷차림/우산 등 이 데이터로 답할 수 있는 질문이면 무엇이든 답해줘 -',
    '"오늘/내일/이번주 날씨 어때?", "언제 비 와?", "많이 더워/추워?", "최고기온 몇 도야?" 같은 폭넓고 일반적인 질문도 전부 정상적으로 답변해야 해.',
    '기온/강수확률/자외선 등 구체적인 수치를 근거로 대답해줘. 데이터에 없는 세부사항(예: 데이터 범위 밖 날짜)만 모른다고 말해.',
    '답변은 2~4문장으로 간결하게, 필요하면 이모지도 적절히 섞어서.',
    '',
    '### 질문 종류별 처리 규칙',
    '1) 날씨 관련 질문 - 조금이라도 날씨/기온/옷차림/우산과 관련 있어 보이면 거절하지 말고 위 데이터를 근거로 답변해.',
    '2) 가벼운 일상 대화 - "안녕", "고마워", "너는 누구야?", "심심해", "잘 지내?" 같은 짧은 인사/잡담은 막지 말고 자연스럽고 짧게 받아줘도 돼.',
    '   답한 뒤 자연스럽게 날씨 얘기로 한 번씩 유도해도 좋아 (예: "오늘 날씨도 궁금하면 물어봐! ☀️").',
    '3) 전문 지식/작업 요청 - 코딩 짜달라, 수학 문제 풀어달라, 법률/의료/투자 상담, 에세이/보고서 작성, 번역, 다른 지역(데이터 없는) 뉴스나 상식 등',
    '   전문적인 지식이나 작업을 요구하는 질문일 때만 "죄송해요, 저는 이 지역 날씨에 관한 질문에만 답변할 수 있어요 🌤️" 라고만 답하고 다른 정보는 제공하지 마.',
    '짧은 인사/감탄/잡담처럼 애매한 경우에는 거절하지 말고 가볍게 받아줘. 거절은 코딩/수학/전문 상담처럼 명백히 별도의 전문 지식이나 결과물을 요구할 때만 해.',
    '',
    '### 날씨 데이터',
    JSON.stringify(summary, null, 2),
  ].join('\n')
}

// 대화 이력 + 새 질문을 백엔드로 보내고, 응답을 스트리밍으로 받아온다.
// onChunk(delta, fullTextSoFar)가 토큰이 도착할 때마다 호출된다.
export const askWeatherChatStream = async ({ systemPrompt, history, userMessage, onChunk }) => {
  const response = await fetch(CHAT_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, history, userMessage }),
  })

  if (!response.ok || !response.body) {
    let message = '챗봇 서버에 연결할 수 없습니다.'
    try {
      const data = await response.json()
      message = data.error || message
    } catch {
      // 본문이 JSON이 아닐 수도 있음 - 기본 메시지 사용
    }
    throw new Error(message)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunkText = decoder.decode(value, { stream: true })
    if (chunkText) {
      fullText += chunkText
      onChunk?.(chunkText, fullText)
    }
  }

  return fullText
}
