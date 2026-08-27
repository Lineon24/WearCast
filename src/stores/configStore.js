// src/stores/config.js
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useConfigStore = defineStore('config', () => {
    const unit = ref('celsius') // state

    const unitSymbol = computed(() => (unit.value === 'fahrenheit' ? '°F' : '°C')) // getters

    const toggleUnit = () => { // actions
        unit.value = unit.value === 'celsius' ? 'fahrenheit' : 'celsius'
    }

    return { unit, unitSymbol, toggleUnit } // Expose
})