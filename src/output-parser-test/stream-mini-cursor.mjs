import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import {
  executeCommandTool,
  listDirectoryTool,
  readFileTool,
  writeFileTool,
} from "../all-tools.mjs";
import chalk from "chalk";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { JsonOutputToolsParser } from "@langchain/core/output_parsers/openai_tools";
import { repeat } from "lodash-es";
import { ConstitutionalChain } from "@langchain/classic/chains";

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const tools = [
  readFileTool,
  writeFileTool,
  executeCommandTool,
  listDirectoryTool,
];

// 绑定工具到模型
const modelWithTools = model.bindTools(tools);

// Agent 执行函数
async function runAgentWithTools(query, maxIterations = 30) {
  const history = new InMemoryChatMessageHistory();
  history.addMessage(
    new SystemMessage(`你是一个项目管理助手，使用工具完成任务。

当前工作目录: ${process.cwd()}

工具：
1. read_file: 读取文件
2. write_file: 写入文件
3. execute_command: 执行命令（支持 workingDirectory 参数）
4. list_directory: 列出目录

重要规则 - execute_command：
- workingDirectory 参数会自动切换到指定目录
- 当使用 workingDirectory 时，绝对不要在 command 中使用 cd
- 错误示例: { command: "cd react-todo-app && yarn add", workingDirectory: "react-todo-app" }
这是错误的！因为 workingDirectory 已经在 react-todo-app 目录了，再 cd react-todo-app 会找不到目录
- 正确示例: { command: "yarn", workingDirectory: "react-todo-app" }
这样就对了！workingDirectory 已经切换到 react-todo-app，直接执行命令即可

重要规则 - write_file：
- 当写入 React 组件文件（如 App.tsx）时，如果存在对应的 CSS 文件（如 App.css），在其他 import 语句后加上这个 css 的导入
`),
  );

  await history.addMessage(new HumanMessage(query));

  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`));

    const messages = await history.getMessages();

    const rawStream = await modelWithTools.stream(messages);

    // 准备一个空的容器来拼接完整的 AIMessage
    let fullAIMessage = null;

    // 准备一个 tool_call_chunks 的 JSON 增量解析器
    const toolParser = new JsonOutputToolsParser();

    // 记录每个工具调用已打印的长度（用 id 或 filePath 作为 key）
    const printedLengths = new Map();

    // 这里只是进行流失输出
    for await (const chunk of rawStream) {
      // 这里的 chunk 是 AIMessageChunk，把它拼接起来
      fullAIMessage = fullAIMessage ? fullAIMessage.concat(chunk) : chunk;

      let parsedTools = null;
      try {
        parsedTools = await toolParser.parseResult([
          { message: fullAIMessage },
        ]);
      } catch (e) {
        // 解析失败说明 JSON 还不完整，忽略错误继续累积
      }

      // if (parsedTools && parsedTools.length > 0) {
      if (fullAIMessage.tool_calls && fullAIMessage.tool_calls.length > 0) {
        for (const toolCall of fullAIMessage.tool_calls) {
          if ((toolCall.type === "write_file" || toolCall.name === "write_file") && toolCall.args?.content) {
            const toolCallId =
              toolCall.id || toolCall.args.filePath || "default";
            const currentContent = String(toolCall.args.content);
            const previousLength = printedLengths.get(toolCallId);

            if (previousLength === undefined) {
              printedLengths.set(toolCallId, 0);
              console.log(
                chalk.bgBlue(
                  `\n[工具调用] write_file("${toolCall.args.filePath}") - 开始写入（流式预览）\n`,
                ),
              );
            }

            if (currentContent.length > previousLength) {
              const newContent = currentContent.slice(previousLength);
              // console.log(repeat("=", 80));
              // console.log('/n');
              process.stdout.write(newContent);
              printedLengths.set(toolCallId, currentContent.length);
            }
          }
        }
      } else {
        // 当前还没有解析出工具调用时，如果有文本内容就直接输出
        if (chunk.content) {
          process.stdout.write(
            typeof chunk.content === "string"
              ? chunk.content
              : JSON.stringify(chunk.content),
          );
        }
      }
    }

    // 此时 fullAIMessage 已经完美还原，直接存入 history
    await history.addMessage(fullAIMessage);

    // 检查是否有工具调用
    if (!fullAIMessage.tool_calls || fullAIMessage.tool_calls.length === 0) {
      return fullAIMessage.content;
    }

    for (const toolCall of fullAIMessage.tool_calls) {
      const foundTool = tools.find((t) => t.name === toolCall.name);
      if (foundTool) {
        const toolResult = await foundTool.invoke(toolCall.args);
        await history.addMessage(
          new ToolMessage({
            content: toolResult,
            tool_call_id: toolCall.id,
          }),
        );
      }
    }
  }
}

// echo 在 windows 可能不支持，可以去掉 echo 试试，不一定需要用户选择，或者换成 windows 的命令写法
const case1 = `创建一个功能丰富的 React TodoList 应用：

1. 创建项目：echo -e "n\nn" | npx --yes create-vite react-todo-app --template react-ts
2. 修改 src/App.tsx，实现完整功能的 TodoList：
 - 添加、删除、编辑、标记完成
 - 分类筛选（全部/进行中/已完成）
 - 统计信息显示
3. 添加简单样式：
 - 悬停效果
4. 添加动画：
 - 添加/删除时的过渡动画
5. 列出目录确认

注意：使用 yarn，功能要完整，样式要美观，要有动画效果

之后在 react-todo-app 项目中：
1. 使用 yarn add 安装依赖
2. 使用 yarn dev 启动服务器
`;

try {
  await runAgentWithTools(case1);
} catch (error) {
  console.error(`\n❌ 错误: ${error.message}\n`);
}
