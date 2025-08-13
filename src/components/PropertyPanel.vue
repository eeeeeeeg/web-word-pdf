<template>
  <div class="property-panel">
    <div class="panel-header">
      <h3>属性面板</h3>
      <button
        class="global-config-btn"
        @click="$emit('show-global-config')"
        title="全局配置"
      >
        ⚙️
      </button>
    </div>

    <div class="panel-content">
      <!-- 未选中组件时的提示 -->
      <div v-if="!component" class="no-selection">
        <div class="no-selection-icon">👆</div>
        <div class="no-selection-text">选择一个组件来编辑其属性</div>
        <button class="btn btn-primary" @click="$emit('show-global-config')">
          全局页面配置
        </button>
      </div>

      <!-- 组件属性编辑 -->
      <div v-else class="component-properties">
        <div class="property-section">
          <h4>{{ getComponentTypeName(component.type) }}</h4>
          <div class="component-id">ID: {{ component.id }}</div>
        </div>

        <!-- 布局组件属性 -->
        <div v-if="component.type === 'layout'" class="property-section">
          <h5>布局设置</h5>
          <div class="form-group">
            <label>对齐方式:</label>
            <select
              v-model="localComponent.alignment"
              @change="updateComponent"
            >
              <option value="flex-start">左对齐</option>
              <option value="center">居中</option>
              <option value="flex-end">右对齐</option>
            </select>
          </div>

          <div class="form-group">
            <label>列宽设置:</label>
            <div
              v-for="(column, index) in localComponent.columns"
              :key="index"
              class="column-width-item"
            >
              <span>第{{ index + 1 }}列:</span>
              <input
                type="number"
                v-model.number="column.width"
                @input="updateColumnWidths"
                min="5"
                max="95"
                step="0.1"
              />
              <span>%</span>
            </div>
          </div>

          <!-- 布局组件背景色设置 -->
          <div class="form-group">
            <label>背景色:</label>
            <div class="background-color-controls">
              <!-- 透明/有色切换 -->
              <div class="color-mode-toggle">
                <label class="radio-label">
                  <input
                    type="radio"
                    :value="true"
                    :checked="isLayoutBackgroundTransparent"
                    @change="setLayoutBackgroundTransparent(true)"
                  />
                  透明
                </label>
                <label class="radio-label">
                  <input
                    type="radio"
                    :value="false"
                    :checked="!isLayoutBackgroundTransparent"
                    @change="setLayoutBackgroundTransparent(false)"
                  />
                  有色
                </label>
              </div>

              <!-- 颜色选择器（仅在非透明时显示） -->
              <div
                v-if="!isLayoutBackgroundTransparent"
                class="color-input-group"
              >
                <input
                  type="color"
                  :value="layoutBackgroundColorValue"
                  @input="updateLayoutBackgroundColor"
                  class="color-picker"
                />
                <input
                  type="text"
                  :value="layoutBackgroundColorValue"
                  @input="updateLayoutBackgroundColorText"
                  placeholder="#ffffff"
                  class="color-text"
                />
              </div>

              <!-- 透明度预览 -->
              <div
                class="background-preview"
                :style="layoutBackgroundPreviewStyle"
              >
                <span class="preview-text">预览</span>
              </div>
            </div>
          </div>

          <!-- 圆角设置 -->
          <div class="form-group">
            <label>圆角:</label>
            <input
              type="number"
              v-model.number="localComponent.style.borderRadius"
              @input="updateComponent"
              min="0"
              max="50"
            />
            <span class="unit">px</span>
          </div>
        </div>

        <!-- 文本组件属性 -->
        <div v-if="component.type === 'text'" class="property-section">
          <h5>文本样式</h5>

          <!-- 背景色设置 -->
          <div class="form-group">
            <label>背景色:</label>
            <div class="background-color-controls">
              <!-- 透明/有色切换 -->
              <div class="color-mode-toggle">
                <label class="radio-label">
                  <input
                    type="radio"
                    :value="true"
                    :checked="isBackgroundTransparent"
                    @change="setBackgroundTransparent(true)"
                  />
                  透明
                </label>
                <label class="radio-label">
                  <input
                    type="radio"
                    :value="false"
                    :checked="!isBackgroundTransparent"
                    @change="setBackgroundTransparent(false)"
                  />
                  有色
                </label>
              </div>

              <!-- 颜色选择器（仅在非透明时显示） -->
              <div v-if="!isBackgroundTransparent" class="color-input-group">
                <input
                  type="color"
                  :value="backgroundColorValue"
                  @input="updateBackgroundColor"
                  class="color-picker"
                />
                <input
                  type="text"
                  :value="backgroundColorValue"
                  @input="updateBackgroundColorText"
                  placeholder="#ffffff"
                  class="color-text"
                />
              </div>

              <!-- 透明度预览 -->
              <div class="background-preview" :style="backgroundPreviewStyle">
                <span class="preview-text">预览</span>
              </div>
            </div>
          </div>

          <!-- 内边距设置 -->
          <div class="form-group">
            <label>内边距:</label>
            <div class="spacing-controls">
              <div class="spacing-row">
                <label class="spacing-label">上:</label>
                <input
                  type="number"
                  v-model.number="localComponent.style.padding.top"
                  @input="updateComponent"
                  min="0"
                  max="100"
                  class="spacing-input"
                />
              </div>
              <div class="spacing-row">
                <label class="spacing-label">下:</label>
                <input
                  type="number"
                  v-model.number="localComponent.style.padding.bottom"
                  @input="updateComponent"
                  min="0"
                  max="100"
                  class="spacing-input"
                />
              </div>
              <div class="spacing-row">
                <label class="spacing-label">左:</label>
                <input
                  type="number"
                  v-model.number="localComponent.style.padding.left"
                  @input="updateComponent"
                  min="0"
                  max="100"
                  class="spacing-input"
                />
              </div>
              <div class="spacing-row">
                <label class="spacing-label">右:</label>
                <input
                  type="number"
                  v-model.number="localComponent.style.padding.right"
                  @input="updateComponent"
                  min="0"
                  max="100"
                  class="spacing-input"
                />
              </div>
            </div>
          </div>

          <!-- 圆角设置 -->
          <div class="form-group">
            <label>圆角:</label>
            <input
              type="number"
              v-model.number="localComponent.style.borderRadius"
              @input="updateComponent"
              min="0"
              max="50"
              placeholder="0"
            />
            <span class="unit">px</span>
          </div>

          <div class="form-group">
            <label>使用说明:</label>
            <p class="help-text">
              双击文本组件进入编辑模式，使用富文本编辑器工具栏设置文字样式、颜色、对齐方式等。
              支持粗体、斜体、下划线、字体大小、颜色、列表等丰富的格式设置。
            </p>
          </div>
        </div>

        <!-- 图片组件属性 -->
        <div v-if="component.type === 'image'" class="property-section">
          <h5>图片设置</h5>
          <div class="form-row">
            <div class="form-group">
              <label>宽度:</label>
              <input
                type="number"
                v-model.number="localComponent.style.width"
                @input="updateComponent"
                min="10"
                max="1000"
              />
            </div>
            <div class="form-group">
              <label>高度:</label>
              <input
                type="number"
                v-model.number="localComponent.style.height"
                @input="updateComponent"
                min="10"
                max="1000"
                :disabled="localComponent.keepAspectRatio"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="localComponent.keepAspectRatio"
                @change="updateComponent"
              />
              保持纵横比
            </label>
          </div>

          <div class="form-group">
            <label>圆角:</label>
            <input
              type="number"
              v-model.number="localComponent.style.borderRadius"
              @input="updateComponent"
              min="0"
              max="50"
            />
          </div>

          <div class="form-group">
            <label>适应方式:</label>
            <select
              v-model="localComponent.style.objectFit"
              @change="updateComponent"
            >
              <option value="cover">覆盖</option>
              <option value="contain">包含</option>
              <option value="fill">填充</option>
              <option value="scale-down">缩小</option>
            </select>
          </div>

          <div class="form-group">
            <label>对齐方式:</label>
            <select
              v-model="localComponent.alignment"
              @change="updateComponent"
            >
              <option value="left">居左</option>
              <option value="center">居中</option>
              <option value="right">居右</option>
            </select>
          </div>
        </div>

        <!-- 通用样式属性 -->
        <div class="property-section">
          <h5>间距设置</h5>
          <div class="spacing-group">
            <label>外边距 (px):</label>
            <div class="spacing-grid">
              <input
                type="number"
                v-model.number="localComponent.style.margin.top"
                @input="updateComponent"
                placeholder="上"
              />
              <input
                type="number"
                v-model.number="localComponent.style.margin.right"
                @input="updateComponent"
                placeholder="右"
              />
              <input
                type="number"
                v-model.number="localComponent.style.margin.bottom"
                @input="updateComponent"
                placeholder="下"
              />
              <input
                type="number"
                v-model.number="localComponent.style.margin.left"
                @input="updateComponent"
                placeholder="左"
              />
            </div>
          </div>

          <div class="spacing-group">
            <label>内边距 (px):</label>
            <div class="spacing-grid">
              <input
                type="number"
                v-model.number="localComponent.style.padding.top"
                @input="updateComponent"
                placeholder="上"
              />
              <input
                type="number"
                v-model.number="localComponent.style.padding.right"
                @input="updateComponent"
                placeholder="右"
              />
              <input
                type="number"
                v-model.number="localComponent.style.padding.bottom"
                @input="updateComponent"
                placeholder="下"
              />
              <input
                type="number"
                v-model.number="localComponent.style.padding.left"
                @input="updateComponent"
                placeholder="左"
              />
            </div>
          </div>
        </div>

        <!-- 删除组件 -->
        <div class="property-section">
          <button class="btn btn-danger" @click="deleteComponent">
            删除组件
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "PropertyPanel",
  props: {
    component: {
      type: Object,
      default: null,
    },
    pageConfig: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      localComponent: null,
    };
  },
  computed: {
    isBackgroundTransparent() {
      if (!this.localComponent || !this.localComponent.style) return true;
      const bg = this.localComponent.style.backgroundColor;
      return (
        !bg ||
        bg === "transparent" ||
        bg === "rgba(0,0,0,0)" ||
        bg === "rgba(0, 0, 0, 0)"
      );
    },

    backgroundColorValue() {
      if (!this.localComponent || !this.localComponent.style) return "#ffffff";
      const bg = this.localComponent.style.backgroundColor;
      if (
        !bg ||
        bg === "transparent" ||
        bg.includes("rgba(0,0,0,0)") ||
        bg.includes("rgba(0, 0, 0, 0)")
      ) {
        return "#ffffff";
      }
      return bg;
    },

    backgroundPreviewStyle() {
      if (!this.localComponent || !this.localComponent.style) return {};
      return {
        backgroundColor:
          this.localComponent.style.backgroundColor || "transparent",
        border: "1px solid #ddd",
        borderRadius: "4px",
        padding: "4px 8px",
        fontSize: "12px",
        color: this.isBackgroundTransparent ? "#666" : "#333",
        backgroundImage: this.isBackgroundTransparent
          ? "linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)"
          : "none",
        backgroundSize: this.isBackgroundTransparent ? "8px 8px" : "auto",
        backgroundPosition: this.isBackgroundTransparent
          ? "0 0, 0 4px, 4px -4px, -4px 0px"
          : "auto",
      };
    },

    // 布局组件背景色相关计算属性
    isLayoutBackgroundTransparent() {
      if (!this.localComponent || !this.localComponent.style) return true;
      const bg = this.localComponent.style.backgroundColor;
      return (
        !bg ||
        bg === "transparent" ||
        bg === "rgba(0,0,0,0)" ||
        bg === "rgba(0, 0, 0, 0)"
      );
    },

    layoutBackgroundColorValue() {
      if (!this.localComponent || !this.localComponent.style) return "#ffffff";
      const bg = this.localComponent.style.backgroundColor;
      if (
        !bg ||
        bg === "transparent" ||
        bg.includes("rgba(0,0,0,0)") ||
        bg.includes("rgba(0, 0, 0, 0)")
      ) {
        return "#ffffff";
      }
      return bg;
    },

    layoutBackgroundPreviewStyle() {
      if (!this.localComponent || !this.localComponent.style) return {};
      return {
        backgroundColor:
          this.localComponent.style.backgroundColor || "transparent",
        border: "1px solid #ddd",
        borderRadius: "4px",
        padding: "4px 8px",
        fontSize: "12px",
        color: this.isLayoutBackgroundTransparent ? "#666" : "#333",
        backgroundImage: this.isLayoutBackgroundTransparent
          ? "linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)"
          : "none",
        backgroundSize: this.isLayoutBackgroundTransparent ? "8px 8px" : "auto",
        backgroundPosition: this.isLayoutBackgroundTransparent
          ? "0 0, 0 4px, 4px -4px, -4px 0px"
          : "auto",
      };
    },
  },
  watch: {
    component: {
      handler(newComponent) {
        console.log("PropertyPanel 接收到组件:", newComponent);
        if (newComponent) {
          this.localComponent = JSON.parse(JSON.stringify(newComponent));
          // 确保组件有完整的样式属性
          if (this.localComponent.type === "text") {
            this.ensureTextComponentStyles();
          } else if (this.localComponent.type === "layout") {
            this.ensureLayoutComponentStyles();
          }
        } else {
          this.localComponent = null;
        }
      },
      immediate: true,
      deep: true,
    },
  },
  methods: {
    getComponentTypeName(type) {
      const typeNames = {
        layout: "布局组件",
        text: "文本组件",
        image: "图片组件",
      };
      return typeNames[type] || "未知组件";
    },

    updateComponent() {
      if (this.localComponent) {
        this.$emit("update", this.localComponent);
      }
    },

    clearBackgroundColor() {
      if (this.localComponent && this.localComponent.style) {
        this.localComponent.style.backgroundColor = "transparent";
        this.updateComponent();
      }
    },

    setBackgroundTransparent(isTransparent) {
      if (!this.localComponent || !this.localComponent.style) return;

      if (isTransparent) {
        this.localComponent.style.backgroundColor = "transparent";
      } else {
        // 如果当前是透明的，设置为白色
        if (this.isBackgroundTransparent) {
          this.localComponent.style.backgroundColor = "#ffffff";
        }
      }
      this.updateComponent();
    },

    updateBackgroundColor(event) {
      if (!this.localComponent || !this.localComponent.style) return;
      this.localComponent.style.backgroundColor = event.target.value;
      this.updateComponent();
    },

    updateBackgroundColorText(event) {
      if (!this.localComponent || !this.localComponent.style) return;
      const value = event.target.value.trim();
      if (value) {
        this.localComponent.style.backgroundColor = value;
        this.updateComponent();
      }
    },

    // 布局组件背景色处理方法
    setLayoutBackgroundTransparent(isTransparent) {
      if (!this.localComponent || !this.localComponent.style) return;

      if (isTransparent) {
        this.localComponent.style.backgroundColor = "transparent";
      } else {
        // 如果当前是透明的，设置为白色
        if (this.isLayoutBackgroundTransparent) {
          this.localComponent.style.backgroundColor = "#ffffff";
        }
      }
      this.updateComponent();
    },

    updateLayoutBackgroundColor(event) {
      if (!this.localComponent || !this.localComponent.style) return;
      this.localComponent.style.backgroundColor = event.target.value;
      this.updateComponent();
    },

    updateLayoutBackgroundColorText(event) {
      if (!this.localComponent || !this.localComponent.style) return;
      const value = event.target.value.trim();
      if (value) {
        this.localComponent.style.backgroundColor = value;
        this.updateComponent();
      }
    },

    ensureTextComponentStyles() {
      if (!this.localComponent || this.localComponent.type !== "text") return;

      // 确保样式对象存在
      if (!this.localComponent.style) {
        this.localComponent.style = {};
      }

      const style = this.localComponent.style;

      // 确保背景色属性存在
      if (style.backgroundColor === undefined) {
        style.backgroundColor = "transparent";
      }

      // 确保圆角属性存在
      if (style.borderRadius === undefined) {
        style.borderRadius = 0;
      }

      // 确保内边距属性存在
      if (!style.padding) {
        style.padding = { top: 8, bottom: 8, left: 8, right: 8 };
      } else {
        // 确保内边距的所有方向都存在
        if (style.padding.top === undefined) style.padding.top = 8;
        if (style.padding.bottom === undefined) style.padding.bottom = 8;
        if (style.padding.left === undefined) style.padding.left = 8;
        if (style.padding.right === undefined) style.padding.right = 8;
      }

      // 确保外边距属性存在
      if (!style.margin) {
        style.margin = { top: 0, bottom: 0, left: 0, right: 0 };
      }
    },

    ensureLayoutComponentStyles() {
      if (!this.localComponent || this.localComponent.type !== "layout") return;

      // 确保样式对象存在
      if (!this.localComponent.style) {
        this.localComponent.style = {};
      }

      const style = this.localComponent.style;

      // 确保背景色属性存在
      if (style.backgroundColor === undefined) {
        style.backgroundColor = "transparent";
      }

      // 确保圆角属性存在
      if (style.borderRadius === undefined) {
        style.borderRadius = 0;
      }

      // 确保内边距属性存在
      if (!style.padding) {
        style.padding = { top: 8, bottom: 8, left: 8, right: 8 };
      } else {
        // 确保内边距的所有方向都存在
        if (style.padding.top === undefined) style.padding.top = 8;
        if (style.padding.bottom === undefined) style.padding.bottom = 8;
        if (style.padding.left === undefined) style.padding.left = 8;
        if (style.padding.right === undefined) style.padding.right = 8;
      }

      // 确保外边距属性存在
      if (!style.margin) {
        style.margin = { top: 0, bottom: 0, left: 0, right: 0 };
      }
    },

    updateColumnWidths() {
      // 确保列宽总和为100%
      const total = this.localComponent.columns.reduce(
        (sum, col) => sum + col.width,
        0
      );
      if (total !== 100) {
        const diff = 100 - total;
        const lastColumn =
          this.localComponent.columns[this.localComponent.columns.length - 1];
        lastColumn.width = Math.max(5, lastColumn.width + diff);
      }
      this.updateComponent();
    },

    toggleFontWeight() {
      this.localComponent.style.fontWeight =
        this.localComponent.style.fontWeight === "bold" ? "normal" : "bold";
      this.updateComponent();
    },

    toggleFontStyle() {
      this.localComponent.style.fontStyle =
        this.localComponent.style.fontStyle === "italic" ? "normal" : "italic";
      this.updateComponent();
    },

    toggleTextDecoration() {
      this.localComponent.style.textDecoration =
        this.localComponent.style.textDecoration === "underline"
          ? "none"
          : "underline";
      this.updateComponent();
    },

    deleteComponent() {
      if (confirm("确定要删除这个组件吗？")) {
        this.$emit("update", { ...this.localComponent, _delete: true });
      }
    },
  },
};
</script>

<style scoped>
.property-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.global-config-btn {
  background: none;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 16px;
}

.global-config-btn:hover {
  background: #f0f0f0;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
  color: #999;
}

.no-selection-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-selection-text {
  margin-bottom: 20px;
  font-size: 14px;
}

.property-section {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.property-section:last-child {
  border-bottom: none;
}

.property-section h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #333;
}

.property-section h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.component-id {
  font-size: 12px;
  color: #999;
  font-family: monospace;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  font-size: 12px;
}

.form-row {
  display: flex;
  gap: 8px;
}

.form-row .form-group {
  flex: 1;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  cursor: pointer;
}

.checkbox-label input {
  width: auto !important;
  margin-right: 6px;
}

.column-width-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
}

.column-width-item input {
  flex: 1;
  width: auto;
}

.style-buttons {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.style-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #d0d0d0;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.style-btn:hover {
  background: #f0f0f0;
}

.style-btn.active {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.spacing-group {
  margin-bottom: 16px;
}

.spacing-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-top: 4px;
}

.spacing-grid input {
  font-size: 11px;
  padding: 4px 6px;
}

.btn {
  padding: 8px 16px;
  border: 1px solid #d0d0d0;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  width: 100%;
}

.btn-primary {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.btn-primary:hover {
  background: #40a9ff;
}

.btn-danger {
  background: #ff4d4f;
  color: white;
  border-color: #ff4d4f;
}

.btn-danger:hover {
  background: #ff7875;
}

/* 背景色控件样式 */
.background-color-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.color-mode-toggle {
  display: flex;
  gap: 16px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  cursor: pointer;
}

.radio-label input[type="radio"] {
  margin: 0;
}

/* 颜色输入组样式 */
.color-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.background-preview {
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
}

.color-picker {
  width: 40px;
  height: 32px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
}

.color-text {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
}

.btn-clear {
  width: 32px;
  height: 32px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f5f5f5;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.2s;
}

.btn-clear:hover {
  background: #e8e8e8;
  color: #333;
}

/* 间距控件样式 */
.spacing-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.spacing-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.spacing-label {
  font-size: 12px;
  color: #666;
  min-width: 20px;
}

.spacing-input {
  width: 50px;
  padding: 4px 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
}

.unit {
  font-size: 12px;
  color: #666;
  margin-left: 4px;
}
</style>
