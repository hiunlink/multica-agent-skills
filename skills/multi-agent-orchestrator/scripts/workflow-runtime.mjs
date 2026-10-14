import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const RUNTIME_COMMANDS = new Set([
  'status', 'ready', 'resume',
  'baseline-set', 'integration-set', 'run-start', 'run-finish', 'node-output', 'test-record', 'review-record', 'gate-set',
  'inbox-push', 'inbox-drain', 'feedback-record'
]);

const NODE_STATUS = new Set(['PENDING', 'RUNNING', 'PASS', 'FAIL', 'BLOCKED']);
const RUN_OUTCOMES = new Set(['integrated', 'rejected', 'blocked', 'replaced', 'cancelled', 'failed']);
const RESULT_STATUS = new Set(['PASS', 'FAIL', 'BLOCKED', 'NOT_APPLICABLE']);
const FAILURE_CLASSES = new Set(['code', 'test', 'environment', 'tool', 'timeout', 'context', 'unknown']);
const FEEDBACK_SCOPES = new Set(['engine', 'project', 'task', 'product', 'rejected']);
const FEEDBACK_DECISIONS = new Set(['accepted', 'rejected', 'backlog']);

function required(args, key, fail) {
  const value = args[key];
  if (value == null || value === '') fail(`缺少 --${key}`);
  return value;
}

function absoluteArg(args, key, fail) {
  return path.resolve(required(args, key, fail));
}

function readJson(file, fail) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`无法读取 JSON ${file}: ${error.message}`);
  }
}

export function atomicWriteJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`
  );
  let handle;
  try {
    handle = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(handle, `${JSON.stringify(value, null, 2)}\n`);
    fs.fsyncSync(handle);
    fs.closeSync(handle);
    handle = undefined;
    fs.renameSync(temporary, file);
    try {
      const directory = fs.openSync(path.dirname(file), 'r');
      try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
    } catch {
      // Some filesystems do not permit directory fsync. The atomic rename still holds.
    }
  } catch (error) {
    if (handle != null) try { fs.closeSync(handle); } catch { /* preserve original error */ }
    try { fs.unlinkSync(temporary); } catch { /* temporary may already be renamed */ }
    throw error;
  }
}

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

function acquireLock(file, fail) {
  const lockFile = `${file}.lock`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = fs.openSync(lockFile, 'wx', 0o600);
      fs.writeFileSync(handle, `${JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })}\n`);
      fs.fsyncSync(handle);
      return { lockFile, handle };
    } catch (error) {
      if (error.code !== 'EEXIST') fail(`无法创建 ledger lock ${lockFile}: ${error.message}`);
      let owner = null;
      try { owner = JSON.parse(fs.readFileSync(lockFile, 'utf8')); } catch { /* stale malformed lock */ }
      if (owner && pidAlive(owner.pid)) fail(`ledger 正被 pid ${owner.pid} 修改：${lockFile}`);
      try { fs.unlinkSync(lockFile); } catch (unlinkError) {
        fail(`无法清理 stale ledger lock ${lockFile}: ${unlinkError.message}`);
      }
    }
  }
  fail(`无法取得 ledger lock：${lockFile}`);
}

function releaseLock(lock) {
  try { fs.closeSync(lock.handle); } catch { /* already closed */ }
  try { fs.unlinkSync(lock.lockFile); } catch { /* caller already failed; preserve original result */ }
}

function withLedger(args, fail, mutate) {
  const ledgerFile = absoluteArg(args, 'ledger', fail);
  const lock = acquireLock(ledgerFile, fail);
  try {
    const ledger = readJson(ledgerFile, fail);
    const result = mutate(ledger, ledgerFile);
    const manifest = readJson(path.resolve(ledger.executionManifest), fail);
    ledger.parent ??= { computedStatus: 'blocked', closeAuthorized: false };
    ledger.parent.computedStatus = deriveParentStatus(manifest, ledger);
    ledger.updatedAt = new Date().toISOString();
    atomicWriteJson(ledgerFile, ledger);
    return result;
  } finally {
    releaseLock(lock);
  }
}

function loadPair(args, fail) {
  const manifestFile = absoluteArg(args, 'manifest', fail);
  const ledgerFile = absoluteArg(args, 'ledger', fail);
  const manifest = readJson(manifestFile, fail);
  const ledger = readJson(ledgerFile, fail);
  if (manifest.task?.id !== ledger.taskId) fail('manifest.task.id 与 ledger.taskId 不一致');
  return { manifest, ledger, manifestFile, ledgerFile };
}

function findNode(manifest, ledger, nodeId, fail) {
  const definition = manifest.task?.nodes?.find((node) => node.id === nodeId);
  const state = ledger.nodes?.[nodeId];
  if (!definition || !state) fail(`未知 node：${nodeId}`);
  return { definition, state };
}

function findRun(ledger, runId, fail) {
  const run = (ledger.runs ?? []).find((candidate) => candidate.runId === runId);
  if (!run) fail(`未知 runId：${runId}`);
  return run;
}

function integerArg(args, key, fail) {
  const parsed = Number(required(args, key, fail));
  if (!Number.isInteger(parsed)) fail(`--${key} 必须为整数`);
  return parsed;
}

function effectiveReviewMode(manifest, node) {
  if (node.review?.mode) return node.review.mode;
  const risk = node.risk ?? 'medium';
  return manifest.project?.policy?.review?.riskModes?.[risk] ?? 'independent';
}

function mandatoryEvidencePasses(node, state) {
  const names = new Set([
    ...(node.tests ?? []).filter((test) => test.mandatory).map((test) => test.name),
    ...(node.behavioralProofs ?? []).filter((proof) => proof.mandatory).map((proof) => proof.test)
  ]);
  return (node.tests ?? []).filter((test) => names.has(test.name)).every((test) => {
    const result = (state.tests ?? []).find((item) => item.name === test.name && item.command === test.command);
    return result?.status === 'PASS' && result.exitCode === 0;
  });
}

function nodeComplete(manifest, ledger, nodeId) {
  const node = manifest.task?.nodes?.find((candidate) => candidate.id === nodeId);
  const state = ledger.nodes?.[nodeId];
  if (!node || state?.status !== 'PASS' || !mandatoryEvidencePasses(node, state)) return false;
  const reviewMode = effectiveReviewMode(manifest, node);
  return reviewMode === 'receipt' || state.review?.status === 'PASS';
}

function deriveParentStatus(manifest, ledger) {
  const nodeBlocked = (manifest.task?.nodes ?? []).some((node) => {
    const state = ledger.nodes?.[node.id];
    if (state?.status !== 'PASS' || !mandatoryEvidencePasses(node, state)) return true;
    const reviewMode = effectiveReviewMode(manifest, node);
    return reviewMode !== 'receipt' && state.review?.status !== 'PASS';
  });
  const gateBlocked = (manifest.task?.environmentGates ?? [])
    .filter((gate) => gate.mandatory)
    .some((gate) => !['PASS', 'NOT_APPLICABLE'].includes(ledger.gates?.[gate.id]?.status));
  const integrationReview = manifest.task?.verification?.integrationReview;
  const integrationReviewBlocked = integrationReview?.required === true && integrationReview.mode !== 'none' &&
    ledger.integration?.review?.status !== 'PASS';
  const evidenceBlocked = manifest.task?.verification?.bindToIntegrationCommit === true && staleEvidence(manifest, ledger).length > 0;
  if (nodeBlocked || gateBlocked || integrationReviewBlocked || evidenceBlocked) return 'blocked';
  return manifest.authorization?.permissions?.closeTask === true ? 'done' : 'review';
}

function currentStage(manifest, ledger) {
  return (manifest.task?.stages ?? []).find((stage) =>
    stage.nodes.some((id) => !nodeComplete(manifest, ledger, id))) ?? null;
}

export function computeReadyNodes(manifest, ledger) {
  const stage = currentStage(manifest, ledger);
  if (!stage) return { stage: null, capacity: 0, ready: [] };
  const globalLimit = manifest.project?.policy?.delegation?.maxParallel ?? 1;
  const running = Object.values(ledger.nodes ?? {}).filter((node) => node.status === 'RUNNING').length;
  const capacity = Math.max(0, Math.min(globalLimit, stage.maxParallel) - running);
  if (capacity === 0) return { stage: stage.id, capacity, ready: [] };

  let candidateIds = stage.nodes;
  const pilotNode = manifest.task?.execution?.scheduling?.pilotNode;
  if (pilotNode && !nodeComplete(manifest, ledger, pilotNode)) candidateIds = [pilotNode];

  const ready = candidateIds.filter((id) => {
    const definition = manifest.task.nodes.find((node) => node.id === id);
    const state = ledger.nodes?.[id];
    const dependenciesPass = (definition?.dependsOn ?? []).every((dependency) => nodeComplete(manifest, ledger, dependency));
    const outputsReady = (definition?.dependencyInputs ?? []).every((input) =>
      (input.requiredOutputs ?? []).every((key) => {
        const value = ledger.nodes?.[input.node]?.outputs?.[key];
        return typeof value === 'string' && value.trim() !== '';
      }));
    return state?.status === 'PENDING' && dependenciesPass && outputsReady;
  }).slice(0, capacity);
  return { stage: stage.id, capacity, ready };
}

function staleEvidence(manifest, ledger) {
  if (manifest.task?.verification?.bindToIntegrationCommit !== true) return [];
  const stale = [];
  for (const definition of manifest.task?.nodes ?? []) {
    const state = ledger.nodes?.[definition.id];
    if (!state) continue;
    const expected = state.commits?.at(-1) ?? null;
    for (const test of state.tests ?? []) {
      if (test.status === 'PASS' && expected && test.verifiedCommit !== expected) {
        stale.push(`node:${definition.id}:test:${test.name}`);
      }
    }
    if (effectiveReviewMode(manifest, definition) !== 'receipt' && state.review?.status === 'PASS' &&
        expected && state.review.verifiedCommit !== expected) stale.push(`node:${definition.id}:review`);
  }
  const integrationCommit = ledger.integration?.commit ?? null;
  const integrationReview = manifest.task?.verification?.integrationReview;
  if (integrationReview?.required === true && integrationReview.mode !== 'none' &&
      ledger.integration?.review?.status === 'PASS' && integrationCommit &&
      ledger.integration.review.verifiedCommit !== integrationCommit) stale.push('integration:review');
  for (const [id, gate] of Object.entries(ledger.gates ?? {})) {
    if (gate.status === 'PASS' && integrationCommit && gate.verifiedCommit !== integrationCommit) stale.push(`gate:${id}`);
  }
  return stale;
}

function statusSnapshot(manifest, ledger) {
  const ready = computeReadyNodes(manifest, ledger);
  const pendingReviews = (manifest.task?.nodes ?? []).filter((node) => {
    const state = ledger.nodes?.[node.id];
    return state?.status === 'PASS' && effectiveReviewMode(manifest, node) !== 'receipt' && state.review?.status !== 'PASS';
  }).map((node) => node.id);
  const missingEvidence = (manifest.task?.nodes ?? []).filter((node) => {
    const state = ledger.nodes?.[node.id];
    return state?.status === 'PASS' && !mandatoryEvidencePasses(node, state);
  }).map((node) => node.id);
  return {
    taskId: ledger.taskId,
    parent: deriveParentStatus(manifest, ledger),
    stage: ready.stage,
    capacity: ready.capacity,
    ready: ready.ready,
    running: Object.entries(ledger.nodes ?? {}).filter(([, state]) => state.status === 'RUNNING').map(([id]) => id),
    blocked: Object.entries(ledger.nodes ?? {}).filter(([, state]) => state.status === 'BLOCKED').map(([id]) => id),
    missingEvidence,
    pendingReviews,
    integrationReview: ledger.integration?.review?.status ?? 'NOT_APPLICABLE',
    unclassifiedRuns: (ledger.runs ?? []).filter((run) => run.outcome == null).map((run) => run.runId),
    undrainedInbox: (ledger.inbox ?? []).filter((event) => !event.drainedAt).map((event) => event.eventId),
    staleEvidence: staleEvidence(manifest, ledger)
  };
}

function setNodeStatusFromRun(ledger, run) {
  const state = ledger.nodes?.[run.nodeId];
  if (!state) return;
  if (run.outcome === 'integrated') state.status = 'PASS';
  else if (run.outcome === 'blocked') state.status = 'BLOCKED';
  else if (['rejected', 'cancelled', 'failed'].includes(run.outcome)) state.status = 'FAIL';
  else if (run.outcome === 'replaced') state.status = 'PENDING';
}

function commandStatus(args, fail, resume = false) {
  const { manifest, ledger } = loadPair(args, fail);
  const snapshot = statusSnapshot(manifest, ledger);
  if (resume) {
    snapshot.recommendedActions = [];
    if (snapshot.unclassifiedRuns.length) snapshot.recommendedActions.push('先归类所有未结束 run；不得重派。');
    if (snapshot.staleEvidence.length) snapshot.recommendedActions.push('重新运行与当前 commit 不一致的验证。');
    if (snapshot.missingEvidence.length) snapshot.recommendedActions.push(`补齐具名行为证据：${snapshot.missingEvidence.join(', ')}`);
    if (snapshot.pendingReviews.length) snapshot.recommendedActions.push(`完成风险策略要求的 review：${snapshot.pendingReviews.join(', ')}`);
    if (!snapshot.unclassifiedRuns.length && snapshot.ready.length) snapshot.recommendedActions.push(`可启动：${snapshot.ready.join(', ')}`);
    if (!snapshot.recommendedActions.length) snapshot.recommendedActions.push('没有可安全恢复的执行动作；检查 gates 或完成状态。');
  }
  console.log(JSON.stringify(snapshot, null, 2));
}

function booleanArg(args, key, fail) {
  const value = required(args, key, fail);
  if (!['true', 'false'].includes(value)) fail(`--${key} 必须为 true | false`);
  return value === 'true';
}

function baselineSet(args, fail) {
  const status = required(args, 'status', fail);
  if (!RESULT_STATUS.has(status)) fail(`非法 baseline status：${status}`);
  withLedger(args, fail, (ledger) => {
    ledger.baseline = {
      status,
      frontendCommit: args['frontend-commit'] ?? null,
      backendCommit: args['backend-commit'] ?? null,
      nodeVersion: args['node-version'] ?? null,
      lockfileSha256: args['lockfile-sha256'] ?? null,
      rawLog: required(args, 'raw-log', fail),
      recordedAt: new Date().toISOString()
    };
  });
  console.log('PASS: 已记录 baseline');
}

function integrationSet(args, fail) {
  withLedger(args, fail, (ledger) => {
    ledger.integration.worktree = args.worktree ?? ledger.integration.worktree ?? null;
    ledger.integration.branch = args.branch ?? ledger.integration.branch ?? null;
    ledger.integration.commit = required(args, 'commit', fail);
    ledger.integration.clean = booleanArg(args, 'clean', fail);
  });
  console.log('PASS: 已记录 integration commit');
}

function runStart(args, fail) {
  const manifestFile = absoluteArg(args, 'manifest', fail);
  const manifest = readJson(manifestFile, fail);
  const nodeId = required(args, 'node', fail);
  const runId = required(args, 'run-id', fail);
  withLedger(args, fail, (ledger) => {
    const { state } = findNode(manifest, ledger, nodeId, fail);
    const ready = computeReadyNodes(manifest, ledger).ready;
    if (!ready.includes(nodeId)) fail(`node ${nodeId} 当前不可启动；ready=${ready.join(',') || 'none'}`);
    if ((ledger.runs ?? []).some((run) => run.runId === runId)) fail(`重复 runId：${runId}`);
    const now = new Date().toISOString();
    const run = {
      runId, nodeId, startedAt: now, finishedAt: null, outcome: null,
      baseCommit: args['base-commit'] ?? null, failureClass: null
    };
    ledger.runs ??= [];
    ledger.runs.push(run);
    state.runs ??= [];
    state.runs.push(runId);
    state.worktree = args.worktree ?? state.worktree ?? null;
    state.branch = args.branch ?? state.branch ?? null;
    state.baseCommit = args['base-commit'] ?? state.baseCommit ?? null;
    state.status = 'RUNNING';
  });
  console.log(`PASS: 已记录 run start：${runId}`);
}

function runFinish(args, fail) {
  const outcome = required(args, 'outcome', fail);
  if (!RUN_OUTCOMES.has(outcome)) fail(`非法 outcome：${outcome}`);
  withLedger(args, fail, (ledger) => {
    const run = findRun(ledger, required(args, 'run-id', fail), fail);
    if (run.outcome != null) fail(`run ${run.runId} 已归类为 ${run.outcome}`);
    run.outcome = outcome;
    run.finishedAt = new Date().toISOString();
    if (args.commit) run.commit = args.commit;
    if (args.error) run.error = args.error;
    if (args['failure-class']) {
      if (!FAILURE_CLASSES.has(args['failure-class'])) fail(`非法 failure-class：${args['failure-class']}`);
      run.failureClass = args['failure-class'];
    }
    if (outcome === 'replaced') {
      run.replacementRunId = required(args, 'replacement-run-id', fail);
      run.retryAuthorizationRef = required(args, 'retry-authorization-ref', fail);
    }
    const state = ledger.nodes?.[run.nodeId];
    if (outcome === 'integrated' && args.commit && state && !state.commits.includes(args.commit)) state.commits.push(args.commit);
    setNodeStatusFromRun(ledger, run);
  });
  console.log(`PASS: 已记录 run outcome：${outcome}`);
}

function nodeOutput(args, fail) {
  const manifest = readJson(absoluteArg(args, 'manifest', fail), fail);
  withLedger(args, fail, (ledger) => {
    const { state } = findNode(manifest, ledger, required(args, 'node', fail), fail);
    state.outputs ??= {};
    state.outputs[required(args, 'key', fail)] = required(args, 'value', fail);
  });
  console.log('PASS: 已记录 dependency output');
}

function testRecord(args, fail) {
  const manifest = readJson(absoluteArg(args, 'manifest', fail), fail);
  const status = required(args, 'status', fail);
  if (!RESULT_STATUS.has(status)) fail(`非法 test status：${status}`);
  withLedger(args, fail, (ledger) => {
    const { definition, state } = findNode(manifest, ledger, required(args, 'node', fail), fail);
    const name = required(args, 'name', fail);
    const command = required(args, 'command', fail);
    if (!(definition.tests ?? []).some((test) => test.name === name && test.command === command)) {
      fail(`test ${name} / ${command} 不在 node 合同中`);
    }
    const record = {
      name, command, status,
      exitCode: integerArg(args, 'exit-code', fail),
      testCount: integerArg(args, 'test-count', fail),
      failureCount: integerArg(args, 'failure-count', fail),
      rawLog: required(args, 'raw-log', fail),
      verifiedCommit: required(args, 'verified-commit', fail),
      recordedAt: new Date().toISOString()
    };
    state.tests = (state.tests ?? []).filter((test) => !(test.name === name && test.command === command));
    state.tests.push(record);
  });
  console.log('PASS: 已记录具名测试证据');
}

function reviewRecord(args, fail) {
  const manifest = readJson(absoluteArg(args, 'manifest', fail), fail);
  const status = required(args, 'status', fail);
  if (!RESULT_STATUS.has(status)) fail(`非法 review status：${status}`);
  withLedger(args, fail, (ledger) => {
    const target = required(args, 'target', fail);
    const record = {
      status,
      mode: required(args, 'mode', fail),
      report: required(args, 'report', fail),
      verifiedCommit: required(args, 'verified-commit', fail),
      recordedAt: new Date().toISOString()
    };
    if (target === 'integration') {
      const expected = manifest.task?.verification?.integrationReview?.mode ?? 'none';
      if (record.mode !== expected) fail(`integration review mode 应为 ${expected}，实际 ${record.mode}`);
      ledger.integration.review = record;
      return;
    }
    const { definition, state } = findNode(manifest, ledger, target, fail);
    const expected = effectiveReviewMode(manifest, definition);
    if (record.mode !== expected) fail(`node ${target} review mode 应为 ${expected}，实际 ${record.mode}`);
    state.review = record;
  });
  console.log('PASS: 已记录 review 证据');
}

function gateSet(args, fail) {
  const status = required(args, 'status', fail);
  if (!RESULT_STATUS.has(status)) fail(`非法 gate status：${status}`);
  withLedger(args, fail, (ledger) => {
    const id = required(args, 'gate', fail);
    const gate = ledger.gates?.[id];
    if (!gate) fail(`未知 gate：${id}`);
    gate.status = status;
    gate.evidence = args.evidence ?? null;
    gate.blocker = args.blocker ?? null;
    gate.verifiedCommit = args['verified-commit'] ?? null;
    gate.recordedAt = new Date().toISOString();
    if (!gate.evidence && !gate.blocker) fail('gate 结果必须有 --evidence 或 --blocker');
  });
  console.log('PASS: 已记录 gate 证据');
}

function inboxPush(args, fail) {
  withLedger(args, fail, (ledger) => {
    const eventId = required(args, 'event-id', fail);
    ledger.inbox ??= [];
    if (ledger.inbox.some((event) => event.eventId === eventId)) fail(`重复 event-id：${eventId}`);
    ledger.inbox.push({
      eventId,
      kind: required(args, 'kind', fail),
      runId: args['run-id'] ?? null,
      nodeId: args.node ?? null,
      payload: args.payload ?? null,
      createdAt: new Date().toISOString(),
      drainedAt: null
    });
  });
  console.log('PASS: inbox event 已入队');
}

function inboxDrain(args, fail) {
  let drained = [];
  withLedger(args, fail, (ledger) => {
    const now = new Date().toISOString();
    drained = (ledger.inbox ?? []).filter((event) => !event.drainedAt);
    for (const event of drained) event.drainedAt = now;
  });
  console.log(JSON.stringify(drained, null, 2));
}

function feedbackRecord(args, fail) {
  const scope = required(args, 'scope', fail);
  const decision = required(args, 'decision', fail);
  if (!FEEDBACK_SCOPES.has(scope)) fail(`非法 feedback scope：${scope}`);
  if (!FEEDBACK_DECISIONS.has(decision)) fail(`非法 feedback decision：${decision}`);
  withLedger(args, fail, (ledger) => {
    ledger.retrospective ??= { evidence: [], findings: [] };
    const evidence = required(args, 'evidence', fail);
    if (!ledger.retrospective.evidence.includes(evidence)) ledger.retrospective.evidence.push(evidence);
    ledger.retrospective.findings.push({
      class: required(args, 'class', fail), scope, decision, evidence,
      enforcement: args.enforcement ?? null,
      recordedAt: new Date().toISOString()
    });
  });
  console.log('PASS: 已记录复盘 finding');
}

export function executeRuntimeCommand(args, fail) {
  switch (args.subcommand) {
    case 'status': return commandStatus(args, fail, false);
    case 'ready': return commandStatus(args, fail, false);
    case 'resume': return commandStatus(args, fail, true);
    case 'baseline-set': return baselineSet(args, fail);
    case 'integration-set': return integrationSet(args, fail);
    case 'run-start': return runStart(args, fail);
    case 'run-finish': return runFinish(args, fail);
    case 'node-output': return nodeOutput(args, fail);
    case 'test-record': return testRecord(args, fail);
    case 'review-record': return reviewRecord(args, fail);
    case 'gate-set': return gateSet(args, fail);
    case 'inbox-push': return inboxPush(args, fail);
    case 'inbox-drain': return inboxDrain(args, fail);
    case 'feedback-record': return feedbackRecord(args, fail);
    default: fail(`未知 runtime 命令：${args.subcommand}`);
  }
}
