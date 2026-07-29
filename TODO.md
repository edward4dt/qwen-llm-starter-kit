# TODO.md - VSCode AI Extension 開發路線圖

## ✅ v1.0 (已完成 - 基礎版)

- [x] 完整 VSCode Extension 專案結構
- [x] LiteLLM Proxy 串接
- [x] Streaming Chat 支援
- [x] Chat Panel (Sidebar 視圖)
- [x] 健康檢查功能
- [x] 錯誤處理機制
- [x] .env.example 環境變數範本
- [x] Docker Compose 設定 (含 healthcheck)

### 已實現的命令
- `ai-assistant.askAI` - 向 AI 提問 (對話方塊)
- `ai-assistant.focusChatPanel` - 聚焦聊天面板
- `ai-assistant.checkHealth` - 檢查 LiteLLM 健康狀態

### 已實現的功能
- 側邊欄聊天視圖 (Webview)
- 串流式回應顯示
- 對話歷史記錄
- LiteLLM Proxy 健康檢查
- 自動 Fallback 路由 (Groq → OpenRouter)

---

## 🚧 v2.0 (規劃中 - 進階編輯功能)

### Code Edit
- [ ] 讀取目前開啟的檔案內容作為上下文
- [ ] 支援選取程式碼片段進行修改
- [ ] 提供多個修改建議方案

### Inline Edit
- [ ] 直接在編輯器內顯示 AI 建議
- [ ] Diff 預覽 (原始 vs 修改後)
- [ ] 接受/拒絕修改按鈕
- [ ] 快捷鍵支援 (Cmd+I / Ctrl+I)

### Prompt Template
- [ ] 內建常用 Prompt 模板
  - [ ] 解釋程式碼
  - [ ] 重構程式碼
  - [ ] 新增註解
  - [ ] 尋找 Bug
  - [ ] 撰寫測試
- [ ] 自訂 Prompt 模板功能
- [ ] Prompt 變數替換 (如 `{selected_code}`)

### Diff 預覽
- [ ] 使用 VSCode Diff Editor 顯示變更
- [ ] 支援多檔案變更預覽
- [ ] 一鍵套用所有變更

---

## 🔮 v3.0 (未來規劃 - 高階功能)

### OpenHands 整合
- [ ] 支援 OpenHands Agent 協議
- [ ] 自主執行複雜任務
- [ ] 終端機命令建議與執行

### MCP (Model Context Protocol) 支援
- [ ] 整合 MCP Server
- [ ] 存取本地檔案系統
- [ ] 資料庫查詢能力
- [ ] API 呼叫工具

### Tool Calling
- [ ] 定義自訂 Tools
  - [ ] 檔案讀寫
  - [ ] 終端機執行
  - [ ] Git 操作
  - [ ] 網頁搜尋
- [ ] Function Calling 支援
- [ ] 多步驟任務規劃

### 多 Agent 架構
- [ ] 不同角色的 Agent
  - [ ] Code Reviewer
  - [ ] Debugger
  - [ ] Architect
  - [ ] Tester
- [ ] Agent 間協作機制
- [ ] 任務分派與協調

---

## 📝 其他改進項目

### 設定頁面
- [ ] 使用 VSCode Configuration API
- [ ] 可設定的選項
  - [ ] LiteLLM Proxy URL
  - [ ] Master Key
  - [ ] 預設模型
  - [ ] Temperature
  - [ ] Max Tokens
- [ ] 設定 UI (package.json contributes.configuration)

### SecretStorage
- [ ] 使用 vscode.SecretStorage 儲存 API Keys
- [ ] 避免將敏感資訊寫入設定檔
- [ ] 密碼管理功能

### 效能優化
- [ ] 請求快取機制
- [ ] 對話歷史壓縮
- [ ] Token 計數與限制警告

### 使用者體驗
- [ ] 打字機效果優化
- [ ] Markdown 渲染支援 (程式碼高亮)
- [ ] 複製程式碼按鈕
- [ ] 重新產生回應按鈕
- [ ] 對話匯出功能

### 測試與文件
- [ ] 單元測試 (Jest/Mocha)
- [ ] 整合測試
- [ ] 使用文件
- [ ] API 文件

---

## 🎯 優先順序

1. **高優先級** (v2.0 核心功能)
   - Inline Edit + Diff 預覽
   - Prompt Templates
   - 設定頁面

2. **中優先級** (提升可用性)
   - SecretStorage
   - Markdown 渲染
   - 錯誤處理優化

3. **低優先級** (v3.0 進階功能)
   - MCP 支援
   - 多 Agent 架構
   - OpenHands 整合

---

## 📊 版本時程 (預估)

| 版本 | 預計完成時間 | 主要目標 |
|------|-------------|---------|
| v1.0 | ✅ 已完成 | 基礎聊天功能 |
| v2.0 | TBD | 程式碼編輯整合 |
| v3.0 | TBD | 智慧 Agent 系統 |

---

## 📚 參考資源

- [VSCode Extension API](https://code.visualstudio.com/api)
- [LiteLLM Documentation](https://docs.litellm.ai/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [OpenHands](https://github.com/All-Hands-AI/OpenHands)
