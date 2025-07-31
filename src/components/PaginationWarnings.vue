<template>
  <div v-if="warnings.length > 0" class="pagination-warnings">
    <div class="warnings-header">
      <h4>分页警告</h4>
      <button class="close-btn" @click="$emit('close')" title="关闭">×</button>
    </div>
    
    <div class="warnings-content">
      <div 
        v-for="(warning, index) in warnings" 
        :key="index"
        class="warning-item"
        :class="getWarningClass(warning)"
      >
        <div class="warning-icon">
          {{ getWarningIcon(warning) }}
        </div>
        <div class="warning-message">
          {{ getWarningMessage(warning) }}
        </div>
        <div class="warning-actions" v-if="getWarningActions(warning).length > 0">
          <button 
            v-for="action in getWarningActions(warning)"
            :key="action.key"
            class="action-btn"
            :class="action.class"
            @click="handleAction(action, warning)"
          >
            {{ action.label }}
          </button>
        </div>
      </div>
    </div>
    
    <div class="warnings-footer">
      <button class="btn secondary" @click="$emit('disable-auto-pagination')">
        关闭自动分页
      </button>
      <button class="btn primary" @click="$emit('retry-pagination')">
        重试分页
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PaginationWarnings',
  props: {
    warnings: {
      type: Array,
      default: () => [],
    },
    oversizedComponents: {
      type: Array,
      default: () => [],
    },
  },
  methods: {
    getWarningClass(warning) {
      if (typeof warning === 'string') {
        if (warning.includes('超过页面可用高度')) {
          return 'warning-error';
        }
        return 'warning-info';
      }
      
      if (warning.type === 'component_too_large') {
        return 'warning-error';
      }
      
      return 'warning-info';
    },
    
    getWarningIcon(warning) {
      if (typeof warning === 'string') {
        if (warning.includes('超过页面可用高度')) {
          return '⚠️';
        }
        return 'ℹ️';
      }
      
      if (warning.type === 'component_too_large') {
        return '⚠️';
      }
      
      return 'ℹ️';
    },
    
    getWarningMessage(warning) {
      if (typeof warning === 'string') {
        return warning;
      }
      
      if (warning.type === 'component_too_large') {
        return `组件过大：高度 ${warning.height}px 超过页面可用高度 ${warning.maxHeight}px`;
      }
      
      return warning.message || '未知警告';
    },
    
    getWarningActions(warning) {
      const actions = [];
      
      if (typeof warning === 'string' && warning.includes('超过页面可用高度')) {
        actions.push({
          key: 'select-component',
          label: '选择组件',
          class: 'select',
        });
        actions.push({
          key: 'split-component',
          label: '拆分组件',
          class: 'split',
        });
      }
      
      if (warning.type === 'component_too_large') {
        actions.push({
          key: 'select-component',
          label: '选择组件',
          class: 'select',
        });
        actions.push({
          key: 'adjust-margins',
          label: '调整页边距',
          class: 'adjust',
        });
      }
      
      return actions;
    },
    
    handleAction(action, warning) {
      const componentId = this.extractComponentId(warning);
      
      switch (action.key) {
        case 'select-component':
          this.$emit('select-component', componentId);
          break;
        case 'split-component':
          this.$emit('split-component', componentId);
          break;
        case 'adjust-margins':
          this.$emit('adjust-margins');
          break;
        default:
          console.warn('Unknown action:', action.key);
      }
    },
    
    extractComponentId(warning) {
      if (typeof warning === 'string') {
        const match = warning.match(/组件\s+(\w+)/);
        return match ? match[1] : null;
      }
      
      return warning.componentId || warning.id || null;
    },
  },
};
</script>

<style scoped>
.pagination-warnings {
  position: fixed;
  top: 80px;
  right: 20px;
  width: 400px;
  max-height: 500px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
}

.warnings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}

.warnings-header h4 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.close-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 18px;
  color: #666;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #f0f0f0;
}

.warnings-content {
  max-height: 300px;
  overflow-y: auto;
  padding: 8px;
}

.warning-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  border-left: 4px solid #d0d0d0;
}

.warning-item.warning-error {
  background: #fff2f0;
  border-left-color: #ff4d4f;
}

.warning-item.warning-info {
  background: #f6ffed;
  border-left-color: #52c41a;
}

.warning-icon {
  font-size: 16px;
  line-height: 1;
  margin-top: 2px;
}

.warning-message {
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
  color: #333;
}

.warning-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-btn {
  padding: 4px 8px;
  border: 1px solid #d0d0d0;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.action-btn.select {
  border-color: #1890ff;
  color: #1890ff;
}

.action-btn.select:hover {
  background: #1890ff;
  color: white;
}

.action-btn.split {
  border-color: #faad14;
  color: #faad14;
}

.action-btn.split:hover {
  background: #faad14;
  color: white;
}

.action-btn.adjust {
  border-color: #52c41a;
  color: #52c41a;
}

.action-btn.adjust:hover {
  background: #52c41a;
  color: white;
}

.warnings-footer {
  display: flex;
  justify-content: space-between;
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
}

.btn {
  padding: 8px 16px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn.secondary {
  background: white;
  color: #666;
}

.btn.secondary:hover {
  background: #f0f0f0;
}

.btn.primary {
  background: #1890ff;
  color: white;
  border-color: #1890ff;
}

.btn.primary:hover {
  background: #40a9ff;
}
</style>
