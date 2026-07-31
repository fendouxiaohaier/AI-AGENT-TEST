function listToTree(list, parentId = null) {
  let map = {};
  let node,
    roots = [];
  let i;
  for (i = 0; i < list.length; i += 1) {
    map[list[i].id] = { ...list[i], children: [] };
  }
  for (i = 0; i < list.length; i += 1) {
    node = map[list[i].id];
    if (list[i].parentId === parentId) {
      roots.push(node);
    } else {
      map[list[i].parentId].children.push(node);
    }
  }
  return roots;
}
// 示例数据
const list = [
  { id: 1, name: "Node 1", parentId: null },
  { id: 2, name: "Node 1.1", parentId: 1 },
  { id: 3, name: "Node 1.2", parentId: 1 },
  { id: 4, name: "Node 2", parentId: null },
  { id: 5, name: "Node 2.1", parentId: 4 },
  { id: 6, name: "Node 2.2", parentId: 4 },
  { id: 7, name: "Node 2.1.1", parentId: 5 },
];
// 转换列表为树
const tree = listToTree(list);
// 打印树形结构
function printTree(tree, level = 0) {
  tree.forEach((node) => {
    console.log(`${"--".repeat(level)} ${node.name}`);
    if (node.children.length > 0) {
      printTree(node.children, level + 1);
    }
  });
}
printTree(tree);
