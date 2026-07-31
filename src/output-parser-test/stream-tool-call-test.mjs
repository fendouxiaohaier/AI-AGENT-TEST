import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import {
  JsonOutputParser,
  StructuredOutputParser,
} from "@langchain/core/output_parsers";
import { z } from "zod";
import { repeat } from "lodash-es";
import { JsonOutputToolsParser } from "@langchain/classic/output_parsers";

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

// 使用 zod 定义复杂的输出结构
const scientistSchema = z.object({
  name: z.string().describe("科学家的全名"),
  birth_year: z.number().describe("出生年份"),
  death_year: z.number().optional().describe("去世年份，如果还在世则不填"),
  nationality: z.string().describe("国籍"),
  fields: z.array(z.string()).describe("研究领域列表"),
});

const modelWithTool = model.bindTools([
  {
    name: "extract_scientist_info",
    description: "提取和结构化科学家的详细信息",
    schema: scientistSchema,
  },
]);
const question = `请介绍一下爱因斯坦的信息。}`;

const parser = new JsonOutputToolsParser();
const chain = modelWithTool.pipe(parser);

try {
  console.log(
    "🤔 正在调用大模型（使用 StructuredOutputParser）...\n，question是：",
    question,
  );

  const stream = await chain.invoke(question);

  let lastContent = ""; // 记录已打印的完整内容
  let finalResult = null; // 存储最终的完整结果

  console.log("📡 实时输出流式内容:\n");

  for await (const chunk of stream) {

    if (chunk) {
      const toolCall = chunk;

      // 获取当前工具调用的完整参数内容
      const currentContent = JSON.stringify(toolCall.args || {}, null, 2);

      if (currentContent.length > lastContent.length) {
        const newText = currentContent.slice(lastContent.length);
        process.stdout.write(newText); // 实时输出到控制台
        lastContent = currentContent; // 更新已读进度
      }

      console.log(toolCall.args);

      console.log(repeat("-", 80));
    }
  }
} catch (error) {
  console.error("❌ 错误:", error.message);
}
