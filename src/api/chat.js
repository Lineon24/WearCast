const CHAT_PROXY_URL = '/api/chat'

// 선택한 지역의 날씨 데이터를 모델이 참고할 시스템 프롬프트로 정리해서 문자열로 반환하는 함수
//
// 🛠️ 트러블슈팅 [v0.0.0]: 처음에는 "날씨 질문에만 답하고 나머지는 거절"이라는 규칙만 대충 넣었더니,
// "이번주 날씨 전반적으로 어때?" 같은 명백한 날씨 질문까지 예시 문구("오늘 뭐 입지" 등)와
// 정확히 안 겹친다는 이유로 자꾸 거절해버리는 과잉 거절 버그가 있었다.
// 그래서 규칙을 "1) 날씨 질문 2) 가벼운 일상 대화 3) 전문 지식/작업 요청"으로 나누고,
// 애매하면 거절보다는 답변 쪽으로 기울도록(허용 범위를 넓게) 다시 썼다.
//
// 🛠️ 트러블슈팅 [v0.0.12]: 우리 앱이 이미 갖고 있던 값(체감온도/습도/풍속/강수량mm 등)인데도
// 이 요약에는 안 넣고 있어서, 챗봇이 "강수량 몇 mm야?" 같은 질문엔 확률(%)로만 얼버무렸다.
// 심지어 체감온도는 "체감상태"라는 필드명으로 잘못 붙어 있었는데(실제로는 status 값이 들어있었음)
// AI가 이걸 체감온도로 착각/혼동하는 원인이 되기도 했다.
// → 현재/시간별/일별 예보 요약에 체감온도/습도/풍속/강수량/구름량/기압/가시거리/일출·일몰/
// 이슬점/돌풍(windGust)까지 실제로 갖고 있는 값을 전부 반영하고, 헷갈리던 필드명도 정리했다.
// 필드명을 아무리 잘 붙여도 질문 표현과 완전히 안 겹치는 경우는 또 생길 수 있어서, "필드명이
// 안 겹쳐도 의미로 판단해서 답하라"는 지시와 "돌풍 8m/s 이상이면 우산 관련 답변에 자연스럽게
// 언급하라"는 지시(상세 페이지 돌풍 주의 알림과 같은 8m/s 기준)도 함께 추가했다.
export const buildWeatherSystemPrompt = (city, weatherData) => {
  const { current, hourlyForecast, dailyForecast, uvIndex, airQuality } = weatherData

  const summary = {
    지역: city.region || city.name,
    현재날씨: current
      ? {
          기온: current.temp,
          체감온도: current.feelsLike,
          날씨상태: current.status,
          습도: current.humidity,
          풍속: current.windSpeed,
          돌풍: current.windGust ? `${current.windGust}m/s` : '없음',
          구름량: `${current.clouds}%`,
          기압: `${current.pressure}hPa`,
          가시거리: `${current.visibility}km`,
          일출: current.sunrise,
          일몰: current.sunset,
        }
      : null,
    시간별예보_24시간_3시간단위: hourlyForecast?.map((item) => ({
      시각: item.time,
      기온: item.temp,
      체감온도: item.feelsLike,
      날씨: item.status,
      습도: item.humidity,
      풍속: item.windSpeed,
      돌풍: item.windGust ? `${item.windGust}m/s` : '없음',
      강수확률: `${item.pop}%`,
      강수량: `${item.rainAmount}mm`,
      구름량: `${item.clouds}%`,
      이슬점: item.dewPoint,
      자외선: item.uv,
    })),
    일별예보_5일: dailyForecast?.map((day) => ({
      날짜: day.date,
      최저기온: day.minTemp,
      최고기온: day.maxTemp,
      최저체감온도: day.minFeelsLike,
      최고체감온도: day.maxFeelsLike,
      날씨: day.status,
      평균습도: day.avgHumidity,
      최대풍속: day.maxWindSpeed,
      최대돌풍: day.maxWindGust ? `${day.maxWindGust}m/s` : '없음',
      최대강수확률: `${day.maxPop}%`,
      강수량합계: `${day.totalRain}mm`,
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
    '아래 JSON의 필드명이 사용자가 쓴 단어와 글자 그대로 똑같지 않아도 괜찮아. 의미가 통하면 알아서 매칭해서 답변해 -',
    '예를 들어 "체감", "느껴지는 온도"는 체감온도 필드를, "비 얼마나 와"는 강수량(mm) 필드를, "흐린 정도"는 구름량 필드를, "언제 어두워져"는 일몰 필드를 가리키는 거야.',
    '데이터 안에 실제로 존재하는 정보인데 필드명이 질문 표현과 정확히 안 겹친다는 이유만으로 모른다고 답하지 마.',
    '돌풍이 8m/s 이상이면 우산이 뒤집힐 수 있으니, 질문에 없어도 우산/외출 관련 답변에는 자연스럽게 돌풍 주의를 언급해줘.',
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
