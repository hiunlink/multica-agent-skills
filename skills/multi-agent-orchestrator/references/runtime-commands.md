# 运行时状态命令

运行期禁止直接编辑 `run-ledger.json`。所有 mutation 经 `workflow.mjs`，脚本使用同目录 lock、PID stale-lock 恢复、临时文件、`fsync` 和原子 rename。

通用参数：

```bash
node scripts/workflow.mjs <command> \
  --manifest <execution-manifest.json> \
  --ledger <run-ledger.json>
```

`inbox-*`、`feedback-record`、`baseline-set` 和 `integration-set` 可省略 `--manifest`，它们从 ledger 的 `executionManifest` 加载 manifest；为保持调用一致，建议仍传入。

## 查询

```bash
# 派生 parent、当前 stage、容量、ready/running/blocked、未归类 run、未消费事件和过期证据
node scripts/workflow.mjs status --manifest <manifest> --ledger <ledger>

# 与 status 相同的机器可读快照；调度器只消费 ready
node scripts/workflow.mjs ready --manifest <manifest> --ledger <ledger>

# 额外返回安全恢复建议；不启动或重试 Agent
node scripts/workflow.mjs resume --manifest <manifest> --ledger <ledger>
```

## Baseline 与 integration

```bash
node scripts/workflow.mjs baseline-set --ledger <ledger> \
  --status PASS --frontend-commit <sha> [--backend-commit <sha>] \
  --node-version <version> --lockfile-sha256 <hash> --raw-log <path>

node scripts/workflow.mjs integration-set --ledger <ledger> \
  --commit <sha> --clean true [--worktree <path>] [--branch <name>]
```

## Agent run

`run-start` 只允许启动 `ready` 中的 node。Pilot 未 PASS 前，其余同 stage node 不会 ready；窗口容量由 project 与 stage 的较小并行度决定。

```bash
node scripts/workflow.mjs run-start --manifest <manifest> --ledger <ledger> \
  --node <id> --run-id <id> [--base-commit <sha>] [--worktree <path>] [--branch <name>]

node scripts/workflow.mjs run-finish --ledger <ledger> \
  --run-id <id> --outcome integrated --commit <sha>

node scripts/workflow.mjs run-finish --ledger <ledger> \
  --run-id <id> --outcome failed --failure-class test --error '<exact error>'
```

合法 failure class：`code | test | environment | tool | timeout | context | unknown`。`replaced` 还必须传 `--replacement-run-id` 和 `--retry-authorization-ref`；命令不会自行创建 replacement。

## Dependency context relay

```bash
node scripts/workflow.mjs node-output --manifest <manifest> --ledger <ledger> \
  --node <id> --key contract --value '<artifact path or compact decision>'
```

下游 node 的 `dependencyInputs[].requiredOutputs` 在 ledger final validation 中强制检查。Worker brief 必须内联这些 output，而不能只把 dependency 当作排序边。

## 测试、Review 与 Gate

```bash
node scripts/workflow.mjs test-record --manifest <manifest> --ledger <ledger> \
  --node <id> --name <configured-name> --command '<exact configured command>' \
  --status PASS --exit-code 0 --test-count <n> --failure-count 0 \
  --raw-log <path> --verified-commit <node-commit>

node scripts/workflow.mjs review-record --manifest <manifest> --ledger <ledger> \
  --target <node-id|integration> --status PASS \
  --mode <receipt|independent|cross-model> --report <path> --verified-commit <sha>

node scripts/workflow.mjs gate-set --ledger <ledger> --gate <id> \
  --status <PASS|FAIL|BLOCKED|NOT_APPLICABLE> \
  [--evidence <path>] [--blocker '<reason>'] [--verified-commit <integration-sha>]
```

当 `verification.bindToIntegrationCommit=true` 时：

- node test/review 绑定 node 最后一个 commit；
- integration review 和 gate 绑定 integration commit；
- commit 改变后 `status.staleEvidence` 自动出现，parent 派生为 `blocked`；
- `validate-ledger --final` 拒绝过期证据。

## Completion inbox

```bash
node scripts/workflow.mjs inbox-push --ledger <ledger> \
  --event-id <unique-id> --kind completion [--run-id <id>] [--node <id>] [--payload '<text>']

node scripts/workflow.mjs inbox-drain --ledger <ledger>
```

Delegate 通知先入队；orchestrator 一次 drain 后逐项归类。不要使用固定 `sleep`，也不要循环调用 wait。

## Close feedback

```bash
node scripts/workflow.mjs feedback-record --ledger <ledger> \
  --class <mistake-class> \
  --scope <engine|project|task|product|rejected> \
  --decision <accepted|rejected|backlog> \
  --evidence <session-or-report> [--enforcement <mechanism>]
```

该命令只记录经用户审查后的分类，不会修改 Skill、项目规范、产品代码或 tracker。
