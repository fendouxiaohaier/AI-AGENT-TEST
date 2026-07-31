import "dotenv/config";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import {
  AIMessage,
  getBufferString,
  HumanMessage,
  SystemMessage,
  trimMessages,
} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { map } from "lodash-es";
import { getEncoding } from "js-tiktoken";

// ==================== 初始化大语言模型（用于生成回答） ====================
const model = new ChatOpenAI({
  temperature: 0, // 温度设为 0，使回答更确定
  model: process.env.MODEL_NAME, // 模型名称（如 gpt-3.5-turbo）
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 可自定义 API 端点（如代理）
  },
});

// 总结历史对话的函数
async function summarizeHistory(messages) {
  if (messages.length === 0) return "";

  const conversationText = getBufferString(messages, {
    humanPrefix: "用户",
    aiPrefix: "助手",
  });

  const summaryPrompt = `请总结以下对话的核心内容，保留重要信息：

${conversationText}

总结：`;

  const summaryResponse = await model.invoke([
    new SystemMessage(summaryPrompt),
  ]);
  return summaryResponse;
}

async function summarizationMemoryByCountDemo() {
  const history = new InMemoryChatMessageHistory();
  const maxMessages = 6; // 超过 6 条消息时触发总结

  const messages = [
    { type: "human", content: "我想学做红烧肉，你能教我吗？" },
    {
      type: "ai",
      content:
        "当然可以！红烧肉是一道经典的中式菜肴。首先需要准备五花肉、冰糖、生抽、老抽、料酒等材料。",
    },
    { type: "human", content: "五花肉需要切多大块？" },
    {
      type: "ai",
      content:
        "建议切成3-4厘米见方的块，这样既容易入味，口感也更好。切好后可以用开水焯一下去除血沫。",
    },
    { type: "human", content: "炒糖色的时候有什么技巧吗？" },
    {
      type: "ai",
      content:
        "炒糖色是关键步骤。用小火慢慢炒，等冰糖完全融化变成焦糖色，冒小泡时就可以下肉了。注意不要炒过头，否则会发苦。",
    },
    { type: "human", content: "需要炖多长时间？" },
    {
      type: "ai",
      content:
        "一般需要炖40-60分钟，用小火慢炖，直到肉变得软糯入味。可以用筷子戳一下，能轻松戳透就说明好了。",
    },
    { type: "human", content: "最后收汁的时候要注意什么？" },
    {
      type: "ai",
      content:
        "收汁时要用大火，不断翻动，让汤汁均匀包裹在肉块上。看到汤汁变得浓稠，颜色红亮就可以出锅了。",
    },
  ];

  // 添加所有消息
  for (const msg of messages) {
    if (msg.type === "human") {
      await history.addMessage(new HumanMessage(msg.content));
    } else {
      await history.addMessage(new AIMessage(msg.content));
    }
  }

  let allMessages = await history.getMessages();

  // 如果消息过多，触发总结
  if (allMessages.length >= maxMessages) {
    const keepRecent = 2; // 保留最近 2 条消息

    // 分离要保留的消息和要总结的消息
    const recentMessages = allMessages.slice(-keepRecent);
    const messagesToSummarize = allMessages.slice(0, -keepRecent);

    // 总结将被丢弃的旧消息
    const summary = await summarizeHistory(messagesToSummarize);

    // 清空历史消息，只保留最近的消息
    await history.clear();

    await history.addMessage(summary);
    for (const msg of recentMessages) {
      await history.addMessage(msg);
    }

    const newMessages = await history.getMessages();

    console.log(
      "现在剩余的消息:",
      map(newMessages, (m) => `${m.constructor.name}: ${m.content}`).join(
        "\n  ",
      ),
    );
  }
}

// 计算消息数组的总 token 数量
function countTokens(messages, encoder) {
  let total = 0;
  for (const msg of messages) {
    const content =
      typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content);
    total += encoder.encode(content).length;
  }
  return total;
}

const summarizationMemoryByTokenDemo = async () => {
  const history = new InMemoryChatMessageHistory();
  const maxTokens = 100; // 限制最多 100 个 token

  // 按照gpt的编码来获取token数量
  const enc = getEncoding("cl100k_base");

  const messages = [
    { type: "human", content: "我想学做红烧肉，你能教我吗？" },
    {
      type: "ai",
      content:
        "当然可以！红烧肉是一道经典的中式菜肴。首先需要准备五花肉、冰糖、生抽、老抽、料酒等材料。",
    },
    { type: "human", content: "五花肉需要切多大块？" },
    {
      type: "ai",
      content:
        "建议切成3-4厘米见方的块，这样既容易入味，口感也更好。切好后可以用开水焯一下去除血沫。",
    },
    { type: "human", content: "炒糖色的时候有什么技巧吗？" },
    {
      type: "ai",
      content:
        "炒糖色是关键步骤。用小火慢慢炒，等冰糖完全融化变成焦糖色，冒小泡时就可以下肉了。注意不要炒过头，否则会发苦。",
    },
    { type: "human", content: "需要炖多长时间？" },
    {
      type: "ai",
      content:
        "一般需要炖40-60分钟，用小火慢炖，直到肉变得软糯入味。可以用筷子戳一下，能轻松戳透就说明好了。",
    },
    { type: "human", content: "最后收汁的时候要注意什么？" },
    {
      type: "ai",
      content:
        "收汁时要用大火，不断翻动，让汤汁均匀包裹在肉块上。看到汤汁变得浓稠，颜色红亮就可以出锅了。",
    },
  ];

  // 添加所有消息
  for (const msg of messages) {
    if (msg.type === "human") {
      await history.addMessage(new HumanMessage(msg.content));
    } else {
      await history.addMessage(new AIMessage(msg.content));
    }
  }

  const allMessages = await history.getMessages();

  // 使用 trimMessages API：使用 js-tiktoken 计算 token 数量
  const trimmedMessages = await trimMessages(allMessages, {
    maxTokens: maxTokens,
    tokenCounter: async (msgs) => countTokens(msgs, enc),
    strategy: "last", // 保留最近的消息
  });

  // 超出了最大token
  if (trimmedMessages.length < allMessages.length) {
    const keepRecent = trimmedMessages.length;

    // 分离要保留的消息和要总结的消息
    const recentMessages = allMessages.slice(-keepRecent);
    const messagesToSummarize = allMessages.slice(0, -keepRecent);

    // 总结将被丢弃的旧消息
    const summary = await summarizeHistory(messagesToSummarize);

    // 清空历史消息，只保留最近的消息
    await history.clear();

    await history.addMessage(summary);
    for (const msg of recentMessages) {
      await history.addMessage(msg);
    }

    const newMessages = await history.getMessages();

    console.log(
      "现在剩余的消息:",
      map(newMessages, (m) => `${m.constructor.name}: ${m.content}`).join(
        "\n  ",
      ),
    );
  }
};

// summarizationMemoryByCountDemo();
summarizationMemoryByTokenDemo();
