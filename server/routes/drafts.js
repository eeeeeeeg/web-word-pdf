const express = require("express");
const router = express.Router();
const DraftService = require("../services/DraftService");

/**
 * 获取所有草稿
 * GET /api/drafts
 */
router.get("/", async (req, res) => {
  try {
    const drafts = await DraftService.getAllDrafts();
    res.json({
      success: true,
      data: drafts,
      message: "获取草稿列表成功",
    });
  } catch (error) {
    console.error("获取草稿列表失败:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "获取草稿列表失败",
    });
  }
});

/**
 * 根据ID获取草稿
 * GET /api/drafts/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const draft = await DraftService.getDraftById(id);

    if (!draft) {
      return res.status(404).json({
        success: false,
        message: "草稿不存在",
      });
    }

    res.json({
      success: true,
      data: draft,
      message: "获取草稿成功",
    });
  } catch (error) {
    console.error("获取草稿失败:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "获取草稿失败",
    });
  }
});

/**
 * 创建新草稿
 * POST /api/drafts
 */
router.post("/", async (req, res) => {
  try {
    const { schema, name } = req.body;

    if (!schema) {
      return res.status(400).json({
        success: false,
        message: "Schema数据不能为空",
      });
    }

    const draft = await DraftService.createDraft(schema, name);

    res.status(201).json({
      success: true,
      data: draft,
      message: "草稿创建成功",
    });
  } catch (error) {
    console.error("创建草稿失败:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "创建草稿失败",
    });
  }
});

/**
 * 更新草稿
 * PUT /api/drafts/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { schema, name } = req.body;

    const draft = await DraftService.updateDraft(id, schema, name);

    if (!draft) {
      return res.status(404).json({
        success: false,
        message: "草稿不存在",
      });
    }

    res.json({
      success: true,
      data: draft,
      message: "草稿更新成功",
    });
  } catch (error) {
    console.error("更新草稿失败:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "更新草稿失败",
    });
  }
});

/**
 * 删除草稿
 * DELETE /api/drafts/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const success = await DraftService.deleteDraft(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: "草稿不存在",
      });
    }

    res.json({
      success: true,
      message: "草稿删除成功",
    });
  } catch (error) {
    console.error("删除草稿失败:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "删除草稿失败",
    });
  }
});

/**
 * 清空所有草稿
 * DELETE /api/drafts
 */
router.delete("/", async (req, res) => {
  try {
    await DraftService.clearAllDrafts();

    res.json({
      success: true,
      message: "所有草稿已清空",
    });
  } catch (error) {
    console.error("清空草稿失败:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "清空草稿失败",
    });
  }
});

/**
 * 将草稿转换为正式版本
 * POST /api/drafts/:id/convert
 */
router.post("/:id/convert", async (req, res) => {
  try {
    const { id } = req.params;
    const { schemaName } = req.body;

    const result = await DraftService.convertDraftToSchema(id, schemaName);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "草稿不存在",
      });
    }

    res.json({
      success: true,
      data: result,
      message: "草稿转换为正式版本成功",
    });
  } catch (error) {
    console.error("转换草稿失败:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "转换草稿失败",
    });
  }
});

/**
 * 获取草稿统计信息
 * GET /api/drafts/stats
 */
router.get("/stats", async (req, res) => {
  try {
    const stats = await DraftService.getDraftStats();

    res.json({
      success: true,
      data: stats,
      message: "获取草稿统计成功",
    });
  } catch (error) {
    console.error("获取草稿统计失败:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "获取草稿统计失败",
    });
  }
});

/**
 * 备份草稿
 * POST /api/drafts/:id/backup
 */
router.post("/:id/backup", async (req, res) => {
  try {
    const { id } = req.params;

    const success = await DraftService.backupDraft(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: "草稿不存在",
      });
    }

    res.json({
      success: true,
      message: "草稿备份成功",
    });
  } catch (error) {
    console.error("备份草稿失败:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "备份草稿失败",
    });
  }
});

module.exports = router;
