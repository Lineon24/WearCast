<script setup>
defineProps({
  icon: { type: String, default: '' },
  title: { type: String, required: true },
})

// icon이 "Search"처럼 PascalCase 문자열이면 전역 등록된 Element Plus 벡터 아이콘 컴포넌트로 렌더링하고,
// 그 외(이모지 등 기존 값)는 예전처럼 텍스트 그대로 보여준다 - 호출부를 한 번에 다 안 고쳐도 되도록
// 두 방식을 함께 지원한다.
const isIconComponent = (value) => /^[A-Z][A-Za-z]*$/.test(value)
</script>

<template>
  <section class="dashboard-card">
    <h3 class="dashboard-card__title">
      <span v-if="icon" class="dashboard-card__icon">
        <el-icon v-if="isIconComponent(icon)"><component :is="icon" /></el-icon>
        <template v-else>{{ icon }}</template>
      </span>
      {{ title }}
    </h3>
    <div class="dashboard-card__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.dashboard-card {
  background: var(--wx-surface);
  border-radius: var(--wx-radius-lg);
  box-shadow: var(--wx-shadow-sm);
  padding: 18px 20px;
  margin-bottom: 16px;
}
.dashboard-card__title {
  margin: 0 0 14px;
  font-size: 15.5px;
  font-weight: 800;
  color: var(--wx-text);
  display: flex;
  align-items: center;
  gap: 8px;
}
.dashboard-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--wx-primary-light);
  font-size: 15px;
  flex-shrink: 0;
}
</style>
