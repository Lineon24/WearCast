import { ref } from 'vue'
import { defineStore, acceptHMRUpdate } from 'pinia'

// 🤔 설계 고민: 챗봇 대화를 앱 전체에서 하나로 공유할지, 지역(도시)마다 따로 관리할지 고민했다.
// 하나로 합치면 구현은 더 간단하지만, 서울 얘기하다가 부산으로 지역을 바꾸면
// 서울 관련 대화가 계속 섞여서 나오는 게 어색하고 실제로도 의미가 없다(부산 챗봇이 서울 날씨를 알 리 없음).
// 그래서 저장 구조 자체를 지역별로 완전히 분리하기로 했다: { [cityId]: [{role, content}, ...] }.
// 이러면 지역을 바꿔도 그 지역의 이전 대화가 그대로 남아있고, 다른 지역과 안 섞이며,
// 나중에 그 지역으로 돌아오면 대화가 이어지는 것처럼 자연스럽게 느껴진다.
const STORAGE_KEY = 'weather-app-chat-history'

const loadFromStorage = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch (error) {
        console.error('로컬스토리지에서 채팅 기록을 불러오는 중 오류:', error)
        return {}
    }
}

let persistTimer = null
const persist = (data) => {
    // 스트리밍 중에는 짧은 시간에 여러 번 갱신되므로 묶어서(디바운스) 저장한다
    clearTimeout(persistTimer)
    persistTimer = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }, 300)
}

export const useChatHistoryStore = defineStore('chatHistory', () => {
    // { [cityId]: [{ role: 'user' | 'assistant', content: string }] }
    const historyByCity = ref(loadFromStorage())

    // 해당 지역의 대화 목록을 반환. 아직 대화한 적 없는 지역이면 빈 배열
    const getMessages = (cityId) => historyByCity.value[cityId] || []

    // 해당 지역의 대화 목록 맨 뒤에 메시지 하나를 추가하고, 방금 추가한 메시지 객체를 돌려준다
    // (돌려준 객체는 streaming 응답이 채워지는 동안 참조로 계속 갱신하기 위해 쓰임)
    const appendMessage = (cityId, message) => {
        if (!historyByCity.value[cityId]) historyByCity.value[cityId] = []
        historyByCity.value[cityId].push(message)
        persist(historyByCity.value)
        return historyByCity.value[cityId][historyByCity.value[cityId].length - 1]
    }

    // 스트리밍 중에는 이 함수로 마지막(진행 중인) 메시지의 내용만 갱신한다
    const updateLastMessage = (cityId, content) => {
        const list = historyByCity.value[cityId]
        if (!list || list.length === 0) return
        list[list.length - 1].content = content
        persist(historyByCity.value)
    }

    return { historyByCity, getMessages, appendMessage, updateLastMessage }
})

if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useChatHistoryStore, import.meta.hot))
}
