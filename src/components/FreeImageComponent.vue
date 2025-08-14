<template>
  <TransformController
    :component="component"
    :selected="selected"
    :mode="mode"
    @select="$emit('select', $event)"
    @update="$emit('update', $event)"
    @delete="$emit('delete', $event)"
    @edit="handleEdit"
    @copy="$emit('copy', $event)"
  >
    <div class="free-image-component" :style="imageContainerStyle">
      <!-- 显示上传的图片 -->
      <img
        v-if="component.src && !component.uploading && !component.uploadError"
        :src="component.src"
        :alt="component.alt"
        :style="imageStyle"
        @load="handleImageLoad"
        @error="handleImageError"
        @click="handleImageClick"
      />

      <!-- 上传中状态 -->
      <div v-else-if="component.uploading" class="image-uploading">
        <div class="uploading-spinner">⏳</div>
        <div class="uploading-text">上传中...</div>
      </div>

      <!-- 上传错误状态 -->
      <div
        v-else-if="component.uploadError"
        class="image-error"
        @click="handleImageUpload"
      >
        <div class="error-icon">❌</div>
        <div class="error-text">{{ component.uploadError }}</div>
        <div class="retry-text">点击重试</div>
        <input
          ref="imageInput"
          type="file"
          accept="image/*"
          style="display: none"
          @change="handleImageChange"
        />
      </div>

      <!-- 默认上传占位符 -->
      <div v-else class="image-placeholder" @click="handleImageUpload">
        <div class="placeholder-icon">🖼️</div>
        <div class="placeholder-text">点击上传图片</div>
        <div class="placeholder-hint">支持 JPG、PNG、GIF 格式，最大 5MB</div>
        <input
          ref="imageInput"
          type="file"
          accept="image/*"
          style="display: none"
          @change="handleImageChange"
        />
      </div>
    </div>
  </TransformController>
</template>

<script>
import TransformController from "./TransformController.vue";

export default {
  name: "FreeImageComponent",
  components: {
    TransformController,
  },
  props: {
    component: {
      type: Object,
      required: true,
    },
    selected: {
      type: Boolean,
      default: false,
    },
    mode: {
      type: String,
      default: "edit",
    },
  },
  computed: {
    imageContainerStyle() {
      return {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: this.component.style?.backgroundColor || "transparent",
        borderRadius: `${this.component.style?.borderRadius || 0}px`,
        overflow: "hidden",
      };
    },
    imageStyle() {
      const style = this.component.style || {};

      return {
        maxWidth: "100%",
        maxHeight: "100%",
        objectFit: style.objectFit || "cover",
        borderRadius: `${style.borderRadius || 0}px`,
        border: style.border || "none",
        width: this.component.keepAspectRatio ? "auto" : "100%",
        height: this.component.keepAspectRatio ? "auto" : "100%",
      };
    },
  },
  watch: {
    component: {
      handler() {
        // 强制更新组件以确保样式变化立即生效
        this.$forceUpdate();
      },
      deep: true,
      immediate: true,
    },
  },
  methods: {
    handleImageClick(event) {
      if (this.mode === "edit") {
        event.stopPropagation();
        this.$emit("select", this.component);
      }
    },

    // 处理编辑事件（双击触发）
    handleEdit() {
      // 对于图片组件，双击触发上传图片
      this.handleImageUpload();
    },

    handleImageUpload() {
      if (this.mode !== "edit") return;
      this.$refs.imageInput?.click();
    },

    handleImageChange(event) {
      const file = event.target.files[0];
      if (!file) return;

      // 验证文件类型
      if (!file.type.startsWith("image/")) {
        alert("请选择图片文件");
        return;
      }

      // 验证文件大小（5MB）
      if (file.size > 5 * 1024 * 1024) {
        alert("图片大小不能超过 5MB");
        return;
      }

      // 设置上传状态
      const uploadingComponent = {
        ...this.component,
        uploading: true,
        uploadError: null,
      };
      this.$emit("update", uploadingComponent);

      // 读取文件
      const reader = new FileReader();
      reader.onload = (e) => {
        // 上传成功
        const successComponent = {
          ...this.component,
          src: e.target.result,
          uploading: false,
          uploadError: null,
        };
        this.$emit("update", successComponent);
      };

      reader.onerror = () => {
        // 上传失败
        const errorComponent = {
          ...this.component,
          uploading: false,
          uploadError: "图片上传失败，请重试",
        };
        this.$emit("update", errorComponent);
      };

      reader.readAsDataURL(file);
    },

    handleImageLoad() {
      // 图片加载完成后可以进行一些处理
      this.$emit("update", this.component);
    },

    handleImageError() {
      console.error("Failed to load image:", this.component.src);
      const errorComponent = {
        ...this.component,
        uploadError: "图片加载失败",
      };
      this.$emit("update", errorComponent);
    },
  },
};
</script>

<style scoped>
.free-image-component {
  width: 100%;
  height: 100%;
  position: relative;
}

.image-uploading,
.image-error,
.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: #f8f9fa;
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.image-placeholder:hover,
.image-error:hover {
  background-color: #e9ecef;
  border-color: #adb5bd;
}

.placeholder-icon,
.error-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.uploading-spinner {
  font-size: 48px;
  margin-bottom: 12px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.placeholder-text,
.error-text,
.uploading-text {
  font-size: 16px;
  font-weight: 500;
  color: #495057;
  margin-bottom: 8px;
}

.placeholder-hint,
.retry-text {
  font-size: 12px;
  color: #6c757d;
}

.retry-text {
  margin-top: 8px;
  text-decoration: underline;
}

/* 预览模式下禁用交互 */
.free-image-component[data-mode="preview"] .image-placeholder,
.free-image-component[data-mode="preview"] .image-error {
  cursor: default;
  pointer-events: none;
}
</style>
