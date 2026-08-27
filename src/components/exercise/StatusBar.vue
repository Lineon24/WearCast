<script setup>
// 실습 3. 컴포넌트 추가 분리
defineProps({
    message: { type: String, default: '' },
})
</script>

<template>
    <div class="footer-note">
        <el-icon><InfoFilled /></el-icon>
        <span>{{ message || '카드를 클릭하거나 검색해 보세요.' }}</span>
    </div>
</template>

<style scoped>
.footer-note {
    display: flex;
    align-items: center;
    gap: 8px;
    text-align: left;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--wx-success);
    background: #eafaf1;
    border-radius: var(--wx-radius-pill);
    padding: 11px 16px;
    margin-top: 4px;
}
.footer-note .el-icon { flex-shrink: 0; }
</style>
