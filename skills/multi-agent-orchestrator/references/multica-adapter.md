# Multica adapter

仅当 project profile 的 `adapters.tracker.kind` 为 `multica` 且 run authorization 的 `trackerWrites=true` 时使用。

## 规则

- CLI 语法以 project profile 指向的 tracker 文档和 `multica --help` 为准；不得凭记忆猜测。
- 从 JSON 输出取得真实 UUID/identifier；不得猜后续编号。
- 创建后重新读取，核对 parent、authority、stage 和正文。
- 不向 Multica 写入 secret、raw token、真实用户 payload 或大型原始日志。
- 面向人的标题、正文、评论和报告使用 project profile 的语言。
- Worker 不修改状态；orchestrator 在独立 review 和 ledger 校验后修改。

## 通用子任务正文

```markdown
## 权威来源
- 父任务：<parent>
- 批准依据：<authority>
- Node：<node id>
- 基线：<commit>
- 依赖提交：<commits or none>

## 目标
<node title/outcome>

## 允许修改
<resolved owns>

## 禁止范围
<resolved excludes + authorization denials>

## 必须行为
<acceptance>

## 验证
<named tests>

## 工作上下文
- Worktree：<path>
- 分支：<branch>
- 实现轮次预算：1
- 自动重试：禁止
```

## 失败处理

首次失败后停止，在 parent 留下中文证据：runId、错误、partial artifact、耗时和继续成本。没有新用户授权不得创建 replacement issue/run。
