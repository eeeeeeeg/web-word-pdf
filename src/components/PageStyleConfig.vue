<template>
  <div class="page-style-config-overlay" @click.self="$emit('close')">
    <div class="config-panel">
      <div class="panel-header">
        <h3>页面样式设置</h3>
        <div class="header-actions">
          <button class="close-btn" @click="$emit('close')">×</button>
        </div>
      </div>

      <div class="panel-content">
        <!-- 页面信息 -->
        <div class="config-section">
          <h4>页面信息</h4>
          <div class="form-group">
            <label>页面名称:</label>
            <input
              type="text"
              v-model="localPageStyle.name"
              placeholder="请输入页面名称"
            />
          </div>
        </div>

        <!-- 背景设置 -->
        <div class="config-section">
          <h4>背景设置</h4>
          <div class="form-group">
            <label>背景颜色:</label>
            <div class="color-input-group">
              <input
                type="color"
                v-model="localPageStyle.style.backgroundColor"
                class="color-picker"
              />
              <input
                type="text"
                v-model="localPageStyle.style.backgroundColor"
                placeholder="transparent"
                class="color-text"
              />
              <button
                class="btn btn-clear"
                @click="localPageStyle.style.backgroundColor = 'transparent'"
              >
                清除
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>背景图片:</label>
            <div class="image-upload-group">
              <input
                type="text"
                v-model="localPageStyle.style.backgroundImage"
                placeholder="请输入图片URL或点击上传"
                class="image-url-input"
              />
              <button class="btn btn-upload" @click="triggerImageUpload">
                上传图片
              </button>
              <input
                ref="imageInput"
                type="file"
                accept="image/*"
                @change="handleImageUpload"
                style="display: none"
              />
            </div>
          </div>

          <div class="form-group" v-if="localPageStyle.style.backgroundImage">
            <label>背景图片显示模式:</label>
            <select v-model="localPageStyle.style.backgroundSize">
              <option value="cover">覆盖 (Cover) - 保持纵横比，填满容器</option>
              <option value="contain">
                包含 (Contain) - 保持纵横比，完整显示
              </option>
              <option value="stretch">拉伸 (Stretch) - 拉伸填满容器</option>
            </select>
          </div>

          <div class="form-group" v-if="localPageStyle.style.backgroundImage">
            <label>背景图片位置:</label>
            <select v-model="localPageStyle.style.backgroundPosition">
              <option value="center">居中</option>
              <option value="top">顶部</option>
              <option value="bottom">底部</option>
              <option value="left">左侧</option>
              <option value="right">右侧</option>
              <option value="top left">左上角</option>
              <option value="top right">右上角</option>
              <option value="bottom left">左下角</option>
              <option value="bottom right">右下角</option>
            </select>
          </div>

          <div class="form-group" v-if="localPageStyle.style.backgroundImage">
            <label class="checkbox-label">
              <input
                type="checkbox"
                :checked="localPageStyle.style.backgroundRepeat === 'repeat'"
                @change="handleRepeatChange"
              />
              重复背景图片
            </label>
          </div>
        </div>

        <!-- 预览区域 -->
        <div class="config-section">
          <h4>预览</h4>
          <div class="preview-container">
            <div class="page-preview" :style="previewStyle">
              <div class="preview-content">
                <div class="preview-text">页面预览</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-footer">
        <button class="btn btn-cancel" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" @click="handleSave">保存</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "PageStyleConfig",
  props: {
    page: {
      type: Object,
      required: true,
    },
    pageConfig: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      localPageStyle: {
        name: "",
        style: {
          backgroundColor: "transparent",
          backgroundImage: "",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        },
      },
      updateTimer: null, // 防抖定时器
    };
  },
  computed: {
    previewStyle() {
      const style = this.localPageStyle.style;
      const previewStyle = {
        backgroundColor:
          style.backgroundColor !== "transparent"
            ? style.backgroundColor
            : "#ffffff",
        border: "1px solid #e0e0e0",
      };

      if (style.backgroundImage) {
        previewStyle.backgroundImage = `url(${style.backgroundImage})`;
        previewStyle.backgroundPosition = style.backgroundPosition;
        previewStyle.backgroundRepeat = style.backgroundRepeat;

        switch (style.backgroundSize) {
          case "cover":
            previewStyle.backgroundSize = "cover";
            break;
          case "contain":
            previewStyle.backgroundSize = "contain";
            break;
          case "stretch":
            previewStyle.backgroundSize = "100% 100%";
            break;
          default:
            previewStyle.backgroundSize = "cover";
        }
      }

      return previewStyle;
    },
  },

  watch: {
    // 监听样式变化，实时更新页面
    "localPageStyle.style": {
      handler(newStyle) {
        newStyle;
        // 实时更新页面样式
        this.updatePageStyleRealtime();
      },
      deep: true,
    },

    // 监听页面名称变化
    "localPageStyle.name"(newName) {
      newName;
      this.updatePageStyleRealtime();
    },
  },
  mounted() {
    // 初始化本地数据
    this.localPageStyle = {
      name: this.page.name || "",
      style: {
        backgroundColor: this.page.style?.backgroundColor || "transparent",
        backgroundImage: this.page.style?.backgroundImage || "",
        backgroundSize: this.page.style?.backgroundSize || "cover",
        backgroundPosition: this.page.style?.backgroundPosition || "center",
        backgroundRepeat: this.page.style?.backgroundRepeat || "no-repeat",
      },
    };
  },

  beforeDestroy() {
    // 清理定时器
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
  },
  methods: {
    // 实时更新页面样式
    updatePageStyleRealtime() {
      // 防抖处理，避免频繁更新
      if (this.updateTimer) {
        clearTimeout(this.updateTimer);
      }

      this.updateTimer = setTimeout(() => {
        const updatedPage = {
          ...this.page,
          name: this.localPageStyle.name,
          style: { ...this.localPageStyle.style },
          updatedAt: new Date().toISOString(),
        };

        // 发送实时更新事件
        this.$emit("update-realtime", updatedPage);
      }, 100); // 100ms防抖
    },

    handleRepeatChange(event) {
      this.localPageStyle.style.backgroundRepeat = event.target.checked
        ? "repeat"
        : "no-repeat";
    },

    triggerImageUpload() {
      this.$refs.imageInput.click();
    },

    async handleImageUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      try {
        // 这里可以实现图片上传逻辑
        // 暂时使用本地URL预览
        const reader = new FileReader();
        reader.onload = (e) => {
          this.localPageStyle.style.backgroundImage = e.target.result;
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error("图片上传失败:", error);
        alert("图片上传失败，请重试");
      }
    },

    handleSave() {
      const updatedPage = {
        ...this.page,
        name: this.localPageStyle.name,
        style: { ...this.localPageStyle.style },
        updatedAt: new Date().toISOString(),
      };

      this.$emit("update", updatedPage);
      this.$emit("close");
    },
  },
};
</script>

<style scoped>
.page-style-config-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.config-panel {
  background: white;
  border-radius: 8px;
  width: 600px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #666;
}

.panel-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.config-section {
  margin-bottom: 32px;
}

.config-section:last-child {
  margin-bottom: 0;
}

.config-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #555;
}

.form-group input[type="text"],
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.form-group input[type="text"]:focus,
.form-group select:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.color-input-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-picker {
  width: 50px;
  height: 40px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
}

.color-text {
  flex: 1;
}

.image-upload-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.image-url-input {
  flex: 1;
}

.btn {
  padding: 8px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: white;
  color: #333;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.btn-clear {
  background: #f5f5f5;
}

.btn-upload {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.btn-upload:hover {
  background: #40a9ff;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
}

.preview-container {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 16px;
  background: #f9f9f9;
}

.page-preview {
  width: 100%;
  height: 200px;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.preview-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.9);
  padding: 12px 20px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preview-text {
  font-size: 14px;
  color: #666;
  text-align: center;
}

.panel-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e0e0e0;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
  border-color: #d9d9d9;
}

.btn-primary {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.btn-primary:hover {
  background: #40a9ff;
  border-color: #40a9ff;
}
</style>
