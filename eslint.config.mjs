import js from "@eslint/js";
import globals from "globals";
import reactPlugin from "eslint-plugin-react";
import importPlugin from "eslint-plugin-import";

export default [
  // 1. 基础 JS 推荐配置
  js.configs.recommended,

  // 2. React 推荐配置
  reactPlugin.configs.flat.recommended,

  // 3. Import 插件推荐配置
  importPlugin.flatConfigs.recommended,

  // 4. 【关键修改】配置 Import 解析器
  {
    settings: {
      "import/resolver": {
        // 指定使用 typescript 解析器
        typescript: {
          // 始终尝试查找类型
          alwaysTryTypes: true,
          // 指定 tsconfig.json 的位置。
          // 如果你的项目是 TS 项目，这很重要，因为它能帮你解析路径别名（如 @/）
          // 如果是纯 JS 项目，这行可以省略，或者指向一个 jsconfig.json
          project: "./tsconfig.json",
        },
        // 保留 node 解析器作为后备（可选，但通常 typescript 解析器已经包含了 node 的能力）
        node: {
          extensions: [".js", ".jsx", ".mjs", ".ts", ".tsx"],
        },
      },
    },
  },

  // 5. 自定义覆盖配置
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"], // 建议加上 ts,tsx
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2021,
      },
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": "warn",
    },
  },
];
