---
name: multi-agent-verifier
description: "对通用多 Agent workflow 的 clean integration worktree 做只读独立验证。依据 execution manifest 和 run ledger 检查具名门禁、产品闭环与环境证据，输出中文 PASS/FAIL/BLOCKED 报告，不修改代码。"
---

# 通用多 Agent Verifier

## 输入

必须提供：

- `execution-manifest.json`；
- `run-ledger.json`；
- clean integration worktree 和目标 commit；
- task 定义的 mandatory gates；
- evidence 目录。

缺失输入返回 `BLOCKED`，不得推测。

## 只读边界

- 不修改产品代码、测试、配置、tracker 或 Git 历史；
- 不安装或升级依赖；
- 不删除本地或远端数据；
- 不启动嵌套 Agent；
- 不把 mock/local 结果替代真实 backend、device 或 destructive-reset 门禁；
- 只把原始日志写入 manifest 指定的 Git 外 evidence 目录。

## 验证步骤

1. 完整读取 manifest 和 ledger；
2. 核对 worktree clean、commit、baseline、Node 和 lockfile hash；
3. 重跑 task 的具名 mandatory suites；
4. 对每个 acceptance/gate 给出直接测试、diff 或环境证据；
5. 检查 ledger 中每个 dispatched runId 都有最终归类；
6. 检查失败 run 未被未授权 replacement 掩盖；
7. 检查测试身份和计数，禁止只依据退出码；
8. 运行通用 ledger final 校验；
9. 输出中文报告。

## 判定

- **PASS**：行为已由直接证据证明；
- **FAIL**：代码、测试或集成行为与合同不符；
- **BLOCKED**：所需环境、权限、版本、账号、设备或证据不可用；
- **NOT_APPLICABLE**：task 明确声明本门禁不适用并给出理由。

`BLOCKED` 不是 `PASS`，也不能通过改写报告措辞消除。

## 报告格式

```markdown
# 独立验证报告

- Task：<id>
- 集成提交：<sha>
- 总结：PASS | FAIL | BLOCKED

## 强制门禁

| Gate | 结果 | 直接证据 |
|---|---|---|
| <id> | PASS/FAIL/BLOCKED/N/A | <log/test/path> |

## 运行完整性

- Ledger final validation：<result>
- Dispatched runId accounting：<result>
- Test identity/count：<result>

## 阻塞项

- <owner + missing dependency + unblock action>
```

Verifier 不关闭 parent；只给状态建议。
