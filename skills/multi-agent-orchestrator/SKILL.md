---
name: multi-agent-orchestrator
description: "使用个人 project profile、task manifest 和单次授权配置，编排隔离 worktree、多 Agent 实现、审查、验证、运行账本和中文报告。适用于用户明确要求执行已配置的多 Agent 工作流；仅讨论、设计或检查配置时不得触发执行。"
---

# 通用多 Agent 编排器

## 能力概览

此 Skill 是通用执行引擎，不包含任何具体项目、Issue、模块或产品合同。

- **目的**：从三个独立配置生成可审计执行 manifest，并按任务 DAG 驱动隔离实现、审查和验证。
- **触发**：用户明确要求执行某个 task manifest，并提供该任务规定的 fresh authorization。
- **输入**：project profile、task manifest、run authorization。
- **输出**：execution manifest、原子更新的 run ledger、隔离 commits、commit-bound 验证证据、中文报告和派生状态建议。
- **边界**：不替用户创造产品决策；不从历史授权推断当前权限；不把不可用环境伪装成 PASS。
- **Handoff**：worker 返回 commit 与具名证据；orchestrator 审查后集成；verifier 只读给出 PASS/FAIL/BLOCKED。
- **语言**：面向人的 tracker 内容和 Markdown 默认取 project profile 的语言；代码符号、路径、命令、commit、测试名及原始错误保持原文。

## 配置分层

调用者只需要理解五层：

1. **Engine**：本 Skill，定义如何执行；
2. **Project profile**：仓库、文档注册表、上下文 bundle、命令和长期政策；
3. **Task manifest**：本次要做什么，包括 DAG、ownership、验收和环境门禁；
4. **Run authorization**：这一次允许做什么；
5. **Run ledger**：实际发生了什么。

完整契约见 [配置契约](references/config-contract.md)。所有配置均为个人文件，不要求进入项目 Git。

## 唯一执行门禁

配置存在、Issue 已批准、历史对话授权或 tracker 状态都不构成执行授权。只有同时满足以下条件才可 mutation：

1. 当前用户消息明确要求执行该 task；
2. 消息包含 task manifest 的 `execution.authorizationPhrase`；
3. run authorization 的 `authorizationRef` 指向当前消息；
4. 配置校验与 compile 成功；
5. authorization 中对应 permission 为 `true`。

否则只能解释、设计、验证配置或生成不带执行权限的草案；不得创建 tracker 子任务、worktree、branch、delegate 或修改产品代码。

## 标准入口

本 Skill 的小接口只有一个脚本：

```bash
node scripts/workflow.mjs scaffold-task \
  --project <project.json> \
  --task-id <ISSUE-ID> \
  --title "<任务标题>" \
  --output <task.json>

node scripts/workflow.mjs scaffold-authorization \
  --task <task.json> \
  --output <authorization.template.json>

node scripts/workflow.mjs validate \
  --project <project.json> \
  --task <task.json> \
  [--authorization <authorization.json>]

node scripts/workflow.mjs compile \
  --project <project.json> \
  --task <task.json> \
  --authorization <authorization.json> \
  --output <execution-manifest.json>

node scripts/workflow.mjs init-ledger \
  --manifest <execution-manifest.json> \
  --output <run-ledger.json>

node scripts/workflow.mjs validate-ledger \
  --manifest <execution-manifest.json> \
  --ledger <run-ledger.json> \
  [--final]

node scripts/workflow.mjs status \
  --manifest <execution-manifest.json> \
  --ledger <run-ledger.json>

node scripts/workflow.mjs ready \
  --manifest <execution-manifest.json> \
  --ledger <run-ledger.json>

node scripts/workflow.mjs resume \
  --manifest <execution-manifest.json> \
  --ledger <run-ledger.json>

node scripts/workflow.mjs report \
  --manifest <execution-manifest.json> \
  --ledger <run-ledger.json> \
  --output <report.zh-CN.md>
```

完整 mutation 接口见 [运行时状态命令](references/runtime-commands.md)。运行期不得直接编辑 ledger。配置使用 JSON，原因是本机没有稳定的 YAML parser；JSON 可确定性校验，避免隐式类型和额外运行时依赖。

## 执行流程

### 1. 加载与核对

1. 完整读取 project、task、authorization；
2. 运行 `validate`；
3. 按 project 的 document registry 解析 task 使用的 context bundles；
4. 读取解析后的真实文档，不依赖聊天摘要；
5. 核对 tracker authority、Git 状态、依赖版本、外部仓库 ref 和环境能力；
6. 找不到事实时停止，不猜测。

### 2. 编译运行输入

1. `compile` 生成只读 execution manifest；
2. `init-ledger` 生成唯一运行账本；
3. 保存 baseline commit、Node、lockfile hash、测试身份和原始日志；
4. 在第一个 delegate 前再次 `validate-ledger`；
5. tracker 清单和 Markdown 从 ledger 生成，不维护第二套数字。

### 3. 创建执行图

- task node 的 `dependsOn` 决定 DAG；不得按名称猜依赖。
- `dependencyInputs.requiredOutputs` 把依赖定义为 context relay；缺少 output 时下游不得完成。
- `owns` 是允许修改范围；`excludes` 是硬禁止范围。
- context 只从 node 的 bundle 和具名 dependency outputs 加载，避免每个 Agent 重读整个项目。
- 每个 implementation node 使用独立 worktree/branch；共享接线使用 task 指定的串行 integration node。
- 先执行 `pilotNode`，完整验证 brief、合同和证据方法后才开放同 stage 的其他 node。
- 使用 rolling window：一个 slot 释放才补充一个 ready node；并行度不得超过 project policy 和 task stage 的较小值。

### 4. 委派

实现 Agent 必须读取 `multi-agent-worker` Skill；验证 Agent 必须读取 `multi-agent-verifier` Skill。Prompt 只携带：

- execution manifest 路径；
- ledger 路径；
- node ID；
- 精确 cwd、branch、base commit；
- 解析后的 context 文件；
- ownership、验收、具名测试和权限。

禁止复制整份历史聊天或无关项目文档。

### 5. 失败政策

- Worker、reviewer、verifier 任一失败一次，即停止当前 node/stage。
- 默认不 resume、不重派、不补跑、不自动创建 correction Agent。
- 保留失败输出、partial artifact、runId 和继续成本并报告用户。
- 只有用户看到证据后明确授权，才允许新 run；ledger 必须记录 `retryAuthorizationRef`。
- 不使用固定长 `sleep`；异步 wait 只调用一次，未完成则做其他可独立工作并等待通知。
- Delegate 完成通知先写入 inbox，再单次 drain 并逐个归类；未归类 run 会阻止 final。
- `resume` 只计算恢复点，不自动 resume、重派或补跑。

### 6. Review 与验证

所有 Worker 都必须自证，但不是每个 Worker 都启动 Reviewer：

- `receipt`：orchestrator 机械核对 ownership、commit、具名测试和 raw log；
- `independent`：独立只读 Reviewer；同一 seam 的中风险 node 可共享 batch；
- `cross-model`：高风险 node 使用不同模型家族审查；
- 高风险 task 在 integration commit 上增加一次整体产品闭环 Review，寻找 acceptance 缺口和跨模块状态转换风险；
- 最后只运行一次 clean-integration Verifier，证明已确认的 acceptance/gates。

Reviewer 输入遵循 [最小审查包](references/review-packet.md)。Review 负责挑战合同完整性；Verifier 负责执行已确认门禁，两者不可用“测试全绿”互相替代。

`behavioralProofs` 必须描述真实行为或负向状态转换，并引用具名 test。启用 `bindToIntegrationCommit` 后，node 证据绑定 node commit，integration review/gate 绑定 integration commit；commit 改变后旧证据自动视为过期。

Verifier 缺少真实环境、账号、设备或破坏性授权时标 BLOCKED，不降级为本地 mock PASS。

### 7. 状态与报告

- 任一 mandatory gate `FAIL/BLOCKED/PENDING` → parent 建议 `blocked`；
- 全部 `PASS/NOT_APPLICABLE` 且无用户关闭授权 → 最多 `review`；
- 仅当全部通过且 `closeAuthorized=true` 才可建议 `done`；
- tracker mutation 必须在 ledger final 校验后发生；
- 报告必须由 `workflow.mjs report` 生成。
- ledger 使用 PID lock、stale-lock 恢复和原子 rename；所有状态 mutation 经脚本命令。

### 8. Close 与反馈闭环

1. 从 ledger 派生运行时间、失败/replacement、review round、过期证据与环境 blocker；
2. 对用户指定的 session/report 逐项分类为 `engine | project | task | product | rejected`；
3. 每项给出 `accepted | rejected | backlog`，但不得自动修改 Skill、项目规范或 tracker；
4. 一般错误类别至少重复两次才进入 engine；授权绕过、错误关闭或数据破坏等严重安全问题可单次升级；
5. 优先用架构、类型、lint 或可失败的测试执行规则，最后才写提示词。

## Tracker adapter

若 project profile 选择 Multica，使用 [Multica adapter](references/multica-adapter.md)。Engine 不硬编码项目编号、父任务、状态名称或评论 ID。

## 代表性示例

```text
用户：开始执行 <task authorization phrase>
  → validate project/task/authorization
  → compile execution manifest
  → init run ledger + freeze baseline
  → resolve context bundles
  → pilot then rolling-window DAG
  → risk-based node review packets
  → high-risk integration product review
  → one clean-integration verifier
  → validate final ledger
  → generate Chinese report
  → recommend blocked/review/done
```

## 激活

Skill 文件或个人配置修改后，在现有 Pi 会话运行 `/reload`；新会话会自动发现 `~/.agents/skills/` 下的 Skill。
