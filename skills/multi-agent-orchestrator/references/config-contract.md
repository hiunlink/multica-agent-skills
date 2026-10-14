# 配置契约

## 文件分工

| 文件 | 生命周期 | 内容 | 禁止内容 |
|---|---|---|---|
| project profile | 项目长期 | 仓库、文档、bundle、命令、adapter、政策 | 单次任务 acceptance、临时授权 |
| task manifest | 单个任务 | authority、DAG、ownership、验收、门禁 | 凭据、历史运行结果 |
| run authorization | 单次运行 | 用户授权引用、权限开关、环境许可 | 项目规则、产品合同 |
| execution manifest | 生成物 | 上述三者的解析快照 | 手工编辑 |
| run ledger | 运行期 | baseline、runId、commit、suite、gate、状态 | 未经证据的结论 |

所有配置使用 UTF-8 JSON。配置可放在 `~/.agents/workflows/<project>/`，不得包含 secret。结构 schema 位于 `../schemas/{project,task,authorization,run-ledger}.schema.json`；`workflow.mjs validate` 额外执行跨文件引用、路径存在性、DAG 无环和安全政策等 JSON Schema 无法表达的语义校验。

## Project profile

必需顶层键：

```json
{
  "schemaVersion": 1,
  "project": { "id": "...", "root": "...", "language": "zh-CN" },
  "repositories": {},
  "documents": {},
  "contextBundles": {},
  "commands": {},
  "adapters": {},
  "policy": {},
  "reporting": {}
}
```

- `documents.<key>.path` 相对 `project.root` 解析，也可为绝对路径。
- `contextBundles.<name>` 只含 document key；不得嵌套 bundle，保持解析确定性。
- repository 必须声明 `writable`；只读仓库不得被 worker ownership 引用。
- `policy.delegation.automaticRetry` 必须为 `false`，`nestedDelegates` 必须为 `false`。
- 可选 `policy.review.riskModes` 将 `low | medium | high` 映射到 `receipt | independent | cross-model`；旧 profile 缺失时保守使用 `independent`。
- `policy.review.integrationReviewForRisk` 声明哪些风险等级需要最终集成产品审查。

## Task manifest

```json
{
  "schemaVersion": 1,
  "task": {
    "id": "...",
    "projectId": "...",
    "authority": {},
    "contextBundles": [],
    "execution": {
      "authorizationPhrase": "...",
      "scheduling": { "mode": "rolling-window", "pilotNode": "A" }
    },
    "stages": [],
    "nodes": [],
    "verification": {
      "bindToIntegrationCommit": true,
      "integrationReview": { "mode": "cross-model", "required": true }
    },
    "environmentGates": []
  }
}
```

每个 node 必须有唯一 `id`、`title`、`role`、`dependsOn`、`owns`、`excludes`、`acceptance`、`tests`。依赖必须存在且无环。Stage 只引用已定义 node。`scaffold-task` 生成的 `TODO` 只是编辑提示；`compile` 会拒绝仍含 `TODO` 的 acceptance 或 test command。

v0.2 可选字段：

```json
{
  "risk": "high",
  "review": { "mode": "cross-model", "batch": null },
  "dependencyInputs": [
    { "node": "A", "requiredOutputs": ["contract", "decisionSummary"] }
  ],
  "behavioralProofs": [
    {
      "id": "restart-after-local-change",
      "scenario": "本地变更持久化后重启，待提交候选仍可重建",
      "test": "restart-integration",
      "mandatory": true
    }
  ]
}
```

`dependsOn` 不只表示顺序；`dependencyInputs` 声明下游 brief 必须接收的具名输出。`behavioralProofs` 引用 `tests[].name`，强制把 acceptance 映射到真实行为或负向状态转换。

Ownership 使用项目根目录相对路径或 glob。运行时由 orchestrator 把它转换为 worker 的精确 allowlist；配置本身不授权修改。

## Run authorization

```json
{
  "schemaVersion": 1,
  "taskId": "...",
  "template": false,
  "authorizationRef": "当前用户消息引用",
  "authorizationPhrase": "必须与 task 完全相同",
  "authorizedAt": "ISO-8601",
  "permissions": {
    "productCodeChanges": false,
    "trackerWrites": false,
    "localCommits": false,
    "backendMutation": false,
    "push": false,
    "mergeToMain": false,
    "destructiveLocalReset": false,
    "remoteDataReset": false,
    "closeTask": false
  }
}
```

`template: true` 只可用于配置示例；`compile` 必须拒绝它。

## Node tests

```json
{
  "name": "focused-suite",
  "command": "node --test tests/example.test.ts",
  "mandatory": true
}
```

Ledger 必须按 `name + command` 记录身份、exit code、测试总数、失败数、raw log 路径和 `verifiedCommit`。

## Review 与最终证据

- `receipt` 不启动 Reviewer，但 orchestrator 必须机械核对 diff、ownership、commit 和测试 receipt；
- `independent` 启动只读 Reviewer；同一 `review.batch` 可批量审查中风险 node；
- `cross-model` 用于高风险节点或 integration product review；
- `verification.bindToIntegrationCommit=true` 时，node test/review 绑定 node commit，integration review/gate 绑定 integration commit；代码变化后旧证据派生为 stale，并使 parent 保持 `blocked`。

## Run ledger mutation

运行期不得直接编辑 ledger。使用 [运行时状态命令](runtime-commands.md) 记录 baseline、run、dependency output、test、review、gate、inbox 和 retrospective。脚本使用 PID lock、stale-lock 恢复、临时文件与原子 rename。

Close 阶段的 feedback finding 必须分类为 `engine | project | task | product | rejected`，并给出 `accepted | rejected | backlog`；记录本身不授权修改 Skill、项目或 tracker。

## 状态计算

- node 未结束或 gate PENDING → `blocked`；
- 任一 FAIL/BLOCKED → `blocked`；
- 全部 PASS/N/A，未授权关闭 → `review`；
- 全部 PASS/N/A 且 `closeTask=true` → `done`。

报告可以解释原因，但不能覆盖计算结果。
