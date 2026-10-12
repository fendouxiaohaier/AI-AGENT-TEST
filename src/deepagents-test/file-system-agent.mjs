import "dotenv/config";
import {
  MilvusClient,
  DataType,
  MetricType,
  IndexType,
} from "@zilliz/milvus2-sdk-node";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain";
import { OpenAIEmbeddings } from "@langchain/openai";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createFilesystemMiddleware, FilesystemBackend } from "deepagents";
import { HumanMessage } from "@langchain/core/messages";

console.log('process.env.MODEL_NAME', process.env.MODEL_NAME)

// ==================== 初始化大语言模型（用于生成回答） ====================
const model = new ChatOpenAI({
  temperature: 0, // 温度设为 0，使回答更确定
  model: process.env.MODEL_NAME, // 模型名称（如 gpt-3.5-turbo）
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 可自定义 API 端点（如代理）
  },
});

const workspaceDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "workspace",
);

fs.rmSync(workspaceDir, { recursive: true, force: true });
fs.mkdirSync(workspaceDir);

const agent = createAgent({
  model,
  tools: [],
  systemPrompt:
    "工作区根路径为 /。用 ls、read_file、write_file、edit_file 操作文件，路径以 / 开头。中文回答。",
  middleware: [
    createFilesystemMiddleware({
      backend: new FilesystemBackend({
        rootDir: workspaceDir,
        virtualMode: true,
      }),
    }),
  ],
});

const { messages } = await agent.invoke(
  {
    messages: [
      new HumanMessage(
        "write_file 创建 /todo.md（三条待办），edit_file 把第一条标为完成，ls /，一句话总结。",
      ),
    ],
  },
  { recursionLimit: 20 },
);
for (const m of messages) {
  for (const t of m.tool_calls ?? []) console.log("使用到的工具", t.name);
}
console.log("回复:", messages.at(-1)?.content);
