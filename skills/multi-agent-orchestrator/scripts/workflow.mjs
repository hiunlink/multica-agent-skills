#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const STATUS = new Set(['PENDING', 'RUNNING', 'PASS', 'FAIL', 'BLOCKED']);
const GATE_STATUS = new Set(['PENDING', 'PASS', 'FAIL', 'BLOCKED', 'NOT_APPLICABLE']);
const RUN_OUTCOMES = new Set(['integrated', 'rejected', 'blocked', 'replaced', 'cancelled', 'failed']);

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!command) fail('缺少命令：scaffold-task | scaffold-authorization | validate | compile | init-ledger | validate-ledger | report');
  const args = { command, final: false };
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token === '--final') {
      args.final = true;
      continue;
    }
    if (!token.startsWith('--')) fail(`无法识别参数：${token}`);
    const value = rest[i + 1];
    if (!value || value.startsWith('--')) fail(`${token} 缺少值`);
    args[token.slice(2)] = value;
    i += 1;
  }
  return args;
}

function requireArg(args, key) {
  if (!args[key]) fail(`缺少 --${key}`);
  return path.resolve(args[key]);
}

function readJson(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (error) {
    fail(`无法读取 ${file}: ${error.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${file} 不是合法 JSON: ${error.message}`);
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function nonEmpty(value, label, errors) {
  if (typeof value !== 'string' || value.trim() === '') errors.push(`${label} 必须为非空字符串`);
}

function stringArray(value, label, errors, { allowEmpty = true } = {}) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.trim() === '')) {
    errors.push(`${label} 必须为字符串数组`);
    return [];
  }
  if (!allowEmpty && value.length === 0) errors.push(`${label} 不得为空`);
  return value;
}

function resolveProjectPath(root, candidate) {
  return path.isAbsolute(candidate) ? candidate : path.resolve(root, candidate);
}

function validateProject(project, source) {
  const errors = [];
  if (project.schemaVersion !== 1) errors.push(`${source}: schemaVersion 必须为 1`);
  nonEmpty(project.project?.id, `${source}: project.id`, errors);
  nonEmpty(project.project?.root, `${source}: project.root`, errors);
  nonEmpty(project.project?.language, `${source}: project.language`, errors);
  const root = project.project?.root ? path.resolve(project.project.root) : '';
  if (root && !fs.existsSync(root)) errors.push(`${source}: project.root 不存在：${root}`);

  const repositories = project.repositories;
  if (!repositories || typeof repositories !== 'object' || Array.isArray(repositories)) {
    errors.push(`${source}: repositories 必须为对象`);
  } else {
    for (const [key, repository] of Object.entries(repositories)) {
      nonEmpty(repository.path, `${source}: repositories.${key}.path`, errors);
      if (typeof repository.writable !== 'boolean') errors.push(`${source}: repositories.${key}.writable 必须为 boolean`);
      if (repository.path && !fs.existsSync(path.resolve(repository.path))) {
        errors.push(`${source}: repository 不存在：${repository.path}`);
      }
    }
  }

  const documents = project.documents;
  if (!documents || typeof documents !== 'object' || Array.isArray(documents)) {
    errors.push(`${source}: documents 必须为对象`);
  } else {
    for (const [key, document] of Object.entries(documents)) {
      nonEmpty(document.path, `${source}: documents.${key}.path`, errors);
      if (document.path) {
        const resolved = resolveProjectPath(root, document.path);
        if (!fs.existsSync(resolved)) errors.push(`${source}: document ${key} 不存在：${resolved}`);
      }
    }
  }

  const bundles = project.contextBundles;
  if (!bundles || typeof bundles !== 'object' || Array.isArray(bundles)) {
    errors.push(`${source}: contextBundles 必须为对象`);
  } else {
    for (const [name, refs] of Object.entries(bundles)) {
      for (const ref of stringArray(refs, `${source}: contextBundles.${name}`, errors, { allowEmpty: false })) {
        if (!documents?.[ref]) errors.push(`${source}: bundle ${name} 引用了未知 document：${ref}`);
      }
    }
  }

  if (project.policy?.delegation?.automaticRetry !== false) {
    errors.push(`${source}: policy.delegation.automaticRetry 必须为 false`);
  }
  if (project.policy?.delegation?.nestedDelegates !== false) {
    errors.push(`${source}: policy.delegation.nestedDelegates 必须为 false`);
  }
  const maxParallel = project.policy?.delegation?.maxParallel;
  if (!Number.isInteger(maxParallel) || maxParallel < 1) {
    errors.push(`${source}: policy.delegation.maxParallel 必须为正整数`);
  }
  return errors;
}

function validateTask(taskDoc, project, source) {
  const errors = [];
  if (taskDoc.schemaVersion !== 1) errors.push(`${source}: schemaVersion 必须为 1`);
  const task = taskDoc.task;
  if (!task || typeof task !== 'object') return [`${source}: 缺少 task 对象`];
  nonEmpty(task.id, `${source}: task.id`, errors);
  nonEmpty(task.projectId, `${source}: task.projectId`, errors);
  if (task.projectId !== project.project?.id) {
    errors.push(`${source}: task.projectId=${task.projectId} 与 project.id=${project.project?.id} 不一致`);
  }
  nonEmpty(task.execution?.authorizationPhrase, `${source}: task.execution.authorizationPhrase`, errors);
  for (const bundle of stringArray(task.contextBundles, `${source}: task.contextBundles`, errors)) {
    if (!project.contextBundles?.[bundle]) errors.push(`${source}: 未知 context bundle：${bundle}`);
  }

  if (!Array.isArray(task.nodes) || task.nodes.length === 0) {
    errors.push(`${source}: task.nodes 必须为非空数组`);
    return errors;
  }
  const ids = new Set();
  for (const [index, node] of task.nodes.entries()) {
    const label = `${source}: task.nodes[${index}]`;
    nonEmpty(node.id, `${label}.id`, errors);
    nonEmpty(node.title, `${label}.title`, errors);
    nonEmpty(node.role, `${label}.role`, errors);
    if (ids.has(node.id)) errors.push(`${label}: 重复 node id ${node.id}`);
    ids.add(node.id);
    stringArray(node.dependsOn, `${label}.dependsOn`, errors);
    stringArray(node.owns, `${label}.owns`, errors);
    stringArray(node.excludes, `${label}.excludes`, errors);
    stringArray(node.acceptance, `${label}.acceptance`, errors, { allowEmpty: false });
    for (const bundle of stringArray(node.contextBundles ?? [], `${label}.contextBundles`, errors)) {
      if (!project.contextBundles?.[bundle]) errors.push(`${label}: 未知 context bundle ${bundle}`);
    }
    if (!Array.isArray(node.tests)) {
      errors.push(`${label}.tests 必须为数组`);
    } else {
      const testNames = new Set();
      for (const [testIndex, test] of node.tests.entries()) {
        nonEmpty(test.name, `${label}.tests[${testIndex}].name`, errors);
        nonEmpty(test.command, `${label}.tests[${testIndex}].command`, errors);
        if (testNames.has(test.name)) errors.push(`${label}: 重复 test name ${test.name}`);
        testNames.add(test.name);
        if (typeof test.mandatory !== 'boolean') errors.push(`${label}.tests[${testIndex}].mandatory 必须为 boolean`);
      }
    }
  }

  for (const node of task.nodes) {
    for (const dependency of node.dependsOn ?? []) {
      if (!ids.has(dependency)) errors.push(`${source}: node ${node.id} 依赖未知 node ${dependency}`);
      if (dependency === node.id) errors.push(`${source}: node ${node.id} 不得依赖自身`);
    }
  }

  const visiting = new Set();
  const visited = new Set();
  const byId = new Map(task.nodes.map((node) => [node.id, node]));
  function visit(id, trail) {
    if (visiting.has(id)) {
      errors.push(`${source}: DAG 存在环：${[...trail, id].join(' -> ')}`);
      return;
    }
    if (visited.has(id) || !byId.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id).dependsOn ?? []) visit(dependency, [...trail, id]);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of ids) visit(id, []);

  if (!Array.isArray(task.stages) || task.stages.length === 0) {
    errors.push(`${source}: task.stages 必须为非空数组`);
  } else {
    const staged = new Set();
    for (const [index, stage] of task.stages.entries()) {
      nonEmpty(stage.id, `${source}: task.stages[${index}].id`, errors);
      if (!Number.isInteger(stage.maxParallel) || stage.maxParallel < 1) {
        errors.push(`${source}: stage ${stage.id} maxParallel 必须为正整数`);
      }
      for (const nodeId of stringArray(stage.nodes, `${source}: stage ${stage.id}.nodes`, errors, { allowEmpty: false })) {
        if (!ids.has(nodeId)) errors.push(`${source}: stage ${stage.id} 引用未知 node ${nodeId}`);
        if (staged.has(nodeId)) errors.push(`${source}: node ${nodeId} 出现在多个 stage`);
        staged.add(nodeId);
      }
    }
    for (const id of ids) if (!staged.has(id)) errors.push(`${source}: node ${id} 未分配 stage`);
  }

  const gateIds = new Set();
  for (const [index, gate] of (task.environmentGates ?? []).entries()) {
    nonEmpty(gate.id, `${source}: environmentGates[${index}].id`, errors);
    nonEmpty(gate.title, `${source}: environmentGates[${index}].title`, errors);
    if (gateIds.has(gate.id)) errors.push(`${source}: 重复 gate id ${gate.id}`);
    gateIds.add(gate.id);
    if (typeof gate.mandatory !== 'boolean') errors.push(`${source}: gate ${gate.id}.mandatory 必须为 boolean`);
  }
  return errors;
}

function validateAuthorization(authorization, taskDoc, source, { forCompile = false } = {}) {
  const errors = [];
  if (authorization.schemaVersion !== 1) errors.push(`${source}: schemaVersion 必须为 1`);
  if (authorization.taskId !== taskDoc.task?.id) errors.push(`${source}: taskId 与 task.id 不一致`);
  if (forCompile && authorization.template === true) errors.push(`${source}: template authorization 不得 compile`);
  if (!authorization.template) {
    nonEmpty(authorization.authorizationRef, `${source}: authorizationRef`, errors);
    nonEmpty(authorization.authorizedAt, `${source}: authorizedAt`, errors);
  }
  if (authorization.authorizationPhrase !== taskDoc.task?.execution?.authorizationPhrase) {
    errors.push(`${source}: authorizationPhrase 与 task 不完全一致`);
  }
  const permissionKeys = [
    'productCodeChanges', 'trackerWrites', 'localCommits', 'backendMutation',
    'push', 'mergeToMain', 'destructiveLocalReset', 'remoteDataReset', 'closeTask'
  ];
  for (const key of permissionKeys) {
    if (typeof authorization.permissions?.[key] !== 'boolean') errors.push(`${source}: permissions.${key} 必须为 boolean`);
  }
  return errors;
}

function loadAndValidate(args, { requireAuthorization = false, forCompile = false } = {}) {
  const projectFile = requireArg(args, 'project');
  const taskFile = requireArg(args, 'task');
  const project = readJson(projectFile);
  const taskDoc = readJson(taskFile);
  let errors = [...validateProject(project, projectFile), ...validateTask(taskDoc, project, taskFile)];
  let authorization = null;
  let authorizationFile = null;
  if (args.authorization) {
    authorizationFile = path.resolve(args.authorization);
    authorization = readJson(authorizationFile);
    errors = [...errors, ...validateAuthorization(authorization, taskDoc, authorizationFile, { forCompile })];
  } else if (requireAuthorization) {
    errors.push('缺少 --authorization');
  }
  if (errors.length > 0) fail(`配置校验失败：\n- ${errors.join('\n- ')}`);
  return { projectFile, taskFile, authorizationFile, project, taskDoc, authorization };
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function resolvedContext(project, task) {
  const names = new Set(task.contextBundles ?? []);
  for (const node of task.nodes) for (const name of node.contextBundles ?? []) names.add(name);
  const result = {};
  for (const name of names) {
    result[name] = project.contextBundles[name].map((key) => ({
      key,
      path: resolveProjectPath(project.project.root, project.documents[key].path),
      required: project.documents[key].required !== false
    }));
  }
  return result;
}

function ensureNewOutput(file) {
  if (fs.existsSync(file)) fail(`拒绝覆盖已存在文件：${file}`);
}

function scaffoldTask(args) {
  const projectFile = requireArg(args, 'project');
  const output = requireArg(args, 'output');
  const taskId = args['task-id'];
  const title = args.title;
  if (!taskId) fail('scaffold-task 缺少 --task-id');
  if (!title) fail('scaffold-task 缺少 --title');
  ensureNewOutput(output);
  const project = readJson(projectFile);
  const errors = validateProject(project, projectFile);
  if (errors.length > 0) fail(`Project 校验失败：\n- ${errors.join('\n- ')}`);
  const bundle = project.contextBundles.default ? 'default' : Object.keys(project.contextBundles)[0];
  const typecheck = project.commands?.typecheck ?? 'TODO: add focused validation command';
  const taskDoc = {
    schemaVersion: 1,
    task: {
      id: taskId,
      projectId: project.project.id,
      title,
      authority: { source: 'TODO: issue/spec/comment authority' },
      contextBundles: [bundle],
      execution: {
        authorizationPhrase: `开始执行 ${taskId} 多 Agent 工作流`,
        reportLanguage: project.reporting?.language ?? project.project.language
      },
      stages: [{ id: 'stage-1', maxParallel: 1, nodes: ['implementation'] }],
      nodes: [{
        id: 'implementation',
        title,
        role: 'implementation',
        dependsOn: [],
        contextBundles: [bundle],
        owns: [],
        excludes: [],
        acceptance: ['TODO: 写入可验证的行为验收标准'],
        tests: [{ name: 'typecheck', command: typecheck, mandatory: true }]
      }],
      environmentGates: [{ id: 'automated-tests', title: '自动化测试与静态检查', mandatory: true }]
    }
  };
  writeJson(output, taskDoc);
  console.log(`PASS: 已生成 task scaffold：${output}`);
}

function scaffoldAuthorization(args) {
  const taskFile = requireArg(args, 'task');
  const output = requireArg(args, 'output');
  ensureNewOutput(output);
  const taskDoc = readJson(taskFile);
  if (!taskDoc.task?.id || !taskDoc.task?.execution?.authorizationPhrase) fail(`${taskFile}: 缺少 task id/authorizationPhrase`);
  writeJson(output, {
    schemaVersion: 1,
    taskId: taskDoc.task.id,
    template: true,
    authorizationRef: null,
    authorizationPhrase: taskDoc.task.execution.authorizationPhrase,
    authorizedAt: null,
    permissions: {
      productCodeChanges: false,
      trackerWrites: false,
      localCommits: false,
      backendMutation: false,
      push: false,
      mergeToMain: false,
      destructiveLocalReset: false,
      remoteDataReset: false,
      closeTask: false
    }
  });
  console.log(`PASS: 已生成 authorization template：${output}`);
}

function compile(args) {
  const loaded = loadAndValidate(args, { requireAuthorization: true, forCompile: true });
  const output = requireArg(args, 'output');
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sources: {
      project: loaded.projectFile,
      projectSha256: sha256(loaded.projectFile),
      task: loaded.taskFile,
      taskSha256: sha256(loaded.taskFile),
      authorization: loaded.authorizationFile,
      authorizationSha256: sha256(loaded.authorizationFile)
    },
    project: loaded.project,
    task: loaded.taskDoc.task,
    authorization: loaded.authorization,
    resolvedContext: resolvedContext(loaded.project, loaded.taskDoc.task)
  };
  writeJson(output, manifest);
  console.log(`PASS: 已生成 execution manifest：${output}`);
}

function initLedger(args) {
  const manifestFile = requireArg(args, 'manifest');
  const output = requireArg(args, 'output');
  const manifest = readJson(manifestFile);
  if (manifest.schemaVersion !== 1 || !manifest.task?.id) fail(`${manifestFile}: 非法 execution manifest`);
  const ledger = {
    schemaVersion: 1,
    taskId: manifest.task.id,
    executionManifest: manifestFile,
    createdAt: new Date().toISOString(),
    baseline: {
      status: 'PENDING',
      frontendCommit: null,
      backendCommit: null,
      nodeVersion: null,
      lockfileSha256: null,
      rawLog: null
    },
    integration: { worktree: null, branch: null, commit: null, clean: null },
    nodes: Object.fromEntries(manifest.task.nodes.map((node) => [node.id, {
      status: 'PENDING', issueId: null, worktree: null, branch: null, baseCommit: null,
      commits: [], runs: [], tests: [], review: { status: 'PENDING', report: null }
    }])),
    runs: [],
    gates: Object.fromEntries((manifest.task.environmentGates ?? []).map((gate) => [gate.id, {
      status: 'PENDING', mandatory: gate.mandatory, evidence: null, blocker: null
    }])),
    parent: { computedStatus: 'blocked', closeAuthorized: manifest.authorization?.permissions?.closeTask === true },
    notes: []
  };
  writeJson(output, ledger);
  console.log(`PASS: 已初始化 run ledger：${output}`);
}

function computeParentStatus(manifest, ledger) {
  const nodeStatuses = manifest.task.nodes.map((node) => ledger.nodes?.[node.id]?.status ?? 'PENDING');
  const mandatoryGateStatuses = (manifest.task.environmentGates ?? [])
    .filter((gate) => gate.mandatory)
    .map((gate) => ledger.gates?.[gate.id]?.status ?? 'PENDING');
  const blocked = nodeStatuses.some((status) => status !== 'PASS') ||
    mandatoryGateStatuses.some((status) => !['PASS', 'NOT_APPLICABLE'].includes(status));
  if (blocked) return 'blocked';
  return manifest.authorization?.permissions?.closeTask === true ? 'done' : 'review';
}

function validateLedgerDocument(manifest, ledger, source, final) {
  const errors = [];
  if (ledger.schemaVersion !== 1) errors.push(`${source}: schemaVersion 必须为 1`);
  if (ledger.taskId !== manifest.task.id) errors.push(`${source}: taskId 与 manifest 不一致`);
  const expectedNodes = new Set(manifest.task.nodes.map((node) => node.id));
  const actualNodes = new Set(Object.keys(ledger.nodes ?? {}));
  for (const id of expectedNodes) if (!actualNodes.has(id)) errors.push(`${source}: 缺少 node ${id}`);
  for (const id of actualNodes) if (!expectedNodes.has(id)) errors.push(`${source}: 未知 node ${id}`);

  for (const node of manifest.task.nodes) {
    const actual = ledger.nodes?.[node.id];
    if (!actual) continue;
    if (!STATUS.has(actual.status)) errors.push(`${source}: node ${node.id} status 非法：${actual.status}`);
    if (final && actual.status !== 'PASS') errors.push(`${source}: final 时 node ${node.id}=${actual.status}`);
    if (actual.status === 'PASS') {
      for (const test of node.tests.filter((item) => item.mandatory)) {
        const result = (actual.tests ?? []).find((item) => item.name === test.name && item.command === test.command);
        if (!result) {
          errors.push(`${source}: node ${node.id} 缺少 mandatory test ${test.name}`);
          continue;
        }
        if (result.status !== 'PASS' || result.exitCode !== 0) errors.push(`${source}: node ${node.id} test ${test.name} 未 PASS`);
        if (!Number.isInteger(result.testCount) || !Number.isInteger(result.failureCount)) {
          errors.push(`${source}: node ${node.id} test ${test.name} 缺少测试计数`);
        }
        nonEmpty(result.rawLog, `${source}: node ${node.id} test ${test.name}.rawLog`, errors);
      }
    }
  }

  const runIds = new Set();
  for (const [index, run] of (ledger.runs ?? []).entries()) {
    nonEmpty(run.runId, `${source}: runs[${index}].runId`, errors);
    if (runIds.has(run.runId)) errors.push(`${source}: 重复 runId ${run.runId}`);
    runIds.add(run.runId);
    if (run.nodeId && !expectedNodes.has(run.nodeId)) errors.push(`${source}: run ${run.runId} 引用未知 node ${run.nodeId}`);
    if (run.outcome != null && !RUN_OUTCOMES.has(run.outcome)) errors.push(`${source}: run ${run.runId} outcome 非法`);
    if (final && !RUN_OUTCOMES.has(run.outcome)) errors.push(`${source}: final 时 run ${run.runId} 未最终归类`);
    if (run.outcome === 'replaced') {
      nonEmpty(run.replacementRunId, `${source}: replaced run ${run.runId}.replacementRunId`, errors);
      nonEmpty(run.retryAuthorizationRef, `${source}: replaced run ${run.runId}.retryAuthorizationRef`, errors);
    }
  }

  for (const gate of manifest.task.environmentGates ?? []) {
    const actual = ledger.gates?.[gate.id];
    if (!actual) {
      errors.push(`${source}: 缺少 gate ${gate.id}`);
      continue;
    }
    if (!GATE_STATUS.has(actual.status)) errors.push(`${source}: gate ${gate.id} status 非法：${actual.status}`);
    if (final && gate.mandatory && !['PASS', 'NOT_APPLICABLE'].includes(actual.status)) {
      errors.push(`${source}: final 时 mandatory gate ${gate.id}=${actual.status}`);
    }
    if (['PASS', 'FAIL', 'BLOCKED', 'NOT_APPLICABLE'].includes(actual.status)) {
      nonEmpty(actual.evidence ?? actual.blocker, `${source}: gate ${gate.id} evidence/blocker`, errors);
    }
  }

  const computed = computeParentStatus(manifest, ledger);
  if (ledger.parent?.computedStatus !== computed) {
    errors.push(`${source}: parent.computedStatus=${ledger.parent?.computedStatus}，应为 ${computed}`);
  }
  if (final && !ledger.integration?.commit) errors.push(`${source}: final 时缺少 integration.commit`);
  if (final && ledger.integration?.clean !== true) errors.push(`${source}: final 时 integration.clean 必须为 true`);
  return { errors, computed };
}

function validateLedger(args) {
  const manifestFile = requireArg(args, 'manifest');
  const ledgerFile = requireArg(args, 'ledger');
  const manifest = readJson(manifestFile);
  const ledger = readJson(ledgerFile);
  const result = validateLedgerDocument(manifest, ledger, ledgerFile, args.final);
  if (result.errors.length > 0) fail(`Ledger 校验失败（建议父状态：${result.computed}）：\n- ${result.errors.join('\n- ')}`);
  console.log(`PASS: ledger 有效；建议父状态：${result.computed}`);
}

function report(args) {
  const manifestFile = requireArg(args, 'manifest');
  const ledgerFile = requireArg(args, 'ledger');
  const output = requireArg(args, 'output');
  const manifest = readJson(manifestFile);
  const ledger = readJson(ledgerFile);
  const { errors, computed } = validateLedgerDocument(manifest, ledger, ledgerFile, false);
  if (errors.length > 0) fail(`生成报告前 ledger 无效：\n- ${errors.join('\n- ')}`);
  const nodeRows = manifest.task.nodes.map((node) => {
    const actual = ledger.nodes[node.id];
    return `| ${node.id} | ${node.title} | ${actual.status} | ${(actual.commits ?? []).join(', ') || '—'} |`;
  });
  const gateRows = (manifest.task.environmentGates ?? []).map((gate) => {
    const actual = ledger.gates[gate.id];
    return `| ${gate.id} | ${gate.title} | ${actual.status} | ${actual.evidence || actual.blocker || '—'} |`;
  });
  const failedRuns = (ledger.runs ?? []).filter((run) => run.outcome && run.outcome !== 'integrated');
  const lines = [
    `# ${manifest.task.id} 多 Agent 执行报告`, '',
    `- 生成时间：${new Date().toISOString()}`,
    `- 项目：${manifest.project.project.id}`,
    `- 权威来源：${JSON.stringify(manifest.task.authority ?? {})}`,
    `- 集成提交：${ledger.integration?.commit ?? '—'}`,
    `- 建议父状态：${computed}`,
    '', '## Node 结果', '',
    '| Node | 目标 | 状态 | Commit |', '|---|---|---|---|', ...nodeRows,
    '', '## 强制门禁', '',
    '| Gate | 目标 | 状态 | 证据/阻塞 |', '|---|---|---|---|', ...gateRows,
    '', '## 非成功 Agent 运行', ''
  ];
  if (failedRuns.length === 0) lines.push('- 无');
  else for (const run of failedRuns) lines.push(`- ${run.runId} / ${run.nodeId ?? 'unknown'}：${run.outcome}；${run.error ?? run.reason ?? '无说明'}`);
  lines.push('', '## 权限边界', '');
  for (const [key, value] of Object.entries(manifest.authorization.permissions)) lines.push(`- ${key}: ${value}`);
  lines.push('');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${lines.join('\n')}\n`);
  console.log(`PASS: 已生成中文报告：${output}`);
}

const args = parseArgs(process.argv.slice(2));
switch (args.command) {
  case 'scaffold-task': scaffoldTask(args); break;
  case 'scaffold-authorization': scaffoldAuthorization(args); break;
  case 'validate': {
    const loaded = loadAndValidate(args, { requireAuthorization: false, forCompile: false });
    console.log(`PASS: project=${loaded.project.project.id}; task=${loaded.taskDoc.task.id}; nodes=${loaded.taskDoc.task.nodes.length}`);
    break;
  }
  case 'compile': compile(args); break;
  case 'init-ledger': initLedger(args); break;
  case 'validate-ledger': validateLedger(args); break;
  case 'report': report(args); break;
  default: fail(`未知命令：${args.command}`);
}
