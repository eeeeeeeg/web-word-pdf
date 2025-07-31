<template>
  <div class="rich-text-editor-wrapper">
    <editor
      ref="tinyEditor"
      v-model="content"
      :init="editorConfig"
      @blur="onEditorBlur"
      @focus="onEditorFocus"
      @input="onEditorInput"
      class="rich-text-editor"
    />
  </div>
</template>

<script>
import Editor from "@tinymce/tinymce-vue";

export default {
  name: "RichTextEditor",
  components: {
    Editor,
  },
  props: {
    value: {
      type: String,
      default: "",
    },
    placeholder: {
      type: String,
      default: "请输入文本内容...",
    },
    minHeight: {
      type: String,
      default: "100px",
    },
    maxHeight: {
      type: String,
      default: "300px",
    },
    showToolbar: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      content: this.value,
      editorConfig: {
        // 配置本地资源路径
        base_url: "/tinymce",
        suffix: ".min",
        // 免费开源许可证密钥
        license_key: "gpl",
        height: parseInt(this.minHeight),
        max_height: parseInt(this.maxHeight),
        menubar: false,
        branding: false,
        inline: true,
        statusbar: false,
        resize: false,
        placeholder: this.placeholder,
        language: "zh_CN",
        content_style: `
          body {
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            margin: 0;
            color: inherit;
            background: transparent;
            box-sizing: border-box;
            width: 100%;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          * {
            color: inherit;
          }
          p {
            margin: 0 0 8px 0;
          }
          p:last-child {
            margin-bottom: 0;
          }
          h1, h2, h3, h4, h5, h6 {
            margin: 8px 0;
            color: inherit;
          }
          ul, ol {
            margin: 8px 0;
            padding-left: 20px;
            list-style-position: outside;
            white-space: normal;
          }
          ul {
            list-style-type: disc;
          }
          ol {
            list-style-type: decimal;
          }
          li {
            margin: 2px 0;
            line-height: 1.5;
            white-space: pre-wrap;
          }
          ul ul, ol ol, ul ol, ol ul {
            margin: 2px 0;
            padding-left: 16px;
          }
          ul ul {
            list-style-type: circle;
          }
          ul ul ul {
            list-style-type: square;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 8px 0;
          }
          table td, table th {
            border: 1px solid #ddd;
            padding: 4px 8px;
          }
        `,
        plugins: [
          "advlist",
          "autolink",
          "lists",
          "link",
          "image",
          "charmap",
          "preview",
          "anchor",
          "searchreplace",
          "visualblocks",
          "code",
          "fullscreen",
          "insertdatetime",
          "media",
          "table",
          "help",
          "wordcount",
          "quickbars",
        ],
        toolbar: this.showToolbar
          ? "undo redo | formatselect fontselect fontsizeselect | " +
            "bold italic underline strikethrough | " +
            "forecolor backcolor | " +
            "alignleft aligncenter alignright alignjustify | " +
            "outdent indent | " +
            "lineheight | " +
            "removeformat"
          : false,
        fontsize_formats:
          "10px 12px 14px 16px 18px 20px 22px 24px 26px 28px 30px 32px 36px 40px 44px 48px 54px 60px 66px 72px",
        lineheight_formats: "1.0 1.15 1.2 1.5 1.6 1.8 2.0 2.5 3.0",
        font_formats:
          "Arial=arial,helvetica,sans-serif; Times New Roman=times new roman,times,serif; Courier New=courier new,courier,monospace; 宋体=SimSun; 黑体=SimHei; 微软雅黑=Microsoft YaHei",
        quickbars_selection_toolbar: "bold italic | quicklink h2 h3 blockquote",
        quickbars_insert_toolbar: " ",
        contextmenu: "link image table",
        setup: (editor) => {
          // 沉浸式编辑配置
          editor.on("focus", () => {
            this.onEditorFocus();
          });

          editor.on("blur", () => {
            this.onEditorBlur();
          });

          editor.on("input change", () => {
            this.content = editor.getContent();
            this.$emit("input", this.content);
          });
        },
      },
    };
  },
  watch: {
    value(newVal) {
      if (newVal !== this.content) {
        this.content = newVal;
      }
    },
  },
  mounted() {
    // TinyMCE 会自动处理高度设置
  },
  methods: {
    onEditorBlur() {
      this.$emit("blur");
    },
    onEditorFocus() {
      this.$emit("focus");
    },
    onEditorInput() {
      this.$emit("input", this.content);
      this.$emit("change", this.content);
    },
    getContent() {
      return this.content;
    },
    setContent(content) {
      this.content = content;
      if (this.$refs.tinyEditor) {
        this.$refs.tinyEditor.setContent(content);
      }
    },
    focus() {
      if (this.$refs.tinyEditor) {
        this.$refs.tinyEditor.focus();
      }
    },
  },
};
</script>

<style scoped>
.rich-text-editor-wrapper {
  border: none;
  border-radius: 4px;
  background: transparent;
  position: relative;
  z-index: 1000;
  width: 100%;
  box-sizing: border-box;
}

.rich-text-editor {
  background: white;
}

/* TinyMCE 编辑器样式优化 */
.rich-text-editor ::v-deep .tox-tinymce {
  border: none;
  border-radius: 4px;
  position: relative;
  z-index: 1001;
}

.rich-text-editor ::v-deep .tox-toolbar-overlord {
  background: #f9f9f9;
  border-bottom: 1px solid #ddd;
}

.rich-text-editor ::v-deep .tox-toolbar__primary {
  background: transparent;
}

.rich-text-editor ::v-deep .tox-edit-area {
  border: none;
}

.rich-text-editor ::v-deep .tox-edit-area__iframe {
  background: white;
}

/* 工具栏按钮样式 */
.rich-text-editor ::v-deep .tox-tbtn {
  border-radius: 3px;
  margin: 1px;
}

.rich-text-editor ::v-deep .tox-tbtn:hover {
  background: #e6e6e6;
}

.rich-text-editor ::v-deep .tox-tbtn--enabled {
  background: #007bff;
  color: white;
}

/* 下拉菜单样式 */
.rich-text-editor ::v-deep .tox-listbox {
  border-radius: 3px;
}

.rich-text-editor ::v-deep .tox-listbox__select-label {
  padding: 4px 8px;
}

/* 沉浸式编辑样式 */
.rich-text-editor ::v-deep .tox-quickbar {
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1010 !important;
  position: relative;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .rich-text-editor ::v-deep .tox-toolbar__primary {
    flex-wrap: wrap;
  }

  .rich-text-editor ::v-deep .tox-toolbar__group {
    margin: 2px;
  }
}

/* 确保编辑器内容区域样式 */
.rich-text-editor ::v-deep iframe {
  border-radius: 0 0 4px 4px;
  width: 100% !important;
  box-sizing: border-box !important;
}

/* 确保编辑区域宽度一致 */
.rich-text-editor ::v-deep .tox-edit-area {
  border: none;
  width: 100%;
  box-sizing: border-box;
}

.rich-text-editor ::v-deep .tox-edit-area__iframe {
  background: white;
  width: 100% !important;
  box-sizing: border-box !important;
}

/* 隐藏品牌标识 */
.rich-text-editor ::v-deep .tox-promotion {
  display: none !important;
}

/* 状态栏隐藏 */
.rich-text-editor ::v-deep .tox-statusbar {
  display: none !important;
}

/* 提升所有 TinyMCE 相关元素的层级 */
</style>
<style>
.tox.tox-tinymce-inline {
  z-index: 10;
}
</style>
