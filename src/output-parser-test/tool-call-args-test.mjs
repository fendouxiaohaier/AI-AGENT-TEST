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
  nationality: z.string().describe("国籍"),
  fields: z.array(z.string()).describe("研究领域列表"),
  awards: z
    .array(
      z.object({
        name: z.string().describe("奖项名称"),
        year: z.number().describe("获奖年份"),
        reason: z.string().optional().describe("获奖原因"),
      }),
    )
    .describe("获得的重要奖项列表"),
  major_achievements: z.array(z.string()).describe("主要成就列表"),
  famous_theories: z
    .array(
      z.object({
        name: z.string().describe("理论名称"),
        year: z.number().optional().describe("提出年份"),
        description: z.string().describe("理论简要描述"),
      }),
    )
    .describe("著名理论列表"),
  education: z
    .object({
      university: z.string().describe("主要毕业院校"),
      degree: z.string().describe("学位"),
      graduation_year: z.number().optional().describe("毕业年份"),
    })
    .optional()
    .describe("教育背景"),
  biography: z.string().describe("简短传记，100字以内"),
});

const modelWithTool = model.bindTools([
  {
    name: "extract_scientist_info",
    description: "提取和结构化科学家的详细信息",
    schema: scientistSchema,
  },
]);
const question = `请介绍一下爱因斯坦的信息。}`;

try {
  console.log(
    "🤔 正在调用大模型（使用 StructuredOutputParser）...\n，question是：",
    question,
  );

  const response = await modelWithTool.invoke(question);

  console.log("response.tool_calls:", response.tool_calls);
  // 获取结构化结果
  const result = response.tool_calls[0].args;

  console.log("结构化结果:", JSON.stringify(result, null, 2));
  console.log(`\n姓名: ${result.name}`);
  console.log(`出生年份: ${result.birth_year}`);
  console.log(`国籍: ${result.nationality}`);
  console.log(`研究领域: ${result.fields.join(", ")}`);
} catch (error) {
  console.error("❌ 错误:", error.message);
}
