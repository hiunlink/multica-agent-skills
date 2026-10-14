# 风险驱动审查包

所有 Worker 必须自证，但不是每个 Worker 都启动 Reviewer。Review mode 来自 task node；缺失时由 project `policy.review.riskModes` 派生，旧配置保守回退为 `independent`。

## Mode

| Mode | 执行者 | 适用范围 |
|---|---|---|
| `receipt` | orchestrator | 文档、测试补充、生成配置、机械修改等低风险工作 |
| `independent` | 独立只读 Reviewer | 隔离业务逻辑、普通 adapter、需要判断的中风险改动 |
| `cross-model` | 不同模型家族的独立 Reviewer | persistence、sync、并发、数据删除、安全、公共合同和跨模块 wiring |

同一 seam 的中风险 node 可设置相同 `review.batch`，在其 commits 集成后使用一个 Reviewer；高风险 node 默认单独审查。

## Node Review 最小输入

Reviewer 第一轮只接收：

1. execution manifest 路径与 node ID；
2. base..head 目标 diff；
3. node ownership、risk、acceptance 和 behavioral proofs；
4. 直接相关实现文件和测试；
5. worker 交接、具名测试结果、raw log 和 verified commit；
6. project profile 解析出的必要 context 文件；
7. dependency context relay 的具名 outputs。

第一轮禁止：

- 无目的读取整个仓库；
- 重读完整对话或所有 tracker 历史；
- 重跑全量测试；
- 修改代码；
- 启动嵌套 Agent。

只有发现明确跨模块风险时才扩大范围，并在报告中写出风险假设、新增文件/命令、最小包为何不足以及新增成本。

Reviewer 输出 `file:line` findings，按严重度排序。无 blocking finding 时明确写“没有 blocking finding”，不得用泛化建议阻塞集成。

修复后的第二轮只读：原 finding、修复 diff 和对应 focused tests；不得重新开始全仓审查。

## Integration product review

当 task 的 `verification.integrationReview.required=true` 时，在 clean integration commit 上执行一次整体产品闭环审查。它位于 remediation 之前、final verifier 之前，目标不是重复节点 Review，而是挑战 acceptance 是否完整：

- 枚举受影响状态机的关键正向与负向转换；
- 检查 durability、restart、concurrency、failure、reset/cancellation 等跨模块闭环；
- 区分“测试证明了合同”和“合同遗漏了真实风险”；
- 用 runtime probe 或最小行为实验验证高风险假设；
- 报告绑定 integration commit。

Integration Reviewer 不修改代码。具名 finding 由 orchestrator 请求用户授权后进入 correction run；不得悄悄扩展 scope。

## 与 Verifier 的边界

- Reviewer：挑战设计、合同完整性和遗漏风险；
- Verifier：在最终 commit 上执行已经确认的 acceptance、behavioral proofs 和 gates；
- CI/typecheck/test count 是输入，不是最终判决；
- integration commit 改变后，旧 Review 和 Gate 证据自动过期。
