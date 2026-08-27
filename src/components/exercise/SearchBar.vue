<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
    searchQuery: { type: String, default: ''},
})
const emit = defineEmits(['update-query'])

const inputRef = ref(null)

// el-input 화면에 보이는 값은 이 로컬 ref가 유일한 기준(v-model)이다.
// 부모의 searchQuery를 다시 이 컴포넌트로 되먹이면(예: watch로 동기화), 내가 타이핑한 값이
// 부모를 거쳐 돌아오는 왕복 과정과 실제 타이핑 속도가 경쟁하면서 커서 위치가 튀거나
// backspace가 안 먹히는 문제가 있었다. 이 앱에서는 검색어가 바깥에서 바뀔 일이 없으므로
// 아예 되먹이지 않고 초기값만 받아온다.
const localValue = ref(props.searchQuery)

// el-input은 한글 등 조합형(IME) 입력 중에는 input 이벤트를 내보내지 않고
// 조합이 끝나야(compositionend) 값을 전달한다 (조합 도중 값이 튀는 걸 막기 위한 설계).
// 이 컴포넌트는 "즉시 동기화"가 핵심 기능이라, 내부 네이티브 input에 직접 리스너를 붙여서
// 조합 중이어도(글자 하나하나 입력할 때마다) 바로 필터링되도록 한다.
// (화면 표시는 위 v-model이 정상적으로 처리하므로, 여기서는 필터링 알림 용도로만 사용)
const handleNativeInput = (event) => emit('update-query', event.target.value)

onMounted(() => {
    inputRef.value?.input?.addEventListener('input', handleNativeInput)
})
onBeforeUnmount(() => {
    inputRef.value?.input?.removeEventListener('input', handleNativeInput)
})
</script>

<template>
    <div>
        <el-input
            ref="inputRef"
            v-model="localValue"
            placeholder="검색할 도시 이름 입력"
            size="large"
            clearable
            @clear="emit('update-query', '')"
        >
            <template #prefix>
                <el-icon><Search /></el-icon>
            </template>
        </el-input>
        <p v-if="searchQuery" class="search-echo">
            검색 중인 도시: <strong>{{ searchQuery }}</strong>
        </p>
    </div>
</template>

<style scoped>
:deep(.el-input__wrapper) {
    border-radius: var(--wx-radius-pill);
    background: var(--wx-bg);
    box-shadow: none;
    padding: 4px 16px;
}
:deep(.el-input__wrapper.is-focus) {
    box-shadow: 0 0 0 1px var(--wx-primary) inset;
}
.search-echo { margin: 10px 2px 0; font-size: 12.5px; color: var(--wx-text-soft); }
</style>
