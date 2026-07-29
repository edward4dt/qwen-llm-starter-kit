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
- [x] 讀取目前開啟的檔案內容作為上下文
- [x] 支援選取程式碼片段進行修改
- [x] 提供多個修改建議方案

### Inline Edit
- [x] 直接在編輯器內顯示 AI 建議
- [x] Diff 預覽 (原始 vs 修改後)
- [x] 接受/拒絕修改按鈕
- [x] 快捷鍵支援 (Cmd+I / Ctrl+I)

### Prompt Template
- [x] 內建常用 Prompt 模板
  - [x] 解釋程式碼
  - [x] 重構程式碼
  - [x] 新增註解
  - [x] 尋找 Bug
  - [x] 撰寫測試
  - [x] 效能優化
  - [x] 轉換語言
  - [x] 生成文件
- [x] 自訂 Prompt 模板功能
- [x] Prompt 變數替換 (如 `{selected_code}`)

### Diff 預覽
- [x] 使用 VSCode Diff Editor 顯示變更
- [x] 支援多檔案變更預覽
- [x] 一鍵套用所有變更

---

## 🔧 v2.6 (已完成 - @ 自動補全功能)

### @ File Reference (#20)
- [x] `@` 觸發的文件選擇器
- [x] 檔案內容註入到上下文
- [x] ChatMessage 類型擴充支援 context.references
- [x] `@` 自動補全功能
- [x] 檔案大小限制 (< 10KB)
- [ ] LiteLLM Proxy 自訂上下文驗證
- [x] 本地功能測試
- [ ] LiteLLM 日誌驗證

### @ Directory Reference (#26)
- [x] 新增 `getAllFilesInDirectory` 遞迴讀取函數
- [x] 新增 `isValidFile` 檔案過濾邏輯 (排除 node_modules, .git, 二進位檔等)
- [x] 新增 `triggerDirectorySelection` 目錄選擇器 (使用 vscode.window.showOpenDialog)
- [x] 新增 `injectDirectoryContext` 批次註入邏輯 (含 Token 限制)
- [x] 修改 `@` 觸發邏輯以支援目錄選擇 (提供「選擇檔案」/「選擇目錄」選項)
- [x] 修改消息送出邏輯以包含目錄上下文
- [x] 新增進度提示 (vscode.window.withProgress)
- [x] 新增檔案預覽確認對話框
- [x] 新增快捷鍵 (Ctrl+Shift+D / Cmd+Shift+D)
- [x] 擴充 ChatMessage.context.references 以支援多檔案
- [x] 實作檔案數量上限 (預設 10 個)
- [x] 實作單一檔案大小上限 (預設 50KB)
- [x] 實作總 Token 數上限 (預設 50,000)
- [ ] 單位測試與整合測試

---

## 🔧 v2.5 (已完成 - 使用者體驗與效能提升)

### Configuration UI (#21)
- [ ] package.json configuration schema 定義
- [ ] 遷移 .env 設定到 VSCode settings
- [ ] 支援設定選項
  - [ ] LiteLLM Proxy URL
  - [ ] Master Key
  - [ ] 預設模型
  - [ ] Temperature
  - [ ] Max Tokens
- [ ] 設定驗證
- [ ] 更新 README 設定說明

### SecretStorage (#22)
- [ ] 使用 vscode.SecretStorage API 儲存 API Keys
- [ ] 建立命令管理 Master Key (set/update/remove)
- [ ] 現有 .env 用戶遷移邏輯
- [ ] 缺少憑證時的錯誤處理

### Chat UI Enhancements (#23)
- [ ] Markdown 渲染 (markdown-it/marked)
- [ ] 程式碼語法高亮 (highlight.js/Prism)
- [ ] 複製程式碼按鈕
- [ ] 重新產生回應按鈕
- [ ] 打字機效果優化
- [ ] 對話匯出功能 (Markdown/JSON)

### Performance Optimization (#24)
- [ ] 請求快取機制 (TTL)
- [ ] 對話歷史壓縮
- [ ] Token 計數器整合
- [ ] Token 限制警告
- [ ] Webview 資源懶加載

### Testing & Documentation (#25)
- [ ] 單元測試框架 (Jest/Mocha)
- [ ] LiteLLM client 單元測試
- [ ] Prompt templates 單元測試
- [ ] 聊天功能整合測試
- [ ] README 使用文件
- [ ] TypeDoc API 文件
- [ ] 內聯程式碼註解

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

### 目錄選擇功能 (#26)
- [ ] 使用 VSCode Configuration API 新增設定選項
  - [ ] aiAssistant.maxFiles (最大檔案數量，預設 10)
  - [ ] aiAssistant.maxFileSize (單一檔案最大大小 KB，預設 50)
  - [ ] aiAssistant.excludedDirs (排除目錄清單，預設 ["node_modules", ".git", "dist"])
  - [ ] aiAssistant.maxTotalTokens (總 Token 數上限，預設 50000)
- [ ] 在 package.json contributes.configuration 中定義設定 schema
- [ ] 更新 README 說明文件

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

1. **高優先級** (v2.5 核心功能)
   - @ File Reference (#20)
   - @ Directory Reference (#26) - 新增功能
   - Configuration UI (#21)
   - SecretStorage (#22)

2. **中優先級** (提升可用性)
   - Chat UI Enhancements (#23)
   - Performance Optimization (#24)
   - Testing & Documentation (#25)

3. **低優先級** (v3.0 進階功能)
   - MCP 支援
   - 多 Agent 架構
   - OpenHands 整合

---

## 📊 版本時程 (預估)

| 版本 | 預計完成時間 | 主要目標 |
|------|-------------|---------|
| v1.0 | ✅ 已完成 | 基礎聊天功能 |
| v2.0 | ✅ 已完成 | 程式碼編輯整合 |
| v2.5 | ✅ 已完成 | 使用者體驗與效能提升 |
| v2.6 | ✅ 已完成 | @ 自動補全功能 |
| v3.0 | TBD | 智慧 Agent 系統 |

---

## 📚 參考資源

- [VSCode Extension API](https://code.visualstudio.com/api)
- [LiteLLM Documentation](https://docs.litellm.ai/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [OpenHands](https://github.com/All-Hands-AI/OpenHands)
