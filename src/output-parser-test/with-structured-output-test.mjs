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

try {
  // 定义结构化输出的 schema
  const scientistSchema = z.object({
    name: z.string().describe("科学家的全名"),
    birth_year: z.number().describe("出生年份"),
    nationality: z.string().describe("国籍"),
    fields: z.array(z.string()).describe("研究领域列表"),
  });

  // 使用 withStructuredOutput 方法
  const structuredModel = model.withStructuredOutput(scientistSchema);

  // 调用模型
  const result = await structuredModel.invoke("介绍一下爱因斯坦,返回json格式");

  console.log("结构化结果:", JSON.stringify(result, null, 2));
  console.log(`\n姓名: ${result.name}`);
  console.log(`出生年份: ${result.birth_year}`);
  console.log(`国籍: ${result.nationality}`);
  console.log(`研究领域: ${result.fields.join(", ")}`);
} catch (error) {
  console.error("❌ 错误:", error.message);
}
