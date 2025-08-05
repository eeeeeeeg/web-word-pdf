<template>
  <div class="header-footer-designer-overlay" @click.self="$emit('close')">
    <div class="designer-panel">
      <div class="panel-header">
        <h3>{{ type === "header" ? "页眉" : "页脚" }}设计器</h3>
        <div class="header-actions">
          <button class="close-btn" @click="$emit('close')">×</button>
        </div>
      </div>

      <!-- 主要内容区域 -->
      <div class="main-content">
        <!-- 模板选择 -->
        <div class="template-library">
          <h4>选择模板</h4>
          <div class="template-list">
            <div
              v-for="(template, key) in templates"
              :key="key"
              class="template-item"
              @click="applyTemplate(key)"
            >
              <div class="template-name">{{ template.name }}</div>
              <div class="template-desc">{{ template.description }}</div>
            </div>
          </div>
        </div>

        <!-- 设计区域 -->
        <div class="design-area">
          <div class="design-toolbar">
            <div class="toolbar-left">
              <span class="area-label">设计区域</span>
              <span class="height-control">
                高度:
                <input
                  type="number"
                  v-model.number="localConfig.height"
                  min="5"
                  max="50"
                />
                mm
              </span>
            </div>
            <div class="toolbar-right">
              <button class="btn btn-logo" @click="triggerLogoUpload">
                上传Logo
              </button>
              <button class="btn btn-clear" @click="clearComponents">
                清空
              </button>
            </div>
          </div>

          <!-- 画布区域 -->
          <div class="design-canvas" :style="canvasStyle">
            <!-- 页眉设计器布局 -->
            <template v-if="type === 'header'">
              <!-- 页眉区域 -->
              <div class="header-area">
                <div class="area-label">页眉区域</div>
                <div class="components-container">
                  <CanvasComponent
                    v-for="(component, index) in localConfig.components"
                    :key="`${component.id}-${component._updateTimestamp || 0}`"
                    :component="component"
                    :selected="
                      selectedComponent && selectedComponent.id === component.id
                    "
                    :selected-component="selectedComponent"
                    :mode="'edit'"
                    :index="index"
                    :total="localConfig.components.length"
                    :page-config="pageConfig"
                    @select="handleComponentSelect"
                    @update="handleComponentUpdate"
                    @delete="handleComponentDelete"
                    @drop="handleComponentDrop"
                    @sort="handleComponentSort"
                  />

                  <!-- 空状态 -->
                  <div
                    v-if="localConfig.components.length === 0"
                    class="empty-state"
                  >
                    <div class="empty-icon">📄</div>
                    <div class="empty-text">从左侧选择组件到此处</div>
                  </div>
                </div>
              </div>

              <!-- 页面内容区域（仅用于视觉效果） -->
              <div class="page-content-area">
                <div class="content-placeholder">
                  <div class="placeholder-text">页面内容区域</div>
                  <div class="placeholder-lines">
                    <div class="line"></div>
                    <div class="line"></div>
                    <div class="line"></div>
                    <div class="line short"></div>
                  </div>
                </div>
              </div>
            </template>

            <!-- 页脚设计器布局 -->
            <template v-if="type === 'footer'">
              <!-- 页面内容区域（仅用于视觉效果） -->
              <div class="page-content-area">
                <div class="content-placeholder">
                  <div class="placeholder-text">页面内容区域</div>
                  <div class="placeholder-lines">
                    <div class="line"></div>
                    <div class="line"></div>
                    <div class="line"></div>
                    <div class="line short"></div>
                  </div>
                </div>
              </div>

              <!-- 页脚区域 -->
              <div class="footer-area">
                <div class="area-label">页脚区域</div>
                <div class="components-container">
                  <CanvasComponent
                    v-for="(component, index) in localConfig.components"
                    :key="`${component.id}-${component._updateTimestamp || 0}`"
                    :component="component"
                    :selected="
                      selectedComponent && selectedComponent.id === component.id
                    "
                    :selected-component="selectedComponent"
                    :mode="'edit'"
                    :index="index"
                    :total="localConfig.components.length"
                    :page-config="pageConfig"
                    @select="handleComponentSelect"
                    @update="handleComponentUpdate"
                    @delete="handleComponentDelete"
                    @drop="handleComponentDrop"
                    @sort="handleComponentSort"
                  />

                  <!-- 空状态 -->
                  <div
                    v-if="localConfig.components.length === 0"
                    class="empty-state"
                  >
                    <div class="empty-icon">📄</div>
                    <div class="empty-text">从左侧选择组件到此处</div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- 属性面板 -->
        <div class="property-panel" v-if="selectedComponent">
          <h4>属性设置</h4>
          <PropertyPanel
            :component="selectedComponent"
            :page-config="pageConfig"
            @update="handlePropertyUpdate"
          />
        </div>
      </div>

      <div class="panel-footer">
        <button class="btn btn-cancel" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" @click="handleSave">保存</button>
      </div>
    </div>

    <!-- 隐藏的文件上传输入 -->
    <input
      ref="logoFileInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleLogoUpload"
    />
  </div>
</template>

<script>
import CanvasComponent from "./CanvasComponent.vue";
import PropertyPanel from "./PropertyPanel.vue";
import {
  HEADER_FOOTER_TEMPLATES,
  createHeaderFooterFromTemplate,
} from "../types/schema.js";

export default {
  name: "HeaderFooterDesigner",
  components: {
    CanvasComponent,
    PropertyPanel,
  },
  props: {
    type: {
      type: String,
      required: true, // 'header' or 'footer'
    },
    config: {
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
      localConfig: JSON.parse(JSON.stringify(this.config)),
      selectedComponent: null,
      templates: HEADER_FOOTER_TEMPLATES,
    };
  },
  computed: {
    canvasStyle() {
      return {
        height: `${this.localConfig.height * 3.78}px`, // mm to px
        backgroundColor:
          this.localConfig.style?.backgroundColor || "transparent",
        borderTop:
          this.type === "footer" && this.localConfig.style?.borderTop?.enabled
            ? `${this.localConfig.style.borderTop.width}px ${this.localConfig.style.borderTop.style} ${this.localConfig.style.borderTop.color}`
            : "none",
        borderBottom:
          this.type === "header" &&
          this.localConfig.style?.borderBottom?.enabled
            ? `${this.localConfig.style.borderBottom.width}px ${this.localConfig.style.borderBottom.style} ${this.localConfig.style.borderBottom.color}`
            : "none",
      };
    },
  },
  methods: {
    applyTemplate(templateKey) {
      const components = createHeaderFooterFromTemplate(templateKey);
      this.localConfig.components = components;
      this.selectedComponent = null;
    },

    clearComponents() {
      if (confirm("确定要清空所有组件吗？")) {
        this.localConfig.components = [];
        this.selectedComponent = null;
      }
    },

    handleComponentSelect(component) {
      this.selectedComponent = component;
    },

    handleComponentUpdate(updatedComponent) {
      // 递归查找并更新组件
      const updateComponentRecursively = (components, targetComponent) => {
        for (let i = 0; i < components.length; i++) {
          const component = components[i];

          // 检查当前组件是否匹配（id和type都要匹配）
          if (
            component.id === targetComponent.id &&
            component.type === targetComponent.type
          ) {
            // 找到匹配的组件，进行更新
            this.$set(components, i, {
              ...targetComponent,
              _updateTimestamp: Date.now(),
            });
            return true; // 表示找到并更新了
          }

          // 如果当前组件是布局组件且有children，递归查找
          if (
            component.type === "layout" &&
            component.children &&
            Array.isArray(component.children)
          ) {
            const found = updateComponentRecursively(
              component.children,
              targetComponent
            );
            if (found) {
              // 如果在子组件中找到并更新了，也要更新父布局的时间戳
              component._updateTimestamp = Date.now();
              return true;
            }
          }
        }
        return false; // 没有找到匹配的组件
      };

      // 开始递归更新
      const updated = updateComponentRecursively(
        this.localConfig.components,
        updatedComponent
      );

      if (updated) {
        console.log("Component updated successfully");
      } else {
        console.warn(
          "Component not found for update:",
          updatedComponent.id,
          updatedComponent.type
        );
      }

      console.log("localConfig.components:", this.localConfig.components);

      // 更新选中组件
      if (
        this.selectedComponent &&
        this.selectedComponent.id === updatedComponent.id &&
        this.selectedComponent.type === updatedComponent.type
      ) {
        this.selectedComponent = updatedComponent;
      }
    },

    handleComponentDelete(componentId) {
      // 递归查找并删除组件
      const deleteComponentRecursively = (components, targetId) => {
        for (let i = 0; i < components.length; i++) {
          const component = components[i];

          // 检查当前组件是否匹配
          if (component.id === targetId) {
            // 找到匹配的组件，删除它
            components.splice(i, 1);
            return true; // 表示找到并删除了
          }

          // 如果当前组件是布局组件且有children，递归查找
          if (
            component.type === "layout" &&
            component.children &&
            Array.isArray(component.children)
          ) {
            const found = deleteComponentRecursively(
              component.children,
              targetId
            );
            if (found) {
              // 如果在子组件中找到并删除了，也要更新父布局的时间戳
              component._updateTimestamp = Date.now();
              return true;
            }
          }
        }
        return false; // 没有找到匹配的组件
      };

      // 开始递归删除
      const deleted = deleteComponentRecursively(
        this.localConfig.components,
        componentId
      );

      if (deleted) {
        console.log("Component deleted successfully:", componentId);
      } else {
        console.warn("Component not found for deletion:", componentId);
      }

      // 清除选中状态
      if (this.selectedComponent && this.selectedComponent.id === componentId) {
        this.selectedComponent = null;
      }
    },

    handleComponentDrop(dropData) {
      // 处理组件拖拽放置
      const { component } = dropData;
      this.localConfig.components.push(component);
    },

    handleComponentSort(sortData) {
      // 处理组件排序
      const { draggedComponentId, targetComponentId, position } = sortData;
      const components = this.localConfig.components;
      const draggedIndex = components.findIndex(
        (c) => c.id === draggedComponentId
      );
      const targetIndex = components.findIndex(
        (c) => c.id === targetComponentId
      );

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const draggedComponent = components.splice(draggedIndex, 1)[0];
        let newIndex = targetIndex;
        if (draggedIndex < targetIndex) {
          newIndex--;
        }
        if (position === "after") {
          newIndex++;
        }
        components.splice(newIndex, 0, draggedComponent);
      }
    },

    handlePropertyUpdate(updates) {
      if (this.selectedComponent) {
        if (updates._delete) {
          this.handleComponentDelete(this.selectedComponent.id);
        } else {
          Object.assign(this.selectedComponent, updates);
          this.handleComponentUpdate(this.selectedComponent);
        }
      }
    },

    triggerLogoUpload() {
      this.$refs.logoFileInput.click();
    },

    handleLogoUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      // 检查文件类型
      if (!file.type.startsWith("image/")) {
        alert("请选择图片文件");
        return;
      }

      // 检查文件大小 (限制为5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("图片文件大小不能超过5MB");
        return;
      }

      // 读取文件并转换为base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target.result;

        this.addLogoToCanvas(imageUrl);
      };
      reader.readAsDataURL(file);

      // 清空input值，允许重复选择同一文件
      event.target.value = "";
    },

    addLogoToCanvas(imageUrl) {
      // 查找现有的图片组件
      let imageComponent = null;
      let parentLayout = null;

      // 遍历所有组件，查找图片组件
      for (const component of this.localConfig.components) {
        if (component.type === "layout" && component.children) {
          for (const child of component.children) {
            if (child.type === "image") {
              imageComponent = child;
              parentLayout = component;
              break;
            }
          }
        }
        if (imageComponent) break;
      }

      if (imageComponent) {
        // 如果找到现有的图片组件，更新其src

        imageComponent.src = imageUrl;
        imageComponent.alt = "Logo";
        imageComponent._updateTimestamp = Date.now();

        // 更新父布局的时间戳以触发重新渲染
        if (parentLayout) {
          parentLayout._updateTimestamp = Date.now();
        }

        this.selectedComponent = imageComponent;
      } else {
        // 如果没有找到图片组件，应用默认的Logo模板

        const components = createHeaderFooterFromTemplate("LOGO_LEFT");

        if (components.length > 0 && components[0].children) {
          // 找到模板中的图片组件并设置src
          const logoChild = components[0].children.find(
            (child) => child.type === "image"
          );
          if (logoChild) {
            logoChild.src = imageUrl;
            logoChild.alt = "Logo";
            logoChild._updateTimestamp = Date.now();
          }
          components[0]._updateTimestamp = Date.now();
        }

        this.localConfig.components = components;

        // 选中新创建的Logo组件
        if (components.length > 0 && components[0].children) {
          const logoChild = components[0].children.find(
            (child) => child.type === "image"
          );
          this.selectedComponent = logoChild;
        }
      }

      // 强制更新组件
      this.$forceUpdate();
    },

    generateId() {
      return "comp_" + Math.random().toString(36).substring(2, 11);
    },

    handleSave() {
      this.$emit("update", this.localConfig);
      this.$emit("close");
    },
  },
};
</script>

<style scoped>
.header-footer-designer-overlay {
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

.designer-panel {
  background: white;
  border-radius: 12px;
  width: 92vw;
  height: 92vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.panel-header {
  padding: 24px 28px;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  flex-shrink: 0;
}

.panel-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #262626;
}

.header-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #bfbfbf;
  padding: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.close-btn:hover {
  color: #595959;
  background: #f5f5f5;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.template-library {
  width: 300px;
  border-right: 1px solid #e0e0e0;
  background: #fafafa;
  overflow-y: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.template-library h4 {
  margin: 0;
  padding: 20px 16px 16px 16px;
  font-size: 15px;
  font-weight: 600;
  color: #262626;
  border-bottom: 1px solid #e0e0e0;
  background: white;
  flex-shrink: 0;
}

.template-list {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
}

.template-item {
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  background: white;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: relative;
}

.template-item:hover {
  border-color: #1890ff;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
  transform: translateY(-1px);
}

.template-item:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(24, 144, 255, 0.2);
}

.template-item:last-child {
  margin-bottom: 0;
}

.template-name {
  font-weight: 600;
  color: #262626;
  margin-bottom: 6px;
  font-size: 14px;
  line-height: 1.4;
}

.template-desc {
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.4;
  margin: 0;
}

.design-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fafafa;
}

.design-toolbar {
  padding: 16px 24px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.area-label {
  font-weight: 600;
  color: #262626;
  font-size: 15px;
}

.height-control {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #595959;
  background: #f5f5f5;
  padding: 8px 12px;
  border-radius: 6px;
}

.height-control input {
  width: 70px;
  padding: 6px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  transition: border-color 0.3s;
}

.height-control input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.design-canvas {
  flex: 1;
  margin: 24px auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  position: relative;
  overflow-y: auto;
  background: white;
  display: flex;
  flex-direction: column;
  padding: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  /* 按照A4页面宽度显示 */
  width: 794px; /* A4宽度 210mm = 794px (at 96dpi) */
  max-width: calc(100% - 48px);
  min-height: 600px;
}

.header-area,
.footer-area {
  position: relative;
  border: 2px dashed #d9d9d9;
  background: #fafafa;
  min-height: 80px;
}

.header-area {
  border-bottom: 1px solid #e0e0e0;
}

.footer-area {
  border-top: 1px solid #e0e0e0;
  margin-top: auto;
}

.area-label {
  position: absolute;
  top: -2px;
  left: 0px;
  background: white;
  padding: 2px 8px;
  font-size: 12px;
  color: #666;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  z-index: 10;
}

.components-container {
  padding: 16px;
  min-height: 60px;
}

.page-content-area {
  flex: 1;
  padding: 40px;
  background: #f9f9f9;
  border-top: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content-placeholder {
  text-align: center;
  color: #999;
}

.placeholder-text {
  font-size: 16px;
  margin-bottom: 20px;
  font-weight: 500;
}

.placeholder-lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.line {
  height: 2px;
  background: #ddd;
  border-radius: 1px;
  width: 300px;
}

.line.short {
  width: 200px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #bfbfbf;
  min-height: 120px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.6;
}

.empty-text {
  font-size: 15px;
  color: #8c8c8c;
  font-weight: 500;
}

.property-panel {
  width: 340px;
  border-left: 1px solid #e0e0e0;
  background: #fafafa;
  overflow-y: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.property-panel h4 {
  margin: 0;
  padding: 20px 16px 16px 16px;
  font-size: 15px;
  font-weight: 600;
  color: #262626;
  border-bottom: 1px solid #e0e0e0;
  background: white;
  flex-shrink: 0;
}

.panel-footer {
  padding: 24px 28px;
  border-top: 1px solid #e8e8e8;
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  background: #fafafa;
  flex-shrink: 0;
}

.btn {
  padding: 10px 16px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn:hover {
  border-color: #40a9ff;
  color: #1890ff;
}

.btn-template {
  background: #52c41a;
  color: white;
  border-color: #52c41a;
}

.btn-template:hover {
  background: #73d13d;
  border-color: #73d13d;
  color: white;
}

.btn-clear {
  background: #ff4d4f;
  color: white;
  border-color: #ff4d4f;
}

.btn-clear:hover {
  background: #ff7875;
  border-color: #ff7875;
  color: white;
}

.btn-logo {
  background: #722ed1;
  color: white;
  border-color: #722ed1;
  margin-right: 12px;
}

.btn-logo:hover {
  background: #9254de;
  border-color: #9254de;
  color: white;
}

.btn-cancel {
  background: white;
  color: #595959;
  border-color: #d9d9d9;
}

.btn-cancel:hover {
  background: #f5f5f5;
  border-color: #40a9ff;
  color: #1890ff;
}

.btn-primary {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.btn-primary:hover {
  background: #40a9ff;
  border-color: #40a9ff;
  color: white;
}
</style>
