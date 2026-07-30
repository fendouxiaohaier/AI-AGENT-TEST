import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import "dotenv/config";

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

// const response = await model.invoke('介绍你自己，并回答今天几号？如果不知道今天几号？告诉我为什么？或者怎么才能知道？');
// const response = await model.invoke("讲一个东东和光光是怎么成为朋友的故事");
const response = await model.invoke('近视者，放松眼睛看远处的时候，是戴眼镜还是不带眼镜');

console.log(response.content);
