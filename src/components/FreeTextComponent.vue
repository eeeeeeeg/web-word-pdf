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
        :style="editorContainerStyle"
      >
        <RichTextEditor
          ref="richTextEditor"
          :value="editingContent"
          @input="handleRichTextInput"
          @blur="handleRichTextBlur"
          @focus="handleRichTextFocus"
          :show-toolbar="true"
          :min-height="'60px'"
          :max-height="'400px'"
          placeholder="请输入文本内容..."
          class="free-text-rich-editor"
        />
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
import RichTextEditor from "./RichTextEditor.vue";

export default {
  name: "FreeTextComponent",
  components: {
    TransformController,
    RichTextEditor,
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
        display: "block",
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
        whiteSpace: "normal",
      };
    },
    editorContainerStyle() {
      return {
        width: "100%",
        height: "100%",
        position: "relative",
        zIndex: 1000,
        boxSizing: "border-box",
        margin: 0,
        padding: 0,
      };
    },
    formattedContent() {
      const content = this.component.content || "请输入文本内容";
      // tinymce已经输出HTML格式，直接返回
      return content;
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
        // 延迟一点时间确保 TinyMCE 完全初始化
        setTimeout(() => {
          if (this.$refs.richTextEditor) {
            this.$refs.richTextEditor.focus();
          }
        }, 100);
      });
    },

    stopEditing() {
      if (this.isEditing) {
        this.isEditing = false;
        this.saveContent();
      }
    },

    handleRichTextInput(content) {
      this.editingContent = content;
      this.saveContent();
    },

    handleRichTextBlur() {
      this.stopEditing();
    },

    handleRichTextFocus() {
      // 富文本编辑器获得焦点时的处理
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
  display: block;
  box-sizing: border-box;
}

.text-editor {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1000;
}

.free-text-rich-editor {
  width: 100%;
  height: 100%;
  min-height: 60px;
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

/* 富文本编辑器样式优化 */
.free-text-rich-editor ::v-deep .tox-tinymce {
  border: 1px solid #007bff;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.95);
  width: 100% !important;
  box-sizing: border-box !important;
}

.free-text-rich-editor ::v-deep .tox-edit-area__iframe {
  background: rgba(255, 255, 255, 0.95) !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

.free-text-rich-editor ::v-deep .tox-toolbar-overlord {
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  width: 100% !important;
  box-sizing: border-box !important;
}

.free-text-rich-editor ::v-deep .tox-toolbar__primary {
  width: 100% !important;
  box-sizing: border-box !important;
}

.free-text-rich-editor ::v-deep .tox-edit-area {
  width: 100% !important;
  box-sizing: border-box !important;
}

/* 确保内联模式下的编辑器宽度 */
.free-text-rich-editor ::v-deep .tox-tinymce-inline {
  width: 100% !important;
  box-sizing: border-box !important;
}

/* 强制设置编辑器容器宽度 */
.free-text-rich-editor ::v-deep .tox {
  width: 100% !important;
  box-sizing: border-box !important;
}
</style>
