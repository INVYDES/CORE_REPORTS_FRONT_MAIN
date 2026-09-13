<script setup lang="ts">
  import { ref, onMounted } from 'vue';
  import { useAuthStore } from '../stores/authStore';
  import { storeToRefs } from 'pinia';
  import AppSidebar from '../components/shared/AppSidebar.vue';
  import AppHeader from '../components/shared/AppHeader.vue';

  const authStore = useAuthStore();
  const { currentUser } = storeToRefs(authStore);

  const isSidebarOpen = ref(false);

  onMounted(() => {
    if (!localStorage.getItem('hasVisited')) {
      isSidebarOpen.value = true;
      localStorage.setItem('hasVisited', 'true');
    }
  });

  const toggleSidebar = () => {
    isSidebarOpen.value = !isSidebarOpen.value;
  };

  const closeSidebar = () => {
    isSidebarOpen.value = false;
  };
</script>

<template>
  <div class="page-container-app-layout">
    <!-- Overlay for mobile when sidebar is open -->
    <div 
      v-if="isSidebarOpen" 
      class="sidebar-overlay" 
      @click="closeSidebar"
    ></div>

    <AppSidebar :is-open="isSidebarOpen" @close="closeSidebar" />

    <div class="main-content-wrapper">
      <AppHeader v-if="currentUser?.rol !== 0" @toggle-sidebar="toggleSidebar" />

      <main class="content-body">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>

    </div>
  </div>
</template>

<style scoped lang="scss">
  .page-container-app-layout {
    display: flex;
    min-height: 100dvh;
    height: 100dvh;
    width: 100vw;
    overflow: hidden; 
    background-color: #f1f5f9; 
    position: relative;
  }

  .sidebar-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 30;
  }

  @media (max-width: 768px) {
    .sidebar-overlay {
      display: block;
    }
  }

  .main-content-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .content-body {
    flex: 1;
    overflow-y: auto; 
    padding: 2rem;
  }

  @media (max-width: 768px) {
    .content-body {
      padding: 1rem;
    }
    .main-content-wrapper {
      margin-left: 0 !important;
      width: 100%;
      overflow-x: hidden;
    }
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.2s ease;
  }

  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }

  @media print {
    .page-container-app-layout {
      display: block !important;
      height: auto !important;
      overflow: visible !important;
    }
    .sidebar-overlay {
      display: none !important;
    }
    .main-content-wrapper {
      margin-left: 0 !important;
      width: 100% !important;
    }
    .content-body {
      padding: 0 !important;
      overflow: visible !important;
    }
  }
</style>