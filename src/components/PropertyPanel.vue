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
            <label>水平对齐:</label>
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
            <label>垂直对齐:</label>
            <select
              v-model="localComponent.verticalAlignment"
              @change="updateComponent"
            >
              <option value="stretch">拉伸</option>
              <option value="flex-start">顶部对齐</option>
              <option value="center">垂直居中</option>
              <option value="flex-end">底部对齐</option>
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
                  :value="localComponent.style?.padding?.top || 0"
                  @input="updatePadding('top', $event.target.value)"
                  min="0"
                  max="100"
                  class="spacing-input"
                />
              </div>
              <div class="spacing-row">
                <label class="spacing-label">下:</label>
                <input
                  type="number"
                  :value="localComponent.style?.padding?.bottom || 0"
                  @input="updatePadding('bottom', $event.target.value)"
                  min="0"
                  max="100"
                  class="spacing-input"
                />
              </div>
              <div class="spacing-row">
                <label class="spacing-label">左:</label>
                <input
                  type="number"
                  :value="localComponent.style?.padding?.left || 0"
                  @input="updatePadding('left', $event.target.value)"
                  min="0"
                  max="100"
                  class="spacing-input"
                />
              </div>
              <div class="spacing-row">
                <label class="spacing-label">右:</label>
                <input
                  type="number"
                  :value="localComponent.style?.padding?.right || 0"
                  @input="updatePadding('right', $event.target.value)"
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

        <!-- 自由组件属性 -->
        <div
          v-if="
            component.type === 'free-text' || component.type === 'free-image'
          "
          class="property-section"
        >
          <!-- 排列控制 -->
          <div class="free-component-tabs">
            <button
              :class="['tab-btn', { active: activeTab === 'arrange' }]"
              @click="activeTab = 'arrange'"
            >
              排列
            </button>
            <button
              :class="['tab-btn', { active: activeTab === 'layer' }]"
              @click="activeTab = 'layer'"
            >
              图层
            </button>
          </div>

          <!-- 排列面板 -->
          <div v-if="activeTab === 'arrange'" class="tab-content">
            <h5>排列</h5>
            <div class="arrange-controls">
              <div class="arrange-row">
                <button
                  class="arrange-btn"
                  @click="handleArrange('move-forward')"
                  title="前移"
                >
                  <span class="arrange-icon">↗️</span>
                  前移
                </button>
                <button
                  class="arrange-btn"
                  @click="handleArrange('move-backward')"
                  title="后移"
                >
                  <span class="arrange-icon">↙️</span>
                  后移
                </button>
              </div>
              <div class="arrange-row">
                <button
                  class="arrange-btn"
                  @click="handleArrange('bring-to-front')"
                  title="移至最前"
                >
                  <span class="arrange-icon">⬆️</span>
                  移至最前
                </button>
                <button
                  class="arrange-btn"
                  @click="handleArrange('send-to-back')"
                  title="移至最后"
                >
                  <span class="arrange-icon">⬇️</span>
                  移至最后
                </button>
              </div>
            </div>

            <h5>页面对齐</h5>
            <div class="align-controls">
              <div class="align-row">
                <button
                  class="align-btn"
                  @click="handleAlign('top-left')"
                  title="顶部对齐"
                >
                  <span class="align-icon">📄</span>
                  顶部对齐
                </button>
                <button
                  class="align-btn"
                  @click="handleAlign('left')"
                  title="左对齐"
                >
                  <span class="align-icon">📄</span>
                  左对齐
                </button>
              </div>
              <div class="align-row">
                <button
                  class="align-btn"
                  @click="handleAlign('center-vertical')"
                  title="垂直居中对齐"
                >
                  <span class="align-icon">🎯</span>
                  垂直居中对齐
                </button>
                <button
                  class="align-btn"
                  @click="handleAlign('center-horizontal')"
                  title="水平居中对齐"
                >
                  <span class="align-icon">🎯</span>
                  水平居中对齐
                </button>
              </div>
              <div class="align-row">
                <button
                  class="align-btn"
                  @click="handleAlign('bottom')"
                  title="底部对齐"
                >
                  <span class="align-icon">📄</span>
                  底部对齐
                </button>
                <button
                  class="align-btn"
                  @click="handleAlign('right')"
                  title="右对齐"
                >
                  <span class="align-icon">📄</span>
                  右对齐
                </button>
              </div>
            </div>
          </div>

          <!-- 图层面板 -->
          <div v-if="activeTab === 'layer'" class="tab-content">
            <h5>图层</h5>

            <!-- 图层操作按钮 -->
            <div class="layer-actions">
              <button class="layer-action-btn active">全部</button>
              <button class="layer-action-btn">重叠</button>
            </div>

            <!-- 图层列表 -->
            <div class="layer-list" v-if="currentPageFreeComponents.length > 0">
              <div
                v-for="(component, index) in currentPageFreeComponents"
                :key="component.id"
                class="layer-item"
                :class="{
                  selected:
                    component.id === (localComponent && localComponent.id),
                  dragging: draggedLayerIndex === index,
                }"
                draggable="true"
                @dragstart="handleLayerDragStart(index, $event)"
                @dragover="handleLayerDragOver(index, $event)"
                @drop="handleLayerDrop(index, $event)"
                @dragend="handleLayerDragEnd"
                @click="selectComponent(component)"
              >
                <!-- 拖拽手柄 -->
                <div class="layer-drag-handle">
                  <svg width="12" height="12" viewBox="0 0 12 12">
                    <circle cx="3" cy="3" r="1" fill="#999" />
                    <circle cx="9" cy="3" r="1" fill="#999" />
                    <circle cx="3" cy="6" r="1" fill="#999" />
                    <circle cx="9" cy="6" r="1" fill="#999" />
                    <circle cx="3" cy="9" r="1" fill="#999" />
                    <circle cx="9" cy="9" r="1" fill="#999" />
                  </svg>
                </div>

                <!-- 组件预览 -->
                <div class="layer-preview">
                  <div
                    class="layer-preview-content"
                    :style="getLayerPreviewStyle(component)"
                  >
                    <span
                      v-if="component.type === 'free-text'"
                      class="layer-preview-text"
                    >
                      {{ getComponentPreviewText(component) }}
                    </span>
                    <img
                      v-else-if="component.type === 'free-image'"
                      :src="component.src"
                      class="layer-preview-image"
                      @error="handleImageError"
                    />
                  </div>
                </div>

                <!-- 层级信息 -->
                <div class="layer-info-text">
                  <div class="layer-type">
                    {{ getComponentTypeName(component.type) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-else class="layer-empty">
              <div class="layer-empty-icon">📄</div>
              <div class="layer-empty-text">当前页面没有自由组件</div>
              <div class="layer-empty-hint">拖拽文字或图片组件到页面上</div>
            </div>
          </div>

          <!-- 高级设置 -->
          <h5>高级</h5>
          <div class="advanced-controls">
            <div class="form-row">
              <div class="form-group">
                <label>宽度:</label>
                <input
                  type="number"
                  :value="localComponent.style?.width || 200"
                  @input="updateDimensionPixels('width', $event.target.value)"
                  min="1"
                  step="1"
                />
                <span class="unit">像素</span>
              </div>
              <div class="form-group">
                <label>高度:</label>
                <input
                  type="number"
                  :value="localComponent.style?.height || 100"
                  @input="updateDimensionPixels('height', $event.target.value)"
                  min="1"
                  step="1"
                />
                <span class="unit">像素</span>
              </div>
              <div class="form-group">
                <label>比例:</label>
                <div class="ratio-control">
                  <span class="ratio-value">{{ getRatioDisplay() }}</span>
                  <button
                    class="lock-btn"
                    @click="toggleAspectRatio"
                    :class="{ locked: localComponent?.keepAspectRatio }"
                  >
                    {{ localComponent?.keepAspectRatio ? "🔒" : "🔓" }}
                  </button>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>X:</label>
                <input
                  type="number"
                  :value="localComponent.transform?.x || 50"
                  @input="updateTransformPosition('x', $event.target.value)"
                  step="1"
                />
                <span class="unit">像素</span>
              </div>
              <div class="form-group">
                <label>Y:</label>
                <input
                  type="number"
                  :value="localComponent.transform?.y || 50"
                  @input="updateTransformPosition('y', $event.target.value)"
                  step="1"
                />
                <span class="unit">像素</span>
              </div>
              <div class="form-group">
                <label>旋转:</label>
                <input
                  type="number"
                  :value="localComponent.transform?.rotation || 0"
                  @input="updateTransformRotation($event.target.value)"
                  min="0"
                  max="360"
                  step="1"
                />
                <span class="unit">°</span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>层级:</label>
                <input
                  type="number"
                  :value="localComponent.zIndex || 1"
                  @input="updateZIndex($event.target.value)"
                  min="1"
                  max="999"
                  step="1"
                />
                <span class="unit">级</span>
              </div>
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
import {
  validatePageSizeConsistency,
  formatDimension,
  pixelsToUnit,
  calculateAvailableContentWidth,
  calculateAvailableContentHeight,
  calculatePageMargins,
  calculateHeaderHeight,
  calculateFooterHeight,
} from "../utils/pageCalculator.js";

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
    schema: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      localComponent: null,
      activeTab: "arrange", // 自由组件属性面板的当前标签页
      draggedLayerIndex: null, // 当前拖拽的图层索引
      dragOverIndex: null, // 拖拽悬停的目标索引
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

    // 页面尺寸验证
    sizeValidation() {
      if (!this.pageConfig) return null;
      return validatePageSizeConsistency(this.pageConfig);
    },

    // 当前页面像素尺寸
    currentPageWidthPx() {
      if (!this.pageConfig) return 0;
      const size = this.pageConfig.pageSize;
      return size.unit === "mm" ? size.width * 3.7795275591 : size.width;
    },

    currentPageHeightPx() {
      if (!this.pageConfig) return 0;
      const size = this.pageConfig.pageSize;
      return size.unit === "mm" ? size.height * 3.7795275591 : size.height;
    },

    // 当前页面的自由组件列表，按z-index排序
    currentPageFreeComponents() {
      if (!this.schema || !this.schema.pages) return [];

      const currentPageIndex = this.schema.currentPageIndex || 0;
      const currentPage = this.schema.pages[currentPageIndex];

      if (!currentPage || !currentPage.components) return [];

      // 筛选出自由组件
      const freeComponents = currentPage.components.filter(
        (comp) => comp.type === "free-text" || comp.type === "free-image"
      );

      // 按z-index降序排序（最高层级在前）
      return freeComponents.sort((a, b) => {
        const aZIndex = a.zIndex || 1;
        const bZIndex = b.zIndex || 1;
        return bZIndex - aZIndex;
      });
    },

    // 当前页面索引
    currentPageIndex() {
      return this.schema ? this.schema.currentPageIndex || 0 : 0;
    },
  },
  methods: {
    // 导入的工具函数
    formatDimension,
    pixelsToUnit,

    updateRotation(value) {
      if (!this.localComponent || !this.localComponent.style) return;

      if (!this.localComponent.style.transform) {
        this.localComponent.style.transform = {};
      }

      this.localComponent.style.transform.rotation = parseFloat(value) || 0;
      this.updateComponent();
    },

    getComponentTypeName(type) {
      const typeNames = {
        layout: "布局组件",
        text: "文本组件",
        image: "图片组件",
        "free-text": "自由文本",
        "free-image": "自由图片",
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

    // 自由组件相关方法
    handleArrange(action) {
      if (!this.localComponent) return;

      // 发送排列事件到父组件
      this.$emit("arrange", {
        componentId: this.localComponent.id,
        action: action,
      });
    },

    handleAlign(alignment) {
      if (!this.localComponent) return;

      // 计算页面的实际内容区域（考虑页边距、页眉页脚）
      const margins = calculatePageMargins(this.pageConfig);
      const headerHeight = calculateHeaderHeight(this.pageConfig);
      const footerHeight = calculateFooterHeight(this.pageConfig);
      footerHeight;
      // 内容区域的起始位置和尺寸
      const contentStartX = margins.left;
      const contentStartY = margins.top + headerHeight;
      const contentWidth = calculateAvailableContentWidth(this.pageConfig);
      const contentHeight = calculateAvailableContentHeight(this.pageConfig);

      const componentWidth = this.localComponent.style?.width || 100;
      const componentHeight = this.localComponent.style?.height || 100;

      // 确保 transform 对象存在
      if (!this.localComponent.transform) {
        this.localComponent.transform = { x: 0, y: 0, rotation: 0 };
      }

      let newTransform = { ...this.localComponent.transform };

      switch (alignment) {
        case "top-left":
          // 左上角对齐到内容区域的左上角
          newTransform.x = contentStartX;
          newTransform.y = contentStartY;
          break;
        case "left":
          // 左对齐，垂直居中
          newTransform.x = contentStartX;
          newTransform.y =
            contentStartY + (contentHeight - componentHeight) / 2;
          break;
        case "center-vertical":
          // 完全居中
          newTransform.x = contentStartX + (contentWidth - componentWidth) / 2;
          newTransform.y =
            contentStartY + (contentHeight - componentHeight) / 2;
          break;
        case "right":
          // 右对齐，垂直居中
          newTransform.x = contentStartX + contentWidth - componentWidth;
          newTransform.y =
            contentStartY + (contentHeight - componentHeight) / 2;
          break;
        case "top":
          // 顶部对齐，水平居中
          newTransform.x = contentStartX + (contentWidth - componentWidth) / 2;
          newTransform.y = contentStartY;
          break;
        case "center-horizontal":
          // 水平居中，保持当前垂直位置
          newTransform.x = contentStartX + (contentWidth - componentWidth) / 2;
          // 保持当前的垂直位置
          break;
        case "bottom":
          // 底部对齐，水平居中
          newTransform.x = contentStartX + (contentWidth - componentWidth) / 2;
          newTransform.y = contentStartY + contentHeight - componentHeight;
          break;
      }

      this.localComponent.transform = newTransform;
      this.updateComponent();
    },

    updateDimension(property, value) {
      if (!this.localComponent || !this.localComponent.style) return;

      const pixels = parseFloat(value) * 37.7952755906; // 厘米转像素
      this.localComponent.style[property] = pixels;

      // 如果保持纵横比，同时更新另一个维度
      if (
        this.localComponent.keepAspectRatio &&
        this.localComponent.originalAspectRatio
      ) {
        if (property === "width") {
          this.localComponent.style.height =
            pixels / this.localComponent.originalAspectRatio;
        } else if (property === "height") {
          this.localComponent.style.width =
            pixels * this.localComponent.originalAspectRatio;
        }
      }

      this.updateComponent();
    },

    updateDimensionPixels(property, value) {
      if (!this.localComponent || !this.localComponent.style) return;

      const pixels = parseFloat(value) || 0;
      this.localComponent.style[property] = pixels;

      // 如果保持纵横比，同时更新另一个维度
      if (
        this.localComponent.keepAspectRatio &&
        this.localComponent.originalAspectRatio
      ) {
        if (property === "width") {
          this.localComponent.style.height =
            pixels / this.localComponent.originalAspectRatio;
        } else if (property === "height") {
          this.localComponent.style.width =
            pixels * this.localComponent.originalAspectRatio;
        }
      }

      this.updateComponent();
    },

    updatePosition(property, value) {
      if (!this.localComponent || !this.localComponent.style) return;

      const pixels = parseFloat(value) * 37.7952755906; // 厘米转像素
      this.localComponent.style[property] = pixels;
      this.updateComponent();
    },

    updatePositionPixels(property, value) {
      if (!this.localComponent || !this.localComponent.style) return;

      const pixels = parseFloat(value) || 0;
      this.localComponent.style[property] = pixels;
      this.updateComponent();
    },

    updateTransformPosition(property, value) {
      if (!this.localComponent) return;

      // 确保 transform 对象存在
      if (!this.localComponent.transform) {
        this.localComponent.transform = { x: 0, y: 0, rotation: 0 };
      }

      const pixels = parseFloat(value) || 0;
      this.localComponent.transform[property] = pixels;
      this.updateComponent();
    },

    updateTransformRotation(value) {
      if (!this.localComponent) return;

      // 确保 transform 对象存在
      if (!this.localComponent.transform) {
        this.localComponent.transform = { x: 0, y: 0, rotation: 0 };
      }

      const rotation = parseFloat(value) || 0;
      this.localComponent.transform.rotation = rotation;
      this.updateComponent();
    },

    toggleAspectRatio() {
      if (!this.localComponent) return;

      this.localComponent.keepAspectRatio =
        !this.localComponent.keepAspectRatio;

      // 如果启用纵横比锁定，记录当前比例
      if (this.localComponent.keepAspectRatio) {
        const width = this.localComponent.style?.width || 100;
        const height = this.localComponent.style?.height || 100;
        this.localComponent.originalAspectRatio = width / height;
      }

      this.updateComponent();
    },

    getRatioDisplay() {
      if (!this.localComponent || !this.localComponent.style) return "1:1";

      const width = this.localComponent.style.width || 100;
      const height = this.localComponent.style.height || 100;
      const ratio = width / height;

      // 简化比例显示
      if (Math.abs(ratio - 1) < 0.01) return "1:1";
      if (Math.abs(ratio - 1.5) < 0.01) return "3:2";
      if (Math.abs(ratio - 0.67) < 0.01) return "2:3";
      if (Math.abs(ratio - 1.33) < 0.01) return "4:3";
      if (Math.abs(ratio - 0.75) < 0.01) return "3:4";

      return `${ratio.toFixed(2)}:1`;
    },

    ensureFreeComponentStyles() {
      if (
        !this.localComponent ||
        (this.localComponent.type !== "free-text" &&
          this.localComponent.type !== "free-image")
      )
        return;

      // 确保样式对象存在
      if (!this.localComponent.style) {
        this.localComponent.style = {};
      }

      const style = this.localComponent.style;

      // 确保尺寸属性存在
      if (typeof style.width !== "number") style.width = 200;
      if (typeof style.height !== "number") style.height = 100;

      // 确保 transform 属性存在（用于位置和旋转）
      if (!this.localComponent.transform) {
        this.localComponent.transform = { x: 50, y: 50, rotation: 0 };
      }
      if (typeof this.localComponent.transform.x !== "number") {
        this.localComponent.transform.x = 50;
      }
      if (typeof this.localComponent.transform.y !== "number") {
        this.localComponent.transform.y = 50;
      }
      if (typeof this.localComponent.transform.rotation !== "number") {
        this.localComponent.transform.rotation = 0;
      }

      // 确保其他属性存在
      if (!style.backgroundColor) style.backgroundColor = "transparent";
      if (typeof style.borderRadius !== "number") style.borderRadius = 0;

      // 确保z-index属性存在
      if (typeof this.localComponent.zIndex !== "number") {
        this.localComponent.zIndex = 1;
      }

      // 自由文本组件的特殊样式
      if (this.localComponent.type === "free-text") {
        if (typeof style.fontSize !== "number") style.fontSize = 14;
        if (!style.fontFamily) style.fontFamily = "Arial";
        if (!style.color) style.color = "#333333";
        if (!style.textAlign) style.textAlign = "left";
        if (typeof style.lineHeight !== "number") style.lineHeight = 1.5;
        if (!style.fontWeight) style.fontWeight = "normal";
        if (!style.fontStyle) style.fontStyle = "normal";
        if (!style.textDecoration) style.textDecoration = "none";
      }

      // 自由图片组件的特殊样式
      if (this.localComponent.type === "free-image") {
        if (!style.objectFit) style.objectFit = "cover";
        if (typeof this.localComponent.keepAspectRatio !== "boolean") {
          this.localComponent.keepAspectRatio = true;
        }
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

    updatePadding(direction, value) {
      if (!this.localComponent || !this.localComponent.style) return;

      if (!this.localComponent.style.padding) {
        this.localComponent.style.padding = {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        };
      }

      this.localComponent.style.padding[direction] = parseFloat(value) || 0;
      this.updateComponent();
    },

    // 图层管理相关方法
    selectComponent(component) {
      this.$emit("component-select", component);
    },

    getLayerPreviewStyle(component) {
      const style = component.style || {};

      return {
        backgroundColor: style.backgroundColor || "transparent",
        color: style.color || "#333",
        fontSize: "10px",
        fontFamily: style.fontFamily || "inherit",
        fontWeight: style.fontWeight || "normal",
        textAlign: "center",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "2px",
        overflow: "hidden",
      };
    },

    getComponentPreviewText(component) {
      if (component.type === "free-text") {
        const text = component.content || component.text || "文字";
        return text.length > 10 ? text.substring(0, 10) + "..." : text;
      }
      return "";
    },

    handleImageError(event) {
      event.target.style.display = "none";
    },

    // 拖拽相关方法
    handleLayerDragStart(index, event) {
      this.draggedLayerIndex = index;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", index.toString());
    },

    handleLayerDragOver(index, event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      this.dragOverIndex = index;
    },

    handleLayerDrop(targetIndex, event) {
      event.preventDefault();

      if (
        this.draggedLayerIndex === null ||
        this.draggedLayerIndex === targetIndex
      ) {
        return;
      }

      // 重新排序图层
      this.reorderLayers(this.draggedLayerIndex, targetIndex);

      this.draggedLayerIndex = null;
      this.dragOverIndex = null;
    },

    handleLayerDragEnd() {
      this.draggedLayerIndex = null;
      this.dragOverIndex = null;
    },

    reorderLayers(fromIndex, toIndex) {
      const components = [...this.currentPageFreeComponents];
      const draggedComponent = components[fromIndex];
      const targetComponent = components[toIndex];

      if (!draggedComponent || !targetComponent) return;

      // 计算新的z-index值
      let newZIndex;

      if (toIndex === 0) {
        // 移动到最顶层
        const maxZIndex = Math.max(
          ...components.map((comp) => comp.zIndex || 1)
        );
        newZIndex = maxZIndex + 1;
      } else if (toIndex === components.length - 1) {
        // 移动到最底层
        const minZIndex = Math.min(
          ...components.map((comp) => comp.zIndex || 1)
        );
        newZIndex = Math.max(1, minZIndex - 1);
      } else {
        // 移动到中间位置
        const prevComponent = components[toIndex - 1];
        const nextComponent = components[toIndex + 1];
        const prevZIndex = prevComponent ? prevComponent.zIndex || 1 : 1;
        const nextZIndex = nextComponent ? nextComponent.zIndex || 1 : 1;

        if (fromIndex < toIndex) {
          // 向下移动
          newZIndex = Math.max(1, nextZIndex - 1);
        } else {
          // 向上移动
          newZIndex = prevZIndex + 1;
        }
      }

      // 更新组件的z-index
      const updatedComponent = {
        ...draggedComponent,
        zIndex: newZIndex,
      };

      this.$emit("update", updatedComponent);
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
          } else if (
            this.localComponent.type === "free-text" ||
            this.localComponent.type === "free-image"
          ) {
            this.ensureFreeComponentStyles();
          }
        } else {
          this.localComponent = null;
        }
      },
      immediate: true,
      deep: true,
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
  font-weight: 600;
  color: #333;
}

.global-config-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.global-config-btn:hover {
  background-color: #f0f0f0;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.no-selection {
  text-align: center;
  color: #666;
  padding: 40px 20px;
}

.no-selection-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.no-selection-text {
  font-size: 14px;
  margin-bottom: 20px;
}

.component-properties {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.property-section {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 16px;
}

.property-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.property-section h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.property-section h5 {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: #555;
}

.component-id {
  font-size: 11px;
  color: #999;
  margin-bottom: 12px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #555;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
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
  gap: 6px;
  cursor: pointer;
  margin-bottom: 0 !important;
}

.checkbox-label input[type="checkbox"] {
  width: auto !important;
  margin: 0;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover {
  background-color: #c82333;
}

.help-text {
  font-size: 11px;
  color: #666;
  line-height: 1.4;
  margin: 8px 0 0 0;
}

.column-width-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.column-width-item span {
  font-size: 11px;
  color: #666;
  min-width: 40px;
}

.column-width-item input {
  flex: 1;
  width: auto !important;
}

.background-color-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.color-mode-toggle {
  display: flex;
  gap: 12px;
}

.radio-label {
  display: flex !important;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-bottom: 0 !important;
}

.radio-label input[type="radio"] {
  width: auto !important;
  margin: 0;
}

.color-input-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-picker {
  width: 40px !important;
  height: 32px;
  padding: 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.color-text-input {
  flex: 1;
}

.background-preview {
  width: 100%;
  height: 20px;
  border-radius: 4px;
  margin-top: 4px;
}

.clear-color-btn {
  padding: 4px 8px;
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  color: #666;
}

.clear-color-btn:hover {
  background: #e9ecef;
}

.font-style-controls {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.font-style-btn {
  padding: 6px 10px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  min-width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.font-style-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.font-style-btn:hover {
  background: #f8f9fa;
}

.font-style-btn.active:hover {
  background: #0056b3;
}

.spacing-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.spacing-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 8px;
  max-width: 120px;
}

.spacing-grid input {
  width: 100% !important;
  text-align: center;
}

.spacing-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
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

/* 自由组件属性面板样式 */
.free-component-tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 16px;
}

.tab-btn {
  flex: 1;
  padding: 8px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.tab-btn.active {
  color: #007bff;
  border-bottom-color: #007bff;
}

.tab-btn:hover {
  background-color: #f8f9fa;
}

.tab-content {
  margin-bottom: 20px;
}

.arrange-controls,
.align-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.arrange-row,
.align-row {
  display: flex;
  gap: 8px;
}

.arrange-btn,
.align-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.arrange-btn:hover,
.align-btn:hover {
  background-color: #f8f9fa;
  border-color: #007bff;
}

.arrange-icon,
.align-icon {
  font-size: 14px;
}

.advanced-controls {
  margin-top: 16px;
}

.ratio-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ratio-value {
  font-size: 12px;
  color: #666;
  min-width: 40px;
}

.lock-btn {
  padding: 4px 8px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.lock-btn.locked {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}

.lock-btn:hover {
  background-color: #f8f9fa;
}

.lock-btn.locked:hover {
  background-color: #0056b3;
}

.layer-info {
  color: #666;
  font-size: 12px;
  font-style: italic;
  text-align: center;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 6px;
}
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

/* 自由组件属性面板样式 */
.free-component-tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 16px;
}

.tab-btn {
  flex: 1;
  padding: 8px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.tab-btn.active {
  color: #007bff;
  border-bottom-color: #007bff;
}

.tab-btn:hover {
  background-color: #f8f9fa;
}

.tab-content {
  margin-bottom: 20px;
}

.arrange-controls,
.align-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.arrange-row,
.align-row {
  display: flex;
  gap: 8px;
}

.arrange-btn,
.align-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.arrange-btn:hover,
.align-btn:hover {
  background-color: #f8f9fa;
  border-color: #007bff;
}

.arrange-icon,
.align-icon {
  font-size: 14px;
}

.advanced-controls {
  margin-top: 16px;
}

.ratio-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ratio-value {
  font-size: 12px;
  color: #666;
  min-width: 40px;
}

.lock-btn {
  padding: 4px 8px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.lock-btn.locked {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}

.lock-btn:hover {
  background-color: #f8f9fa;
}

.lock-btn.locked:hover {
  background-color: #0056b3;
}

/* 图层面板样式 */
.layer-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.layer-action-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.layer-action-btn:hover {
  background-color: #f8f9fa;
  border-color: #007bff;
}

.layer-action-btn.active {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}

.layer-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.layer-item:hover {
  border-color: #007bff;
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.1);
}

.layer-item.selected {
  border-color: #007bff;
  background-color: #f0f8ff;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
}

.layer-item.dragging {
  opacity: 0.5;
  transform: rotate(2deg);
}

.layer-drag-handle {
  cursor: grab;
  padding: 2px;
  border-radius: 2px;
  transition: background-color 0.2s ease;
}

.layer-drag-handle:hover {
  background-color: #f0f0f0;
}

.layer-drag-handle:active {
  cursor: grabbing;
}

.layer-preview {
  width: 40px;
  height: 30px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  background: #f8f9fa;
  flex-shrink: 0;
}

.layer-preview-content {
  width: 100%;
  height: 100%;
  position: relative;
}

.layer-preview-text {
  font-size: 8px;
  line-height: 1.2;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 2px;
}

.layer-info-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.layer-type {
  font-size: 12px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-zindex {
  font-size: 10px;
  color: #666;
}

.layer-empty {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.layer-empty-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.layer-empty-text {
  font-size: 14px;
  margin-bottom: 8px;
  color: #333;
}

.layer-empty-hint {
  font-size: 12px;
  color: #999;
}
</style>
