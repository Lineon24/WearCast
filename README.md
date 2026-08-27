# WearCast ☀️

관심 지역의 날씨를 등록해두고, AI 챗봇에게 "오늘 뭐 입지?", "우산 챙겨야 돼?" 같은 걸 물어볼 수 있는
나만의 맞춤 날씨 대시보드입니다. Vue 3 + Pinia + Vue Router + Element Plus로 만들었습니다.

## 목차

- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [폴더 구조](#폴더-구조)
- [시작하기](#시작하기)
- [배포 (Vercel)](#배포-vercel)
- [트러블슈팅](#트러블슈팅)

## 주요 기능

### 📋 날씨 대시보드
- 도시 이름 검색 또는 📍 내 위치(GPS)로 지역 카드 추가
- 기본 제공 지역(서울/수원/부산/안산/판교) + 내가 추가한 지역을 함께 표시
- 카드를 누르면 즐겨찾기(★) 등록/해제
- 카드 삭제 시 확인창을 거쳐 안전하게 제거 (기본 지역은 실제로는 "숨김" 처리)
- 한글 입력 즉시 반영되는 실시간 지역 검색/필터링
- 섭씨(°C) / 화씨(°F) 단위 전환

### 📊 상세 날씨 정보
- 실시간 기온 · 습도 · 풍속 · 공기질(PM2.5/PM10)
- 강수확률 · 강수량(mm) · 자외선 지수 게이지
- 24시간(3시간 간격) 및 5일 예보

### ⭐ 즐겨찾기
- 즐겨찾기한 지역만 모아보는 별도 페이지

### 🤖 날씨 챗봇
- 지역을 선택하면 그 지역의 실제 날씨 데이터를 근거로 답변
- OpenAI API 기반, 답변이 실시간 스트리밍(타이핑 효과)으로 출력
- 날씨/옷차림/우산 관련 질문에만 답하고, 무관한 전문 지식 요청은 정중히 거절 (가벼운 인사는 허용)
- 대화 기록은 지역별로 분리되어 저장되고, 다른 페이지를 오가도 유지됨

### 🎨 디자인
- Element Plus 컴포넌트 기반 UI, 라벤더/페리윙클 블루 테마로 전체 재구성
- 모바일 ~ 데스크톱까지 깨지지 않는 반응형 레이아웃

## 기술 스택

| 구분 | 사용 기술 |
|---|---|
| 프레임워크 | Vue 3 (`<script setup>`) |
| 상태 관리 | Pinia |
| 라우팅 | Vue Router |
| UI 컴포넌트 | Element Plus |
| 백엔드(챗봇 프록시) | Express(로컬 dev) / Vercel 서버리스 함수(Edge Runtime, 배포) |
| 날씨 데이터 | OpenWeatherMap API, Open-Meteo(자외선) |
| AI 챗봇 | OpenAI API (`gpt-4o-mini`) |
| 빌드 도구 | Vite |

## 폴더 구조

```
skala-vue/
├── api/
│   └── chat.js               # Vercel 서버리스 함수 (Edge Runtime) - 배포 시 챗봇 API 프록시
├── server/
│   └── index.js               # Express 서버 - 로컬 개발 시 챗봇 API 프록시 (vite dev와 함께 실행)
├── src/
│   ├── api/
│   │   ├── weather.js          # OpenWeatherMap / Open-Meteo / GPS 관련 API 함수 모음
│   │   └── chat.js             # 챗봇 프롬프트 생성 + 스트리밍 응답 요청 함수
│   ├── assets/
│   │   ├── base.css            # 디자인 토큰(색상/라운드/그림자 등 CSS 변수)
│   │   └── main.css            # Element Plus 테마 재정의 + 공통 레이아웃
│   ├── components/exercise/
│   │   ├── AddCityBar.vue      # 지역 검색/추가 입력창
│   │   ├── SearchBar.vue       # 등록된 지역 실시간 검색창
│   │   ├── WeatherCard.vue     # 지역별 날씨 카드
│   │   ├── BaseDashboardCard.vue # 카드형 섹션 공통 레이아웃 (slot으로 내용 주입)
│   │   ├── StatusBar.vue       # 하단 상태 안내 바
│   │   └── UnitToggler.vue     # °C / °F 전환 스위치
│   ├── views/
│   │   ├── WeatherHomeView.vue     # 대시보드(메인) 페이지
│   │   ├── WeatherDetailView.vue   # 지역 상세 페이지
│   │   ├── WeatherFavoritesView.vue# 즐겨찾기 페이지
│   │   ├── WeatherChatbotView.vue  # 날씨 챗봇 페이지
│   │   ├── WeatherAboutView.vue    # 소개(사용법 안내) 페이지
│   │   └── NotFoundView.vue        # 404 페이지
│   ├── stores/
│   │   ├── customCities.js     # 내가 추가/삭제한 지역 상태 (localStorage 영구 저장)
│   │   ├── favorites.js        # 즐겨찾기 상태 (Pinia 스토어, 세션 한정)
│   │   ├── chatHistory.js      # 지역별 챗봇 대화 기록 (localStorage 영구 저장)
│   │   └── configStore.js      # 온도 단위(°C/°F) 설정
│   ├── mock/
│   │   └── weatherMock.js      # 기본 제공 지역 목록(서울/수원/부산/안산/판교)
│   ├── router/
│   │   └── index.js            # 라우트 정의
│   ├── App.vue                 # 헤더 + 네비게이션 + 라우터 뷰
│   └── main.js                 # 앱 진입점 (Pinia/Router/Element Plus 등록)
├── vercel.json                 # Vercel SPA 라우팅 설정
├── .env.example                # 필요한 환경변수 예시
└── vite.config.js              # Vite 설정 (별칭, /api 프록시 등)
```

## 시작하기

```bash
npm install
cp .env.example .env.local   # 아래 값을 실제 키로 채워주세요
npm run dev                  # 프런트엔드(5173) + 백엔드 프록시(8787) 동시 실행
```

`.env.local`에 필요한 값:

```bash
OPENAI_API_KEY=sk-proj-...          # 챗봇용, 서버 전용(클라이언트에 노출 안 됨)
VITE_OPENWEATHER_API_KEY=...        # 날씨 데이터용
SERVER_PORT=8787                    # 선택, 로컬 프록시 서버 포트
```

```bash
npm run lint    # ESLint(+ oxlint) 검사
npm run build   # 프로덕션 빌드 (dist/ 생성)
npm run preview # 빌드 결과 로컬에서 미리보기
```

## 배포 (Vercel)

1. GitHub에 저장소를 올린 뒤 Vercel에서 Import
2. Vercel 프로젝트 Settings → Environment Variables에 `OPENAI_API_KEY`, `VITE_OPENWEATHER_API_KEY` 등록
3. 배포 (Vite 프레임워크 자동 감지, `api/chat.js`는 Vercel이 자동으로 서버리스 함수로 인식)

## 트러블슈팅

개발하면서 실제로 겪었던 문제들과 해결 과정입니다.

### 1. 삭제한 기본 지역을 다시 추가할 수 없던 버그
기본 제공 지역을 삭제하면 `removedDefaultCityIds`에 추가해 목록에서만 숨기는 방식인데,
중복 체크 로직(`isDuplicateLocation`)이 이 숨김 목록을 고려하지 않고 원본 데이터와 그대로 비교해서
"삭제한 지역을 다시 검색해서 추가"하면 항상 "이미 등록된 도시"로 막혀버렸습니다.
→ 중복 체크 시 숨김 처리된 지역을 먼저 걸러내도록 수정.

### 2. 한글 IME + Enter 키로 발생한 버그들
- **미완성 텍스트로 검색/전송되는 문제**: 한글은 자모를 조합해서 완성하는데, 조합 중에 Enter를 누르면
  완성되기 전 값으로 `keyup.enter`가 먼저 발동하는 경우가 있었습니다.
  → `event.isComposing` / `event.keyCode === 229`를 체크해서 조합 중 Enter는 무시하도록 처리.
- **검색이 겹쳐서 두 번 실행되는 문제**: 위 이슈와 맞물려 검색 요청이 중복 실행되면서
  "방금 추가했는데 이미 있다"고 나오는 혼란스러운 버그로 이어졌습니다.
  → 요청이 진행 중이면(`isLoading`) 재실행하지 않도록 가드 추가.

### 3. 검색이 "한 글자씩 밀려서" 반영되던 문제
Element Plus `el-input`은 한글 조합 중에는 `input`/`update:modelValue` 이벤트를 내보내지 않고
조합이 끝나야(`compositionend`) 값을 전달하도록 설계돼 있습니다. 그래서 실시간 검색 필터링이
한 글자(정확히는 한 음절) 늦게 반영되는 것처럼 보였습니다.
→ el-input 내부의 진짜 네이티브 `<input>`에 직접 이벤트 리스너를 붙여서, 조합 중에도
바로바로 필터링되도록 우회 처리.

### 4. 검색창에서 backspace/빠른 타이핑 시 값이 씹히던 문제
위 3번을 고치는 과정에서 `:model-value`(부모 상태)를 다시 입력창에 흘려보내는 구조를 썼는데,
타이핑 속도와 "부모로 갔다가 돌아오는" 비동기 흐름이 서로 경쟁하면서 커서 위치가 튀거나
값이 예상과 다르게 잘리는 문제가 있었습니다.
→ 화면에 보이는 값은 컴포넌트 내부 `ref`(진짜 `v-model`)만 신뢰하고, 부모로는 필터링 알림만
편도로 보내는 구조로 정리해서 해결.

### 5. 챗봇이 정상적인 날씨 질문까지 거절하던 문제
처음엔 "날씨 질문에만 답하고 나머지는 거절"이라는 규칙만 대충 넣었더니, 예시로 든 질문 패턴과
정확히 안 겹친다는 이유로 "이번주 날씨 어때?" 같은 명백한 질문까지 거절하는 과잉 거절이 발생했습니다.
→ 규칙을 "1) 날씨 질문 2) 가벼운 일상 대화 3) 전문 지식/작업 요청"으로 나누고,
애매한 경우엔 거절보다 답변 쪽으로 기울도록 프롬프트를 다시 작성.

### 6. 채팅창 자동 스크롤 타이밍 문제
메시지를 보내면 맨 아래로 스크롤하는 로직을 `nextTick` 안에서 처리했는데, DOM이 실제로
갱신되기 전에 스크롤이 실행돼서 씹히는 경우가 있었습니다.
→ `watch(..., { flush: 'post' })`로 바꿔서 DOM이 실제로 갱신된 뒤에 스크롤이 실행되도록 보장.
(카카오톡처럼 메시지를 보내면 무조건 맨 아래로, AI가 답변 중일 땐 이미 맨 아래에 있을 때만 따라가도록 처리)

### 7. Element Plus 테마 커스터마이징 부작용
`--el-text-color-regular`를 흐린 회색으로 재정의했더니, 이 변수를 `el-input`이 "타이핑한 글자 색"으로도
그대로 써서 모든 입력창의 글자가 흐릿하게 보이는 버그가 있었습니다.
→ 진한 색으로 바꾸고 `--el-input-text-color`를 별도로 한 번 더 명시.

### 8. 네비게이션 바 레이아웃 이슈
- 메뉴 영역에 `flex: 1`을 줬더니 배경(알약 모양)이 남는 공간을 억지로 채우며 늘어나서
  단위 전환 스위치와의 사이에 어색한 빈 공간이 생겼습니다. → `flex: 0 1 auto`로 수정.
- 라벨 글자 수가 달라서("소개" 2글자 vs "대시보드" 4글자) 메뉴 버튼 폭이 들쭉날쭉해 간격이
  고르지 않아 보였습니다. → `min-width`로 폭을 맞추고, 좁은 화면에서 라벨이 안 잘리도록 패딩도 같이 조정.

### 9. API 키가 소스 코드에 하드코딩되어 있던 문제
개발 초반에는 OpenWeatherMap API 키가 `src/api/weather.js`에 문자열로 그대로 박혀 있었습니다.
→ `.env.local`(`VITE_OPENWEATHER_API_KEY`)로 옮기고 `.gitignore`(`*.local`)로 Git에는 올라가지 않도록 처리.
챗봇(OpenAI) 키는 처음부터 프런트엔드가 아닌 백엔드 프록시(Express/Vercel 서버리스 함수)에서만
사용하도록 설계해서 브라우저에 전혀 노출되지 않습니다.

### 10. Vercel 배포 시 챗봇 스트리밍이 안 되던 문제
Vercel의 기본 Node.js 서버리스 함수는 응답을 스트리밍하지 않고 완료된 뒤 한 번에 반환합니다.
→ `api/chat.js`를 Edge Runtime(`export const config = { runtime: 'edge' }`)으로 전환해서
실시간 타이핑 효과가 배포 환경에서도 동일하게 동작하도록 수정.

### 11. Edge Runtime에서 openai SDK가 배포 자체를 실패시키던 문제
위 10번대로 Edge Runtime으로 바꾸고 나니, 이번엔 Vercel 배포 자체가
`The Edge Function "api/chat" is referencing unsupported modules: - openai: #x509-transport-state`
에러로 실패했습니다. `openai` npm SDK가 내부적으로 Edge Runtime이 지원하지 않는
Node 전용 모듈(TLS 관련)을 참조하고 있었던 게 원인입니다.
→ SDK를 걷어내고, OpenAI REST API(`/v1/chat/completions`)를 `fetch`로 직접 호출한 뒤
응답으로 오는 SSE(Server-Sent Events) 스트림(`data: {...}\n\n`)을 직접 파싱해서
`delta.content`만 뽑아 내보내는 방식으로 교체. `fetch`/`ReadableStream`/`TextDecoder`는
전부 Edge Runtime이 지원하는 표준 웹 API라 이 문제를 완전히 피할 수 있었습니다.
(로컬 dev용 `server/index.js`는 일반 Node 프로세스라 SDK를 그대로 써도 문제없음)
