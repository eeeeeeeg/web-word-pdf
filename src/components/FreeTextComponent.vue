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
    <div class="free-text-component" :style="textContainerStyle">
      <!-- 编辑模式 -->
      <div
        v-if="mode === 'edit' && selected && isEditing"
        class="text-editor"
        :style="textStyle"
      >
        <textarea
          ref="textEditor"
          v-model="editingContent"
          :style="textareaStyle"
          @blur="handleTextBlur"
          @keydown="handleKeyDown"
          @input="handleTextInput"
        ></textarea>
      </div>

      <!-- 显示模式 -->
      <div
        v-else
        class="text-display"
        :style="textStyle"
        @click="handleTextClick"
        v-html="formattedContent"
      ></div>
    </div>
  </TransformController>
</template>

<script>
import TransformController from "./TransformController.vue";

export default {
  name: "FreeTextComponent",
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
  data() {
    return {
      isEditing: false,
      editingContent: "",
    };
  },
  computed: {
    textContainerStyle() {
      return {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        backgroundColor: this.component.style?.backgroundColor || "transparent",
        borderRadius: `${this.component.style?.borderRadius || 0}px`,
        overflow: "hidden",
        padding: "8px",
        boxSizing: "border-box",
      };
    },
    textStyle() {
      const style = this.component.style || {};

      return {
        fontSize: `${style.fontSize || 14}px`,
        fontFamily: style.fontFamily || "Arial",
        color: style.color || "#333333",
        lineHeight: style.lineHeight || 1.5,
        textAlign: style.textAlign || "left",
        fontWeight: style.fontWeight || "normal",
        fontStyle: style.fontStyle || "normal",
        textDecoration: style.textDecoration || "none",
        width: "100%",
        height: "100%",
        margin: 0,
        padding: 0,
        border: "none",
        outline: "none",
        background: "transparent",
        resize: "none",
        overflow: "hidden",
      };
    },
    textareaStyle() {
      return {
        ...this.textStyle,
        resize: "none",
        border: "1px solid #007bff",
        borderRadius: "4px",
        padding: "4px",
        background: "rgba(255, 255, 255, 0.9)",
      };
    },
    formattedContent() {
      const content = this.component.content || "请输入文本内容";
      // 简单的换行处理
      return content.replace(/\n/g, "<br>");
    },
  },
  watch: {
    selected(newVal) {
      if (!newVal && this.isEditing) {
        this.stopEditing();
      }
    },
    component: {
      handler(newVal) {
        if (!this.isEditing) {
          this.editingContent = newVal.content || "";
        }
        // 强制更新组件以确保样式变化立即生效
        this.$forceUpdate();
      },
      deep: true,
      immediate: true,
    },
  },
  methods: {
    handleTextClick(event) {
      if (this.mode === "edit") {
        event.stopPropagation();
        this.$emit("select", this.component);
      }
    },

    // 处理编辑事件（双击触发）
    handleEdit() {
      console.log("🎯 双击编辑事件触发");
      this.startEditing();
    },

    startEditing() {
      this.isEditing = true;
      this.editingContent = this.component.content || "";

      this.$nextTick(() => {
        if (this.$refs.textEditor) {
          this.$refs.textEditor.focus();
          this.$refs.textEditor.select();
        }
      });
    },

    stopEditing() {
      if (this.isEditing) {
        this.isEditing = false;
        this.saveContent();
      }
    },

    handleTextBlur() {
      this.stopEditing();
    },

    handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        this.editingContent = this.component.content || "";
        this.stopEditing();
      } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        this.stopEditing();
      }
      // 允许普通的 Enter 键用于换行
    },

    handleTextInput() {
      // 实时更新内容（可选）
      this.saveContent();
    },

    saveContent() {
      if (this.editingContent !== this.component.content) {
        const updatedComponent = {
          ...this.component,
          content: this.editingContent,
        };
        this.$emit("update", updatedComponent);
      }
    },

    // 自动调整文本区域大小
    autoResize() {
      if (this.$refs.textEditor) {
        const textarea = this.$refs.textEditor;
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
      }
    },
  },
  mounted() {
    this.editingContent = this.component.content || "";
  },
};
</script>

<style scoped>
.free-text-component {
  width: 100%;
  height: 100%;
  position: relative;
}

.text-display {
  width: 100%;
  height: 100%;
  cursor: text;
  word-wrap: break-word;
  word-break: break-word;
  white-space: pre-wrap;
  display: flex;
  align-items: flex-start;
}

.text-editor {
  width: 100%;
  height: 100%;
  position: relative;
}

.text-editor textarea {
  width: 100%;
  height: 100%;
  min-height: 100%;
  box-sizing: border-box;
}

/* 预览模式下的样式 */
.free-text-component[data-mode="preview"] .text-display {
  cursor: default;
  user-select: text;
}

/* 空内容时的占位符样式 */
.text-display:empty::before {
  content: "请输入文本内容";
  color: #999;
  font-style: italic;
}

/* 选中状态的文本显示 */
.text-display:hover {
  background-color: rgba(0, 123, 255, 0.05);
  border-radius: 4px;
}

/* 编辑状态的样式 */
.text-editor textarea:focus {
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}
</style>
