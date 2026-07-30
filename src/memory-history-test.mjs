import "dotenv/config";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { fileURLToPath } from "url";
import { FileSystemChatMessageHistory } from "@langchain/community/stores/message/file_system";
import { forEach, repeat } from "lodash-es";

// ==================== 初始化大语言模型（用于生成回答） ====================
const model = new ChatOpenAI({
  temperature: 0, // 温度设为 0，使回答更确定
  model: process.env.MODEL_NAME, // 模型名称（如 gpt-3.5-turbo）
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL, // 可自定义 API 端点（如代理）
  },
});

async function inMemoryDemo() {
  const history = new InMemoryChatMessageHistory();

  const systemMessage = new SystemMessage(
    "你是一个友好、幽默的做菜助手，喜欢分享美食和烹饪技巧。",
  );

  const userMessage1 = new HumanMessage("你今天吃的什么？");
  await history.addMessage(userMessage1);

  const messages1 = [systemMessage, ...(await history.getMessages())];
  const response1 = await model.invoke(messages1);
  await history.addMessage(response1);

  console.log(`第一轮助手回答: ${response1.content}\n`);
  const userMessage2 = new HumanMessage("好吃吗？");
  await history.addMessage(userMessage2);

  const messages2 = [systemMessage, ...(await history.getMessages())];
  const response2 = await model.invoke(messages2);
  await history.addMessage(response2);

  console.log(`第二轮助手回答: ${response2.content}\n`);

  const allMessages = await history.getMessages();
  console.log(`共保存了 ${allMessages.length} 条消息：`);
  allMessages.forEach((msg, index) => {
    const type = msg.type;
    const prefix = type === "human" ? "用户" : "助手";
    console.log(
      `  ${index + 1}. [${prefix}]: ${msg.content.substring(0, 50)}...`,
    );
  });
}

async function fileHistoryDemo() {
  // 指定存储文件的路径

  const filePath = fileURLToPath(
    new URL("../chat_history.json", import.meta.url),
  );
  const sessionId = "user_session_001";

  // 系统提示词
  const systemMessage = new SystemMessage(
    "你是一个友好的做菜助手，喜欢分享美食和烹饪技巧。",
  );

  console.log("[第一轮对话]");
  const history = new FileSystemChatMessageHistory({
    filePath: filePath,
    sessionId: sessionId,
  });

  const userMessage1 = new HumanMessage("红烧肉怎么做");

  await history.addMessage(userMessage1);

  const messages1 = [systemMessage, ...(await history.getMessages())];
  const response1 = await model.invoke(messages1);
  await history.addMessage(response1);
  console.log(`第一轮助手回答: ${response1.content}`);

  const userMessage2 = new HumanMessage("好吃吗？");
  await history.addMessage(userMessage2);
  const messages2 = [systemMessage, ...(await history.getMessages())];
  const response2 = await model.invoke(messages2);
  await history.addMessage(response2);

  console.log(`第二轮助手答案: ${response2.content}`);
}

const readFileHistoryDemo = async () => {
  const filePath = fileURLToPath(
    new URL("../chat_history.json", import.meta.url),
  );
  const sessionId = "user_session_001";

  const history = new FileSystemChatMessageHistory({
    filePath: filePath,
    sessionId: sessionId,
  });

  // 系统提示词
  const systemMessage = new SystemMessage(
    "你是一个友好、幽默的做菜助手，喜欢分享美食和烹饪技巧。",
  );

  const restoredMessages = await history.getMessages();

  forEach(restoredMessages, (msg, index) => {
    const type = msg.type;
    const prefix = type === "human" ? "用户" : "助手";
    console.log(
      `  ${index + 1}. [${prefix}]: ${msg.content.substring(0, 50)}...`,
    );
    console.log(repeat("=", 80));
  });

  const userMessage3 = new HumanMessage("需要哪些食材？");
  await history.addMessage(userMessage3);

  const messages3 = [systemMessage, ...(await history.getMessages())];
  const response3 = await model.invoke(messages3);
  await history.addMessage(response3);

  console.log(`助手最后的回答: ${response3.content}`);
};

(function main() {
  // inMemoryDemo();
  // fileHistoryDemo();
  readFileHistoryDemo();
})();
