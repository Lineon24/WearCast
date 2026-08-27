import { ref, computed } from 'vue'
import { defineStore, acceptHMRUpdate } from 'pinia'

// 🤔 설계 고민: 즐겨찾기를 로컬스토리지에 직접 저장할지, Pinia 스토어(범용 컴포넌트)로만 둘지 고민했다.
// customCities.js처럼 localStorage에 영구 저장하는 방법도 있었지만,
// 즐겨찾기는 홈/즐겨찾기/챗봇 등 여러 화면에서 공통으로 "이 지역이 즐겨찾기인가?"를 참조·토글해야 하는
// 공유 상태의 성격이 강해서, 결국 범용 컴포넌트(Pinia 스토어)로 구현해 어디서든
// useFavoritesStore()로 꺼내 쓰도록 했다.
// (트레이드오프: 새로고침하면 초기화됨. 필요하면 customCities.js처럼 localStorage 동기화를 추가하면 됨)
export const useFavoritesStore = defineStore('favorites', () => {
    const favoriteCityIds = ref([]) // state

    const isFavoriteCity = computed(() => {
        return (cityId) => favoriteCityIds.value.includes(cityId)
    }) // getters — computed()가 함수를 반환

    const toggleFavorite = (cityId) => { // actions
        if (favoriteCityIds.value.includes(cityId)) {
            favoriteCityIds.value = favoriteCityIds.value.filter((id) => id !== cityId)
        } else {
            favoriteCityIds.value.push(cityId)
        }
    }

    const removeFavorite = (cityId) => {
        favoriteCityIds.value = favoriteCityIds.value.filter((id) => id !== cityId)
    }

    return { favoriteCityIds, isFavoriteCity, toggleFavorite, removeFavorite } // Expose
})

// 개발 중 이 파일만 수정했을 때도 새로고침 없이 스토어 로직이 바로 반영되도록 처리
if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(useFavoritesStore, import.meta.hot))
}