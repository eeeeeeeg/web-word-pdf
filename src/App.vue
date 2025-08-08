<template>
  <div id="app" :class="{ 'share-mode': isShareMode }">
    <!-- 分享预览页面 -->
    <ShareViewer v-if="isShareMode" :share-id="shareId" />
    <!-- 正常编辑器 -->
    <PageEditor v-else />
  </div>
</template>

<script>
import PageEditor from "./components/PageEditor.vue";
import ShareViewer from "./components/ShareViewer.vue";

export default {
  name: "App",
  components: {
    PageEditor,
    ShareViewer,
  },
  data() {
    return {
      isShareMode: false,
      shareId: "",
    };
  },
  mounted() {
    this.checkRoute();
    // 监听hash变化
    window.addEventListener("hashchange", this.checkRoute);
  },
  beforeDestroy() {
    window.removeEventListener("hashchange", this.checkRoute);
  },
  methods: {
    checkRoute() {
      const hash = window.location.hash;

      // 检查是否是分享链接
      if (hash.startsWith("#/share/")) {
        this.isShareMode = true;
        this.shareId = hash.replace("#/share/", "");
      } else {
        this.isShareMode = false;
        this.shareId = "";
      }
    },
  },
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
}

/* 编辑模式下隐藏滚动条 */
#app:not(.share-mode) {
  overflow: hidden;
}

body {
  margin: 0;
  padding: 0;
}
</style>
