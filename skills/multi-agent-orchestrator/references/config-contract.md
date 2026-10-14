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

## Task manifest

```json
{
  "schemaVersion": 1,
  "task": {
    "id": "...",
    "projectId": "...",
    "authority": {},
    "contextBundles": [],
    "execution": { "authorizationPhrase": "..." },
    "stages": [],
    "nodes": [],
    "environmentGates": []
  }
}
```

每个 node 必须有唯一 `id`、`title`、`role`、`dependsOn`、`owns`、`excludes`、`acceptance`、`tests`。依赖必须存在且无环。Stage 只引用已定义 node。

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

Ledger 必须按 `name + command` 记录身份、exit code、测试总数、失败数和 raw log 路径。

## 状态计算

- node 未结束或 gate PENDING → `blocked`；
- 任一 FAIL/BLOCKED → `blocked`；
- 全部 PASS/N/A，未授权关闭 → `review`；
- 全部 PASS/N/A 且 `closeTask=true` → `done`。

报告可以解释原因，但不能覆盖计算结果。
