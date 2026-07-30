// ==================== 环境与依赖加载 ====================
import "dotenv/config"; // 加载 .env 文件中的环境变量
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import "cheerio";

// ==================== 初始化大语言模型（用于生成回答） ====================
const model = new ChatOpenAI({
  temperature: 0, // 温度设为 0，使回答更确定
  model: process.env.MODEL_NAME, // 模型名称（如 gpt-3.5-turbo）
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 可自定义 API 端点（如代理）
  },
});

// ==================== 初始化嵌入模型（用于文档向量化） ====================
const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.EMBEDDINGS_MODEL_NAME, // 嵌入模型名称（如 text-embedding-ada-002）
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

// ==================== 准备示例文档（故事片段） ====================
const cheerioLoader = new CheerioWebBaseLoader(
  "https://juejin.cn/post/7021923242579329060?searchId=202607291104286F1254CD097A1612594F",
  {
    selector: ".main-area p",
  },
);

const documents = await cheerioLoader.load();

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500, // 每个分块的字符数
  chunkOverlap: 50, // 分块之间的重叠字符数
  separators: ["。", "！", "？"], // 分割符，优先使用段落分隔
});
const splitDocuments = await textSplitter.splitDocuments(documents);

// ==================== 创建内存向量存储（索引文档） ====================
const vectorStore = await MemoryVectorStore.fromDocuments(
  splitDocuments,
  embeddings,
);

// ==================== 定义要提问的问题列表 ====================
const questions = ["我做了什么工作？"];

// ==================== 遍历问题，进行 RAG 检索与生成 ====================
for (const question of questions) {
  console.log("=".repeat(80));
  console.log(`问题: ${question}`);
  console.log("=".repeat(80));

  // ★★★ 优化点：一次性检索，同时获得文档和相似度分数 ★★★
  // 使用 similaritySearchWithScore 代替 retriever + 二次检索
  // 返回值：[Document, 距离值] 数组，距离越小表示越相似
  // k=3 表示返回最相关的 3 个文档
  const scoredResults = await vectorStore.similaritySearchWithScore(
    question,
    2,
  );

  // 从 scoredResults 中提取文档列表（用于构建提示词）
  const retrievedDocs = scoredResults.map(([doc]) => doc);

  // ====== 打印检索结果及相似度（仅用于调试/展示） ======
  console.log("\n【检索到的文档及相似度评分】");
  retrievedDocs.forEach((doc, i) => {
    const distance = scoredResults[i][1]; // 距离值（越小越相似）
    const similarity = (1 - distance).toFixed(4); // 转为相似度（0~1）
    console.log(`\n[文档 ${i + 1}] 相似度: ${similarity}`);
    console.log(`内容: ${doc.pageContent}`);
    console.log(
      `元数据: 章节=${doc.metadata.chapter}, 角色=${doc.metadata.character}, 类型=${doc.metadata.type}, 心情=${doc.metadata.mood}`,
    );
  });

  // ====== 构建提示词（使用检索到的文档作为上下文） ======
  // 注意：这里使用的是 retrievedDocs，它来自 scoredResults，因此 scoredResults
  // 间接参与了提示构建 —— 这是 RAG 的核心步骤
  const context = retrievedDocs
    .map((doc, i) => `[片段${i + 1}]\n${doc.pageContent}`)
    .join("\n\n━━━━━\n\n");

  const prompt = `你是一个文章辅助阅读助手，根据文章内容来解答：
文章内容:
${context}

问题: ${question}

回答:`;

  // ====== 调用大模型生成回答 ======
  console.log("\n【AI 回答】");
  const response = await model.invoke(prompt);
  console.log(response.content);
  console.log("\n");
}
