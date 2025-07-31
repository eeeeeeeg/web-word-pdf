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
        </div>

        <!-- 文本组件属性 -->
        <div v-if="component.type === 'text'" class="property-section">
          <h5>富文本编辑器</h5>
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
  watch: {
    component: {
      handler(newComponent) {
        if (newComponent) {
          this.localComponent = JSON.parse(JSON.stringify(newComponent));
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
</style>
