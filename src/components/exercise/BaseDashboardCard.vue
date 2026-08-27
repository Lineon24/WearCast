<script setup>
defineProps({
  icon: { type: String, default: '' },
  title: { type: String, required: true },
})
</script>

<template>
  <section class="dashboard-card">
    <h3 class="dashboard-card__title">
      <span v-if="icon" class="dashboard-card__icon">{{ icon }}</span>
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
