# 🚀 VSCode AI Extension Starter Kit (with LiteLLM Proxy)

這是一個專為開發者打造的 VSCode AI 擴充套件開發模板。
透過結合 **LiteLLM Proxy** 作為統一的 API 閘道，本專案完美解決了直接呼叫免費 AI API（如 Groq）容易遇到 `429 Rate Limit`（請求限制）的問題。

## ✨ 核心特色與架構

當你在 VSCode 中觸發 AI 請求時，資料流向如下：

**VSCode Extension** ──(使用自訂的 Master Key)──> **LiteLLM Proxy (Localhost)** ──> **自動分發路由**

LiteLLM 的路由策略（自動備援）：
1. **Primary (首選)**：`Groq` (Llama-3.3-70b) - 速度極快、免費額度高。
2. **Fallback (備援)**：`OpenRouter` (Qwen-2.5-Coder) - 當 Groq 達到次數限制或無回應時，自動且無縫地切換到此備援 API，確保你的 Extension 永遠能獲得回應。

---

## 🛠️ 系統需求 (Prerequisites)

在開始之前，請確保你的電腦已安裝以下工具：
* **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (若使用 Windows，強烈建議搭配 WSL2 運作)
* **[Node.js](https://nodejs.org/)** (v18 或以上版本)
* **[Visual Studio Code](https://code.visualstudio.com/)**
* 取得你的 [Groq API Key](https://console.groq.com/) 與 [OpenRouter API Key](https://openrouter.ai/)

---

## 🚀 快速開始 (Quick Start)

本專案分為兩個主要部分：後端的 **LiteLLM Proxy** 與前端的 **VSCode Extension**。請依照以下步驟依序啟動。

### 步驟一：啟動 LiteLLM 代理伺服器

1. 進入 `litellm/` 資料夾，複製環境變數範本：
   ```bash
   cp .env.example .env

```

2. 打開 `.env` 檔案，填入你的 API Keys：
```env
GROQ_API_KEY=gsk_填入你的_Groq_Key
OPENROUTER_API_KEY=sk-or-v1-填入你的_OpenRouter_Key

# 這是保護你本地代理伺服器的密碼，Extension 會用這個密碼來呼叫 API
LITELLM_MASTER_KEY=sk-my-vscode-extension

```


3. 使用 Docker Compose 啟動服務：
```bash
docker compose up -d

```


4. 測試服務是否正常運作（LiteLLM 預設跑在 `http://localhost:4000`）：
* 在瀏覽器輸入 `http://localhost:4000/health`，若顯示正常即代表啟動成功。



---

### 步驟二：安裝與測試 VSCode Extension

1. 開啟終端機，進入 `extension/` 資料夾。
2. 安裝擴充套件所需的 NPM 依賴包：
```bash
npm install

```


3. 在 VSCode 中開啟這個 `extension/` 資料夾。
4. **啟動偵錯模式**：
* 按下鍵盤上的 `F5` 鍵，VSCode 會開啟一個全新的「延伸模組開發宿主 (Extension Development Host)」視窗。這個新視窗就是已經安裝好你正在開發的 Extension 的環境。


5. **使用擴充套件**：
* 在新開啟的 VSCode 視窗中，按下 `Ctrl + Shift + P` (Mac 為 `Cmd + Shift + P`) 開啟命令面板。
* 輸入並執行你註冊的指令（例如：`Ask AI: 向 AI 提問` 或你的自訂指令）。
* 擴充套件將會呼叫本地的 LiteLLM Proxy，並將 AI 回覆顯示在畫面中。



---

## 📂 專案結構說明

```text
vscode-ai-starter/
│
├── extension/                # VSCode 擴充套件原始碼
│   ├── src/                  # 包含 TypeScript 主程式 (如 extension.ts)
│   ├── package.json          # 定義 Extension 的指令與依賴
│   └── tsconfig.json         # TypeScript 設定檔
│
└── litellm/                  # API 代理伺服器設定
    ├── docker-compose.yml    # Docker 容器設定檔
    ├── litellm.yaml          # 模型路由與 Fallback (備援) 邏輯設定
    └── .env                  # API Key 存放處 (勿上傳至 Git)

```

## 🔧 如何自訂與擴充模型？

如果你未來想加入 Claude、Gemini 或本地端的 Ollama 模型，**你完全不需要修改 Extension 的程式碼**。

你只需要：

1. 打開 `litellm/litellm.yaml`
2. 在 `model_list` 中新增提供者與模型名稱
3. 在 `router_settings` 中調整備援順序
4. 在終端機執行 `docker compose restart litellm` 即可套用新設定！

