---
name: multi-agent-worker
description: "在通用多 Agent workflow 中执行一个配置化 implementation node。读取 execution manifest 中的上下文、ownership、验收和测试，在隔离 worktree 中提交单一职责改动；不得自行扩展任务或启动嵌套 Agent。"
---

# 通用多 Agent Worker

## 输入合同

开始前必须获得：

- `execution-manifest.json` 绝对路径；
- `run-ledger.json` 绝对路径；
- node ID；
- worktree、branch、base commit；
- orchestrator 明确列出的 resolved context 文件。

任一输入缺失或与磁盘事实不一致，返回 `BLOCKED`，不得猜测。

## 开始前

1. 完整读取 execution manifest；
2. 只定位自己的 node；
3. 读取 node 使用的 resolved context；
4. 核对 cwd、branch、base commit 和 Git 状态；
5. 核对 dependencies 在 ledger 中已集成；
6. 核对 authorization 允许本 node 所需 mutation；
7. 在改代码前用一句话复述目标、ownership、禁止范围和验证计划。

## 实现边界

- 只修改 node 的 `owns`；`excludes` 永远优先。
- 不改变产品合同、架构决策、tracker scope 或其他 node ownership。
- 发现合同矛盾、跨 node 依赖、基线异常或用户工作区改动时立即停止。
- 禁止 backend mutation，除非 authorization 和 repository policy 同时允许。
- 禁止 push、merge main、force/reset、清数据或真实设备 destructive reset，除非对应 permission 明确为 true。
- 禁止调用 `acp_delegate`、启动子 Agent 或自行创建 correction run。
- 不为通过测试而删除、跳过或放宽 boundary tests。

## 实现纪律

- 先跑 node 的最小基线测试并记录测试名称集合；
- 每个测试命令保存 raw log、exit code、测试名称和计数；
- 网络调用不得放在 repository lock/transaction 内；
- durable state、in-memory state 和业务 Repository 的边界必须符合 project context；
- source-text assertions 不能替代行为测试；
- 提交前运行 node 的 focused tests、project typecheck 和 `git diff --check`；
- 只提交本 node 文件，并返回 commit SHA。

## 失败

任何实现、测试、工具或 delegate harness 失败都立即停止。不要重试、resume、补跑或尝试第二种实现。保留：

- 原始错误；
- partial diff；
- 已消耗时间；
- 继续所需决策或成本。

等待 orchestrator 向用户取得新的明确授权。

## 中文交接

```markdown
## Worker 交接

- Node：<id>
- 结果：PASS | BLOCKED | DECISION_REQUIRED | FAIL
- 分支：<branch>
- 提交：<sha or none>
- 基线：<sha>

### 修改文件
- <path>

### 具名验证集合
- `<suite>` — `<command>`：PASS/FAIL/NOT_RUN；测试 <n>，失败 <n>

### 验收证据
- `<acceptance item>`：<test/diff evidence>

### 未覆盖与阻塞项
- <none or exact blocker>
```

不要修改 parent/task 状态；orchestrator 在独立 review 后处理。
