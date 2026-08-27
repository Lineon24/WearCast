<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { weatherMockData } from '@/mock/weatherMock.js'
import {
    fetchWeatherByCoords,
    fetchAirPollution,
    fetchForecast,
    fetchUvIndex,
    fetchUvForecast,
    findUvAtTime,
} from '@/api/weather.js'
import { buildWeatherSystemPrompt, askWeatherChatStream } from '@/api/chat.js'
import { useFavoritesStore } from '@/stores/favorites'
import { useCustomCitiesStore } from '@/stores/customCities'
import { useChatHistoryStore } from '@/stores/chatHistory'

const favoritesStore = useFavoritesStore()
const customCitiesStore = useCustomCitiesStore()
const chatHistoryStore = useChatHistoryStore()

const SELECTED_CITY_KEY = 'weather-app-chatbot-selected-city'

// 홈 화면과 같은 규칙: 삭제된 기본 지역 제외 + 커스텀 지역은 최근 추가 순
const cityList = computed(() => {
    const all = [
        ...weatherMockData
            .filter((c) => !customCitiesStore.removedDefaultCityIds.includes(c.id))
            .map((c) => ({ ...c, isCustom: false })),
        ...[...customCitiesStore.cities].reverse().map((c) => ({ ...c, isCustom: true })),
    ]
    // 즐겨찾기한 지역이 맨 위로 오도록 정렬
    return [...all].sort((a, b) => {
        const aFav = favoritesStore.isFavoriteCity(a.id) ? 0 : 1
        const bFav = favoritesStore.isFavoriteCity(b.id) ? 0 : 1
        return aFav - bFav
    })
})

const selectedCityId = ref(localStorage.getItem(SELECTED_CITY_KEY) || null)
const selectedCity = computed(() => cityList.value.find((c) => c.id === selectedCityId.value) || null)

// 채팅 기록은 지역별로 로컬스토리지에 저장되어, 다른 페이지에 갔다 와도 그대로 남아있음
const messages = computed(() => chatHistoryStore.getMessages(selectedCityId.value))

const isLoadingWeather = ref(false)
const weatherData = ref(null) // { current, hourlyForecast, dailyForecast, uvIndex, hourlyUv, airQuality }

// 카카오톡처럼: 메시지를 보내면 무조건 맨 아래로, AI 답변 중에는 이미 맨 아래일 때만 따라 내려간다
const chatMessagesEl = ref(null)
const BOTTOM_THRESHOLD = 48

const isNearBottom = () => {
    const el = chatMessagesEl.value
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD
}

const scrollToBottom = () => {
    const el = chatMessagesEl.value
    if (el) el.scrollTop = el.scrollHeight
}

// 메시지를 보낸 직후처럼 "무조건 맨 아래로" 내려야 하는 상황인지 표시하는 플래그.
// (반응형일 필요 없음 - watch 콜백 안에서만 읽는 일반 변수)
let shouldStickToBottom = true

// 지역을 선택해 날씨 데이터 로딩이 끝나고 채팅창이 처음 나타날 때 맨 아래로 이동.
// flush: 'post'로 DOM이 실제로 갱신된 뒤에 실행되도록 보장한다 (nextTick만으로는 타이밍이 안 맞는 경우가 있었음).
watch(weatherData, (val) => {
    if (val) scrollToBottom()
}, { flush: 'post' })

// 메시지 목록이 바뀔 때(전송/스트리밍 갱신)도 같은 방식으로 처리
watch(messages, () => {
    if (shouldStickToBottom) scrollToBottom()
}, { deep: true, flush: 'post' })

// 선택한 지역의 현재 날씨 + 24시간 예보 + 5일 예보 + 자외선 + 대기질을 한 번에 불러와서
// weatherData에 담는다. 이 값이 챗봇이 참고하는 실제 근거 데이터가 된다.
const loadWeatherData = async (city) => {
    if (!city) return
    isLoadingWeather.value = true
    weatherData.value = null
    try {
        const [current, forecastList, uv, hourlyUvData, airQuality] = await Promise.all([
            fetchWeatherByCoords(city.lat, city.lon),
            fetchForecast(city.lat, city.lon),
            fetchUvIndex(city.lat, city.lon),
            fetchUvForecast(city.lat, city.lon),
            fetchAirPollution(city.lat, city.lon).catch(() => null),
        ])

        const hourlyForecast = forecastList.slice(0, 8).map((item) => ({
            ...item,
            uv: hourlyUvData ? findUvAtTime(hourlyUvData, item.timestamp) : null,
        }))

        const grouped = {}
        forecastList.forEach((item) => {
            if (!grouped[item.date]) grouped[item.date] = { temps: [], statuses: [], pops: [], uvs: [] }
            grouped[item.date].temps.push(item.temp)
            grouped[item.date].statuses.push(item.status)
            grouped[item.date].pops.push(item.pop)
            if (hourlyUvData) grouped[item.date].uvs.push(findUvAtTime(hourlyUvData, item.timestamp))
        })
        const getMostFrequent = (arr) => {
            const counts = {}
            arr.forEach((v) => { counts[v] = (counts[v] || 0) + 1 })
            return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
        }
        const dailyForecast = Object.entries(grouped).map(([date, info]) => ({
            date,
            minTemp: Math.min(...info.temps),
            maxTemp: Math.max(...info.temps),
            status: getMostFrequent(info.statuses),
            maxPop: Math.max(...info.pops),
            maxUv: info.uvs.length ? Math.max(...info.uvs) : null,
        }))

        weatherData.value = { current, hourlyForecast, dailyForecast, uvIndex: uv, hourlyUv: hourlyUvData, airQuality }
    } catch (error) {
        console.error('챗봇용 날씨 데이터를 가져오는 중 오류:', error)
        loadError.value = '날씨 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
    } finally {
        isLoadingWeather.value = false
    }
}

const loadError = ref('')

const selectCity = (city) => {
    loadError.value = ''
    selectedCityId.value = city.id
    localStorage.setItem(SELECTED_CITY_KEY, city.id)
    loadWeatherData(city)
}

// 새로고침/다른 페이지에서 돌아왔을 때, 이전에 선택했던 지역이 있으면 자동으로 다시 불러온다
onMounted(() => {
    if (selectedCity.value) loadWeatherData(selectedCity.value)
})

const chatInput = ref('')
const isSending = ref(false)
const chatError = ref('')

// 입력한 질문을 현재 대화 기록(같은 지역)에 이어붙여서 보내고, 답변을 스트리밍으로 받아
// 실시간으로 말풍선을 채운다
const sendMessage = async () => {
    if (isSending.value) return // 겹쳐서 두 번 전송되는 것 방지 (한글 IME + Enter 이슈 포함)
    const text = chatInput.value.trim()
    if (!text || !weatherData.value || !selectedCity.value) return

    const cityId = selectedCity.value.id
    const historyBeforeThisTurn = messages.value.map((m) => ({ role: m.role, content: m.content }))

    chatError.value = ''
    shouldStickToBottom = true // 메시지를 보내면 항상 맨 아래로
    chatHistoryStore.appendMessage(cityId, { role: 'user', content: text })
    chatInput.value = ''
    isSending.value = true
    chatHistoryStore.appendMessage(cityId, { role: 'assistant', content: '' }) // 실시간으로 채워질 빈 말풍선

    try {
        const systemPrompt = buildWeatherSystemPrompt(selectedCity.value, weatherData.value)
        await askWeatherChatStream({
            systemPrompt,
            history: historyBeforeThisTurn,
            userMessage: text,
            onChunk: (_delta, fullText) => {
                shouldStickToBottom = isNearBottom() // 답변 오는 도중엔 이미 맨 아래일 때만 따라 내려감
                chatHistoryStore.updateLastMessage(cityId, fullText)
            },
        })
    } catch (error) {
        console.error('챗봇 응답 실패:', error)
        chatError.value = error.message || '답변을 받아오지 못했습니다.'
        shouldStickToBottom = isNearBottom()
        chatHistoryStore.updateLastMessage(cityId, '(답변을 받아오지 못했어요)')
    } finally {
        isSending.value = false
    }
}

// Enter로 전송하되, 한글 조합 중에 눌린 Enter는 무시한다
// (AddCityBar.vue에서 겪었던 것과 같은 IME 이슈라 동일한 방식으로 방어)
const handleEnterKey = (event) => {
    if (event.isComposing || event.keyCode === 229) return
    chatInput.value = event.target.value
    sendMessage()
}

// 지금 선택 중인 지역이 (홈 화면 등에서) 삭제되면, 이 페이지도 선택을 풀어서
// 더 이상 존재하지 않는 지역의 날씨를 보여주는 상태로 남지 않도록 한다
watch(() => customCitiesStore.removedDefaultCityIds, () => {
    if (selectedCityId.value && !cityList.value.some((c) => c.id === selectedCityId.value)) {
        selectedCityId.value = null
        weatherData.value = null
        localStorage.removeItem(SELECTED_CITY_KEY)
    }
}, { deep: true })
</script>

<template>
    <div class="practice-section page-pad">
        <div class="chat-header">
            <div class="chat-header-icon">🤖</div>
            <div>
                <h2 class="chat-title">날씨 챗봇</h2>
                <p class="chat-subtitle">지역을 선택하면 그 지역 날씨를 바탕으로 답변해드려요</p>
            </div>
        </div>

        <div class="city-select-row">
            <el-tag
                v-for="city in cityList" :key="city.id"
                round
                :effect="city.id === selectedCityId ? 'dark' : 'plain'"
                class="city-chip"
                @click="selectCity(city)"
            >
                <span v-if="favoritesStore.isFavoriteCity(city.id)" class="chip-star">★</span>
                {{ city.name }}
            </el-tag>
            <p v-if="cityList.length === 0" class="no-city">등록된 지역이 없어요. 대시보드에서 먼저 지역을 추가해주세요.</p>
        </div>

        <el-alert v-if="loadError" :title="loadError" type="error" show-icon :closable="false" class="mb-14" />

        <div v-if="selectedCity" class="chat-panel">
            <div v-if="isLoadingWeather" class="loading-text">
                <el-icon class="is-loading"><Loading /></el-icon> {{ selectedCity.name }}의 날씨 데이터를 불러오는 중...
            </div>

            <template v-else-if="weatherData">
                <div class="chat-messages" ref="chatMessagesEl">
                    <p v-if="messages.length === 0" class="chat-empty">
                        "오늘 뭐 입을까?", "우산 챙겨야 돼?" 처럼 편하게 물어보세요 🙂 (이 지역 날씨 얘기만 답해줘요)
                    </p>
                    <div
                        v-for="(msg, idx) in messages" :key="idx"
                        class="chat-bubble-row" :class="msg.role"
                    >
                        <div class="chat-bubble">{{ msg.content }}<span v-if="isSending && idx === messages.length - 1 && msg.role === 'assistant'" class="typing-cursor">▍</span></div>
                    </div>
                </div>

                <el-alert v-if="chatError" :title="chatError" type="error" show-icon :closable="false" class="mb-8" />

                <div class="chat-input-row">
                    <el-input
                        v-model="chatInput"
                        placeholder="예: 오늘 우산 챙겨야 돼?"
                        :disabled="isSending"
                        @keyup.enter="handleEnterKey"
                    />
                    <el-button type="primary" round :disabled="isSending || !chatInput.trim()" @click="sendMessage">
                        전송
                    </el-button>
                </div>
            </template>
        </div>

        <el-empty v-else description="위에서 지역을 먼저 선택해주세요." :image-size="90" class="chat-empty-state" />

        <el-button tag="router-link" to="/" text class="back-link">
            <el-icon><ArrowLeft /></el-icon> 메인 대시보드로 돌아가기
        </el-button>
    </div>
</template>

<style scoped>
.page-pad { padding-top: clamp(18px, 4vw, 28px); }
.mb-14 { margin-bottom: 14px; border-radius: var(--wx-radius-sm); }
.mb-8 { margin-bottom: 8px; border-radius: var(--wx-radius-sm); }

.chat-header {
    display: flex;
    align-items: center;
    gap: 12px;
    background: linear-gradient(135deg, var(--wx-primary-light), var(--wx-surface));
    border-radius: var(--wx-radius-lg);
    box-shadow: var(--wx-shadow-sm);
    padding: 18px 20px;
    margin-bottom: 16px;
}
.chat-header-icon {
    font-size: 26px;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--wx-surface);
    border-radius: 50%;
    flex-shrink: 0;
}
.chat-title { margin: 0; font-size: 15px; font-weight: 800; color: var(--wx-text); }
.chat-subtitle { margin: 2px 0 0; font-size: 12px; color: var(--wx-text-soft); }

.city-select-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
}
.city-chip {
    cursor: pointer;
    font-weight: 600;
    padding: 15px 14px;
    border-color: var(--wx-border);
}
.chip-star { color: var(--wx-warm); margin-right: 2px; }
.no-city { font-size: 12.5px; color: var(--wx-text-soft); }

.loading-text {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 12.5px;
    color: var(--wx-text-soft);
    padding: 16px 0;
}

.chat-panel {
    background: var(--wx-surface);
    border-radius: var(--wx-radius-lg);
    box-shadow: var(--wx-shadow-sm);
    padding: 16px;
    margin-bottom: 16px;
}

.chat-messages {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 80px;
    max-height: 340px;
    overflow-y: auto;
    padding-bottom: 8px;
    padding-right: 10px; /* PC에서 스크롤바가 생겨도 말풍선이 바로 안 닿도록 여백 확보 */
    scrollbar-width: thin;
    scrollbar-color: var(--wx-border) transparent;
}
.chat-messages::-webkit-scrollbar { width: 6px; }
.chat-messages::-webkit-scrollbar-track { background: transparent; }
.chat-messages::-webkit-scrollbar-thumb { background: var(--wx-border); border-radius: 999px; }
.chat-messages::-webkit-scrollbar-thumb:hover { background: var(--wx-text-faint); }
.chat-empty { text-align: center; font-size: 12.5px; color: var(--wx-text-soft); padding: 16px 0; }

.chat-bubble-row { display: flex; }
.chat-bubble-row.user { justify-content: flex-end; }
.chat-bubble-row.assistant { justify-content: flex-start; }
.chat-bubble {
    max-width: 78%;
    padding: 10px 14px;
    border-radius: 16px;
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
}
.chat-bubble-row.user .chat-bubble { background: var(--wx-primary); color: #fff; border-bottom-right-radius: 4px; }
.chat-bubble-row.assistant .chat-bubble { background: var(--wx-bg); color: var(--wx-text); border-bottom-left-radius: 4px; }
.typing-cursor { animation: blink 1s step-start infinite; color: var(--wx-text-soft); }
@keyframes blink { 50% { opacity: 0; } }

.chat-input-row { display: flex; gap: 8px; margin-top: 10px; }
.chat-input-row .el-input { flex: 1; }

:deep(.chat-input-row .el-input__wrapper) {
    border-radius: var(--wx-radius-pill);
    background: var(--wx-bg);
    box-shadow: none;
    padding: 4px 16px;
}
:deep(.chat-input-row .el-input__wrapper.is-focus) {
    box-shadow: 0 0 0 1px var(--wx-primary) inset;
}

.chat-empty-state {
    background: var(--wx-surface);
    border-radius: var(--wx-radius-lg);
    box-shadow: var(--wx-shadow-sm);
    margin-bottom: 16px;
}

.back-link {
    display: flex;
    width: 100%;
    justify-content: center;
    font-size: 13px;
}
</style>
