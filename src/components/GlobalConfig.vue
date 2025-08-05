<template>
  <div class="global-config-overlay" @click.self="$emit('close')">
    <div class="global-config-panel">
      <div class="panel-header">
        <h3>全局页面配置</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="panel-content">
        <!-- 页面尺寸设置 -->
        <div class="config-section">
          <h4>页面尺寸</h4>
          <div class="form-group">
            <label>预设尺寸:</label>
            <select
              v-model="localConfig.pageSize.preset"
              @change="handlePresetChange"
            >
              <option value="A4">A4 (210×297mm)</option>
              <option value="A3">A3 (297×420mm)</option>
              <option value="Letter">Letter (216×279mm)</option>
              <option value="PPT_16_9">PPT 16:9 (254×143mm)</option>
              <option value="PPT_4_3">PPT 4:3 (254×190mm)</option>
              <option value="Custom">自定义</option>
            </select>
          </div>

          <div class="form-row" v-if="localConfig.pageSize.preset === 'Custom'">
            <div class="form-group">
              <label>宽度:</label>
              <input
                type="number"
                v-model.number="localConfig.pageSize.width"
                min="50"
                max="1000"
              />
            </div>
            <div class="form-group">
              <label>高度:</label>
              <input
                type="number"
                v-model.number="localConfig.pageSize.height"
                min="50"
                max="1000"
              />
            </div>
            <div class="form-group">
              <label>单位:</label>
              <select v-model="localConfig.pageSize.unit">
                <option value="mm">毫米 (mm)</option>
                <option value="px">像素 (px)</option>
                <option value="in">英寸 (in)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 页面边距 -->
        <div class="config-section">
          <h4>页面边距 (mm)</h4>
          <div class="margin-grid">
            <div class="form-group">
              <label>上:</label>
              <input
                type="number"
                v-model.number="localConfig.margins.top"
                min="0"
                max="100"
              />
            </div>
            <div class="form-group">
              <label>下:</label>
              <input
                type="number"
                v-model.number="localConfig.margins.bottom"
                min="0"
                max="100"
              />
            </div>
            <div class="form-group">
              <label>左:</label>
              <input
                type="number"
                v-model.number="localConfig.margins.left"
                min="0"
                max="100"
              />
            </div>
            <div class="form-group">
              <label>右:</label>
              <input
                type="number"
                v-model.number="localConfig.margins.right"
                min="0"
                max="100"
              />
            </div>
          </div>
        </div>

        <!-- 页眉设置 -->
        <div class="config-section">
          <h4>页眉设置</h4>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="localConfig.header.enabled" />
              启用页眉
            </label>
          </div>
          <div v-if="localConfig.header.enabled">
            <div class="form-group">
              <label>高度 (mm):</label>
              <input
                type="number"
                v-model.number="localConfig.header.height"
                min="5"
                max="50"
              />
            </div>
            <div class="form-group">
              <label>页眉内容:</label>
              <div class="design-preview">
                <div class="preview-info">
                  {{ localConfig.header.components.length }} 个组件
                </div>
                <button class="btn btn-design" @click="openHeaderDesigner">
                  设计页眉
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 页脚设置 -->
        <div class="config-section">
          <h4>页脚设置</h4>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="localConfig.footer.enabled" />
              启用页脚
            </label>
          </div>
          <div v-if="localConfig.footer.enabled">
            <div class="form-group">
              <label>高度 (mm):</label>
              <input
                type="number"
                v-model.number="localConfig.footer.height"
                min="5"
                max="50"
              />
            </div>
            <div class="form-group">
              <label>页脚内容:</label>
              <div class="design-preview">
                <div class="preview-info">
                  {{ localConfig.footer.components.length }} 个组件
                </div>
                <button class="btn btn-design" @click="openFooterDesigner">
                  设计页脚
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 默认样式 -->
        <div class="config-section">
          <h4>默认文本样式</h4>
          <div class="form-row">
            <div class="form-group">
              <label>字体:</label>
              <select v-model="localConfig.defaultStyles.fontFamily">
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Helvetica">Helvetica</option>
                <option value="SimSun">宋体</option>
                <option value="SimHei">黑体</option>
                <option value="Microsoft YaHei">微软雅黑</option>
              </select>
            </div>
            <div class="form-group">
              <label>字号:</label>
              <input
                type="number"
                v-model.number="localConfig.defaultStyles.fontSize"
                min="8"
                max="72"
              />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>行高:</label>
              <input
                type="number"
                v-model.number="localConfig.defaultStyles.lineHeight"
                min="1"
                max="3"
                step="0.1"
              />
            </div>
            <div class="form-group">
              <label>段落间距:</label>
              <input
                type="number"
                v-model.number="localConfig.defaultStyles.paragraphSpacing"
                min="0"
                max="50"
              />
            </div>
          </div>
          <div class="form-group">
            <label>文字颜色:</label>
            <input type="color" v-model="localConfig.defaultStyles.color" />
          </div>
        </div>
      </div>

      <div class="panel-footer">
        <button class="btn btn-cancel" @click="$emit('close')">取消</button>
        <button class="btn btn-primary" @click="handleSave">保存</button>
      </div>
    </div>

    <!-- 页眉页脚设计器 -->
    <HeaderFooterDesigner
      v-if="showHeaderDesigner"
      type="header"
      :config="localConfig.header"
      :page-config="localConfig"
      @update="handleHeaderUpdate"
      @close="showHeaderDesigner = false"
    />

    <HeaderFooterDesigner
      v-if="showFooterDesigner"
      type="footer"
      :config="localConfig.footer"
      :page-config="localConfig"
      @update="handleFooterUpdate"
      @close="showFooterDesigner = false"
    />
  </div>
</template>

<script>
import HeaderFooterDesigner from "./HeaderFooterDesigner.vue";

export default {
  name: "GlobalConfig",
  components: {
    HeaderFooterDesigner,
  },
  props: {
    config: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      localConfig: JSON.parse(JSON.stringify(this.config)),
      showHeaderDesigner: false,
      showFooterDesigner: false,
    };
  },
  methods: {
    handlePresetChange() {
      const presets = {
        A4: { width: 210, height: 297, unit: "mm" },
        A3: { width: 297, height: 420, unit: "mm" },
        Letter: { width: 216, height: 279, unit: "mm" },
        PPT_16_9: { width: 254, height: 143, unit: "mm" },
        PPT_4_3: { width: 254, height: 190, unit: "mm" },
      };

      const preset = presets[this.localConfig.pageSize.preset];
      if (preset) {
        Object.assign(this.localConfig.pageSize, preset);
      }
    },

    openHeaderDesigner() {
      this.showHeaderDesigner = true;
    },

    openFooterDesigner() {
      this.showFooterDesigner = true;
    },

    handleHeaderUpdate(updatedConfig) {
      this.localConfig.header = updatedConfig;
    },

    handleFooterUpdate(updatedConfig) {
      this.localConfig.footer = updatedConfig;
    },

    handleSave() {
      this.$emit("update", this.localConfig);
      this.$emit("close");
    },
  },
};
</script>

<style scoped>
.global-config-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.global-config-panel {
  background: white;
  border-radius: 8px;
  width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.panel-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.panel-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.config-section {
  margin-bottom: 24px;
}

.config-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  color: #666;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  font-size: 14px;
}

.form-row {
  display: flex;
  gap: 12px;
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
  margin-right: 8px;
}

.margin-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.panel-footer {
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 8px 16px;
  border: 1px solid #d0d0d0;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-cancel:hover {
  background: #f0f0f0;
}

.btn-primary {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.btn-primary:hover {
  background: #40a9ff;
}

.design-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #f9f9f9;
}

.preview-info {
  font-size: 14px;
  color: #666;
}

.btn-design {
  background: #52c41a;
  color: white;
  border-color: #52c41a;
  padding: 6px 12px;
  font-size: 12px;
}

.btn-design:hover {
  background: #73d13d;
}
</style>
