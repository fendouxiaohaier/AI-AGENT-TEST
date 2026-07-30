import { exec } from "node:child_process";

// 使用正确的包名 create-vite，并加上 --yes 自动跳过 npx 安装确认
const command = "npx --yes create-vite react-todo-app --template react-ts";

const cwd = process.cwd();
console.log("cwd:", cwd);

const child = exec(command, { cwd }, (error, stdout, stderr) => {
  if (error) {
    console.error(`执行失败: ${error.message}`);
    if (stderr) console.error(stderr);
    process.exit(error.code || 1);
  }
  console.log("✅ 项目创建成功！");
  process.exit(0);
});

child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);
