import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { repeat } from "lodash-es";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0, // Temperature 值越高，AI 输出的多样性越强，越容易“天马行空”地发挥联想；值越低，输出越保守、越确定。
  configuration: {
    baseURL:
      "https://ws-cd6xglxa8t0fof3x.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
    // baseURL: process.env.OPENAI_BASE_URL,
  },
});

// 简单的问题，要求 JSON 格式返回
const question =
  "请介绍一下爱因斯坦的信息。请以 JSON 格式返回，我可以直接parse。包含以下字段：name（姓名）、birth_year（出生年份）、nationality（国籍）、major_achievements（主要成就，数组）、famous_theory（著名理论）。";

try {
  console.log("🤔 正在调用大模型...\n");

  const stream = await model.stream(question);

  let chunkCount = 0;
  let fullContent = "";
  for await (const chunk of stream) {
    // console.log(chunk);
    // console.log(repeat("=", 80));
    chunkCount++;
    const content = chunk.content;
    fullContent += content;

    process.stdout.write(content); // 实时显示流式文本
  }

  // console.log(`\n\n✅ 共接收 ${chunkCount} 个数据块\n`);
  // console.log(`📝 完整内容长度: ${fullContent.length} 字符`);
} catch (error) {
  console.error("❌ 错误:", error.message);
}
