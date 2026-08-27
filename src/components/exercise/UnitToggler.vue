<script setup>
import { useConfigStore } from '@/stores/configStore'

const configStore = useConfigStore()
</script>

<template>
    <!--
        🛠️ 트러블슈팅: 기본 크기(size 지정 안 함)로 두니 이 스위치가 옆의 네비게이션 메뉴(높이 34px)보다
        훨씬 작아서(높이 20px) 나란히 있을 때 크기가 안 맞아 보였다. size="large"를 줘서
        네비게이션 바와 높이가 비슷하게 맞도록 했다.
    -->
    <el-switch
        :model-value="configStore.unit === 'fahrenheit'"
        inline-prompt
        size="large"
        active-text="°F"
        inactive-text="°C"
        class="unit-toggler"
        @change="configStore.toggleUnit"
    />
</template>

<style scoped>
.unit-toggler {
    --el-switch-on-color: var(--wx-primary);
    --el-switch-off-color: var(--wx-primary);
    flex-shrink: 0;
}
</style>
