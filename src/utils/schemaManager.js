// Schema 数据管理工具

import { validateSchema } from '../types/schema.js'

/**
 * 本地存储管理
 */
export class LocalStorageManager {
  constructor() {
    this.storageKey = 'page-editor-schemas'
    this.currentSchemaKey = 'page-editor-current-schema'
  }

  /**
   * 保存 Schema 到本地存储
   */
  saveSchema(schema, name = null) {
    const validation = validateSchema(schema)
    if (!validation.valid) {
      throw new Error(`Invalid schema: ${validation.error}`)
    }

    const schemaData = {
      id: this.generateId(),
      name: name || `页面设计_${new Date().toLocaleString()}`,
      schema: schema,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const savedSchemas = this.getSavedSchemas()
    savedSchemas.push(schemaData)
    
    localStorage.setItem(this.storageKey, JSON.stringify(savedSchemas))
    return schemaData.id
  }

  /**
   * 更新已保存的 Schema
   */
  updateSchema(id, schema, name = null) {
    const validation = validateSchema(schema)
    if (!validation.valid) {
      throw new Error(`Invalid schema: ${validation.error}`)
    }

    const savedSchemas = this.getSavedSchemas()
    const index = savedSchemas.findIndex(item => item.id === id)
    
    if (index === -1) {
      throw new Error('Schema not found')
    }

    savedSchemas[index].schema = schema
    savedSchemas[index].updatedAt = new Date().toISOString()
    
    if (name) {
      savedSchemas[index].name = name
    }

    localStorage.setItem(this.storageKey, JSON.stringify(savedSchemas))
  }

  /**
   * 获取所有已保存的 Schema
   */
  getSavedSchemas() {
    try {
      const data = localStorage.getItem(this.storageKey)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Failed to load saved schemas:', error)
      return []
    }
  }

  /**
   * 根据 ID 获取 Schema
   */
  getSchemaById(id) {
    const savedSchemas = this.getSavedSchemas()
    return savedSchemas.find(item => item.id === id)
  }

  /**
   * 删除 Schema
   */
  deleteSchema(id) {
    const savedSchemas = this.getSavedSchemas()
    const filteredSchemas = savedSchemas.filter(item => item.id !== id)
    localStorage.setItem(this.storageKey, JSON.stringify(filteredSchemas))
  }

  /**
   * 保存当前工作中的 Schema
   */
  saveCurrentSchema(schema) {
    localStorage.setItem(this.currentSchemaKey, JSON.stringify(schema))
  }

  /**
   * 获取当前工作中的 Schema
   */
  getCurrentSchema() {
    try {
      const data = localStorage.getItem(this.currentSchemaKey)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Failed to load current schema:', error)
      return null
    }
  }

  /**
   * 清除当前工作中的 Schema
   */
  clearCurrentSchema() {
    localStorage.removeItem(this.currentSchemaKey)
  }

  /**
   * 生成唯一 ID
   */
  generateId() {
    return 'schema_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
  }
}

/**
 * 文件导入导出管理
 */
export class FileManager {
  /**
   * 导出 Schema 为 JSON 文件
   */
  static exportSchemaAsJson(schema, filename = null) {
    const validation = validateSchema(schema)
    if (!validation.valid) {
      throw new Error(`Invalid schema: ${validation.error}`)
    }

    const schemaJson = JSON.stringify(schema, null, 2)
    const blob = new Blob([schemaJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `page-schema-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * 从 JSON 文件导入 Schema
   */
  static importSchemaFromJson() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      
      input.onchange = (e) => {
        const file = e.target.files[0]
        if (!file) {
          reject(new Error('No file selected'))
          return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const schema = JSON.parse(e.target.result)
            const validation = validateSchema(schema)
            
            if (validation.valid) {
              resolve(schema)
            } else {
              reject(new Error(`Invalid schema file: ${validation.error}`))
            }
          } catch (error) {
            reject(new Error(`Failed to parse JSON file: ${error.message}`))
          }
        }
        
        reader.onerror = () => {
          reject(new Error('Failed to read file'))
        }
        
        reader.readAsText(file)
      }
      
      input.click()
    })
  }

  /**
   * 导出 Schema 为模板文件
   */
  static exportSchemaAsTemplate(schema, templateName, description = '') {
    const validation = validateSchema(schema)
    if (!validation.valid) {
      throw new Error(`Invalid schema: ${validation.error}`)
    }

    const template = {
      name: templateName,
      description: description,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      schema: schema
    }

    const templateJson = JSON.stringify(template, null, 2)
    const blob = new Blob([templateJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `template-${templateName.replace(/\s+/g, '-').toLowerCase()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

/**
 * Schema 历史记录管理
 */
export class HistoryManager {
  constructor(maxHistorySize = 50) {
    this.history = []
    this.currentIndex = -1
    this.maxHistorySize = maxHistorySize
  }

  /**
   * 添加历史记录
   */
  addHistory(schema) {
    // 移除当前位置之后的所有历史记录
    this.history = this.history.slice(0, this.currentIndex + 1)
    
    // 添加新的历史记录
    this.history.push(JSON.parse(JSON.stringify(schema)))
    this.currentIndex = this.history.length - 1
    
    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
      this.currentIndex--
    }
  }

  /**
   * 撤销操作
   */
  undo() {
    if (this.canUndo()) {
      this.currentIndex--
      return JSON.parse(JSON.stringify(this.history[this.currentIndex]))
    }
    return null
  }

  /**
   * 重做操作
   */
  redo() {
    if (this.canRedo()) {
      this.currentIndex++
      return JSON.parse(JSON.stringify(this.history[this.currentIndex]))
    }
    return null
  }

  /**
   * 是否可以撤销
   */
  canUndo() {
    return this.currentIndex > 0
  }

  /**
   * 是否可以重做
   */
  canRedo() {
    return this.currentIndex < this.history.length - 1
  }

  /**
   * 清空历史记录
   */
  clear() {
    this.history = []
    this.currentIndex = -1
  }

  /**
   * 获取历史记录信息
   */
  getHistoryInfo() {
    return {
      total: this.history.length,
      current: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    }
  }
}

// 创建全局实例
export const localStorageManager = new LocalStorageManager()
export const fileManager = FileManager
export const historyManager = new HistoryManager()

// 自动保存功能
export class AutoSaveManager {
  constructor(saveCallback, interval = 30000) { // 默认30秒自动保存
    this.saveCallback = saveCallback
    this.interval = interval
    this.timer = null
    this.enabled = false
  }

  /**
   * 启用自动保存
   */
  enable() {
    this.enabled = true
    this.startTimer()
  }

  /**
   * 禁用自动保存
   */
  disable() {
    this.enabled = false
    this.stopTimer()
  }

  /**
   * 重置定时器
   */
  reset() {
    if (this.enabled) {
      this.stopTimer()
      this.startTimer()
    }
  }

  /**
   * 开始定时器
   */
  startTimer() {
    this.timer = setInterval(() => {
      if (this.saveCallback) {
        this.saveCallback()
      }
    }, this.interval)
  }

  /**
   * 停止定时器
   */
  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}
