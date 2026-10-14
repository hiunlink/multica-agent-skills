# 最小审查包

Reviewer 第一轮只接收：

1. execution manifest 路径与 node ID；
2. base..head 目标 diff；
3. node ownership 与 acceptance；
4. 直接相关实现文件和测试；
5. worker 交接、具名测试结果及 raw log；
6. project profile 解析出的必要 context 文件。

第一轮禁止：

- 无目的读取整个仓库；
- 重读完整对话或所有 tracker 历史；
- 重跑全量测试；
- 修改代码；
- 启动嵌套 Agent。

只有发现明确跨模块风险时才扩大范围，并在报告中写出：

- 风险假设；
- 新增文件/命令；
- 为什么最小包不足；
- 新增成本。

Reviewer 输出 `file:line` findings，按严重度排序。无 blocking finding 时明确写“没有 blocking finding”，不得用泛化建议阻塞集成。

修复后的第二轮只读：原 finding、修复 diff 和对应 focused tests；不得重新开始全仓审查。
