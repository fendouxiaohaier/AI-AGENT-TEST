import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import {
  JsonOutputParser,
  StructuredOutputParser,
} from "@langchain/core/output_parsers";
import { z } from "zod";

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
});

const parser = StructuredOutputParser.fromZodSchema(scientistSchema);
const question = `请介绍一下爱因斯坦的信息。${parser.getFormatInstructions()}`;

try {
  console.log(
    "🤔 正在调用大模型（使用 StructuredOutputParser）...\n，question是：",
    question,
  );

  const stream = await model.stream(question);

  let fullContent = "";
  let chunkCount = 0;

  for await (const chunk of stream) {
    chunkCount++;
    const content = chunk.content;
    fullContent += content;

    process.stdout.write(content); // 实时显示流式文本
  }

  const result = await parser.parse(fullContent);

  console.log("\n🎉 解析结果:", result);

  // const result = await parser.parse(response.content);
} catch (error) {
  console.error("❌ 错误:", error.message);
}
