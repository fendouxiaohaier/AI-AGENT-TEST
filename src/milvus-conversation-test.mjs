import "dotenv/config";
import {
  DataType,
  IndexType,
  MetricType,
  MilvusClient,
} from "@zilliz/milvus2-sdk-node";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";

const COLLECTION_NAME = "conversations";
const VECTOR_DIM = 1024;

// ==================== 初始化大语言模型（用于生成回答） ====================
const model = new ChatOpenAI({
  temperature: 0, // 温度设为 0，使回答更确定
  model: process.env.MODEL_NAME, // 模型名称（如 gpt-3.5-turbo）
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 可自定义 API 端点（如代理）
  },
});

const client = new MilvusClient({
  address: process.env.MILVUS_URI,
  token: process.env.MILVUS_TOKEN,
});

// ==================== 初始化嵌入模型（用于文档向量化） ====================
const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.EMBEDDINGS_MODEL_NAME, // 嵌入模型名称（如 text-embedding-ada-002）
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  dimensions: VECTOR_DIM,
});

async function getEmbedding(text) {
  const result = await embeddings.embedQuery(text);
  return result;
}

/**
 * 从 Milvus 中检索相关的历史对话
 */
async function retrieveRelevantConversations(query, k = 2) {
  try {
    // 生成查询的向量
    const queryVector = await getEmbedding(query);

    await client.loadCollection({ collection_name: COLLECTION_NAME });
    // 在 Milvus 中搜索相似的对话
    const searchResult = await client.search({
      collection_name: COLLECTION_NAME,
      vector: queryVector,
      limit: k,
      metric_type: MetricType.COSINE,
      output_fields: ["id", "content", "round", "timestamp"],
    });

    return searchResult.results;
  } catch (error) {
    console.error("检索对话时出错:", error.message);
    return [];
  }
}

async function main() {
  try {
    await client.connectPromise;

    await client.createCollection({
      collection_name: COLLECTION_NAME,
      fields: [
        {
          name: "id",
          data_type: DataType.VarChar,
          max_length: 50,
          is_primary_key: true,
        },
        { name: "vector", data_type: DataType.FloatVector, dim: VECTOR_DIM },
        { name: "content", data_type: DataType.VarChar, max_length: 5000 },
        { name: "round", data_type: DataType.Int64 },
        { name: "timestamp", data_type: DataType.VarChar, max_length: 100 },
      ],
    });

    await client.createIndex({
      collection_name: COLLECTION_NAME,
      field_name: "vector",
      index_type: IndexType.IVF_FLAT,
      metric_type: MetricType.COSINE,
    });

    const conversations = [
      {
        id: "conv_001",
        content:
          "用户: 我叫赵六，是一名数据科学家\n助手: 很高兴认识你，赵六！数据科学是一个很有趣的领域。",
        round: 1,
        timestamp: new Date().toISOString(),
      },
      {
        id: "conv_002",
        content:
          "用户: 我最近在研究机器学习算法\n助手: 机器学习确实很有意思，你在研究哪些算法呢？",
        round: 2,
        timestamp: new Date().toISOString(),
      },
      {
        id: "conv_003",
        content:
          "用户: 我喜欢打篮球和看电影\n助手: 运动和文化娱乐都是很好的爱好！",
        round: 3,
        timestamp: new Date().toISOString(),
      },
      {
        id: "conv_004",
        content: "用户: 我周末经常去电影院\n助手: 看电影是很好的放松方式。",
        round: 4,
        timestamp: new Date().toISOString(),
      },
      {
        id: "conv_005",
        content:
          "用户: 我的职业是软件工程师\n助手: 软件工程师是个很有前景的职业！",
        round: 5,
        timestamp: new Date().toISOString(),
      },
    ];

    const conversationData = await Promise.all(
      conversations.map(async (conv) => ({
        ...conv,
        vector: await getEmbedding(conv.content),
      })),
    );

    const insertResult = await client.insert({
      collection_name: COLLECTION_NAME,
      data: conversationData,
    });

  } catch (error) {
    console.log(error);
  }
}

// main();

const retrievalMemoryDemo = async () => {
  try {
const question = "我之前提到的机器学习项目进展如何？";

    const retrievedConversations = await retrieveRelevantConversations(
      question,
      2,
    );

    let relevantHistory = "";
    if (retrievedConversations.length) {
      // 构建上下文
      relevantHistory = retrievedConversations
        .map((conv, idx) => {
          return `[历史对话 ${idx + 1}]
轮次: ${conv.round}
${conv.content}`;
        })
        .join("\n\n━━━━━ \n\n");
    } else {
      console.log("未找到相关历史对话");
    }

    // 2. 构建 prompt（使用检索到的历史作为上下文）
    const contextMessages = relevantHistory
      ? [
          new HumanMessage(
            `相关历史对话：\n${relevantHistory}\n\n用户问题: ${question}`,
          ),
        ]
      : [new HumanMessage(question)];
    const response = await model.invoke(contextMessages);

    const conversationText = `用户: ${question}\n助手: ${response.content}`;
    console.log("AI助手最后的回答", conversationText);
    const convId = `conv_${Date.now()}_${1}`;
    const convVector = await getEmbedding(conversationText);

    await client.insert({
      collection_name: COLLECTION_NAME,
      data: [
        {
          id: convId,
          vector: convVector,
          content: conversationText,
          round: 1,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    await client.closeConnection();
  } catch (error) {
    console.log(error);
  }
};


retrievalMemoryDemo();