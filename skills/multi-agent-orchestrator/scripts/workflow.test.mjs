import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const cli = new URL('./workflow.mjs', import.meta.url).pathname;

function run(args, expected = 0) {
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(result.status, expected, `command: ${args.join(' ')}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
  return result;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-v2-'));
  fs.writeFileSync(path.join(root, 'AGENTS.md'), '# fixture\n');
  const projectFile = path.join(root, 'project.json');
  const taskFile = path.join(root, 'task.json');
  const authorizationFile = path.join(root, 'authorization.json');
  const manifestFile = path.join(root, 'manifest.json');
  const ledgerFile = path.join(root, 'ledger.json');
  writeJson(projectFile, {
    schemaVersion: 1,
    project: { id: 'fixture', root, language: 'zh-CN' },
    repositories: { primary: { path: root, writable: true } },
    documents: { guidance: { path: 'AGENTS.md', required: true } },
    contextBundles: { default: ['guidance'] },
    commands: { typecheck: 'node --check example.mjs' },
    adapters: {},
    policy: {
      delegation: { maxParallel: 2, nestedDelegates: false, automaticRetry: false, failurePolicy: 'stop-and-ask' },
      review: {
        defaultMode: 'independent',
        riskModes: { low: 'receipt', medium: 'independent', high: 'cross-model' },
        integrationReviewForRisk: ['high']
      }
    },
    reporting: { language: 'zh-CN' }
  });
  writeJson(taskFile, {
    schemaVersion: 1,
    task: {
      id: 'FIX-1', projectId: 'fixture', title: 'fixture', authority: { source: 'test' },
      contextBundles: ['default'],
      execution: {
        authorizationPhrase: '开始执行 FIX-1 多 Agent 工作流',
        scheduling: { mode: 'rolling-window', pilotNode: 'A' }
      },
      stages: [{ id: 'stage-1', maxParallel: 2, nodes: ['A', 'B'] }],
      nodes: [
        {
          id: 'A', title: 'pilot', role: 'implementation', risk: 'low', review: { mode: 'receipt', batch: null },
          dependsOn: [], dependencyInputs: [], contextBundles: ['default'], owns: ['a'], excludes: [],
          acceptance: ['pilot behavior'],
          behavioralProofs: [{ id: 'a-proof', scenario: 'pilot real behavior', test: 'a-test', mandatory: true }],
          tests: [{ name: 'a-test', command: 'test-a', mandatory: true }]
        },
        {
          id: 'B', title: 'high-risk', role: 'implementation', risk: 'high', review: { mode: 'cross-model', batch: null },
          dependsOn: ['A'], dependencyInputs: [{ node: 'A', requiredOutputs: ['contract'] }],
          contextBundles: ['default'], owns: ['b'], excludes: [], acceptance: ['integrated behavior'],
          behavioralProofs: [{ id: 'b-proof', scenario: 'negative transition', test: 'b-test', mandatory: true }],
          tests: [{ name: 'b-test', command: 'test-b', mandatory: true }]
        }
      ],
      verification: { bindToIntegrationCommit: true, integrationReview: { mode: 'cross-model', required: true } },
      environmentGates: [{ id: 'runtime', title: 'runtime behavior', mandatory: true }]
    }
  });
  writeJson(authorizationFile, {
    schemaVersion: 1, taskId: 'FIX-1', template: false, authorizationRef: 'test-message',
    authorizationPhrase: '开始执行 FIX-1 多 Agent 工作流', authorizedAt: new Date().toISOString(),
    permissions: {
      productCodeChanges: true, trackerWrites: false, localCommits: true, backendMutation: false,
      push: false, mergeToMain: false, destructiveLocalReset: false, remoteDataReset: false, closeTask: false
    }
  });
  run(['compile', '--project', projectFile, '--task', taskFile, '--authorization', authorizationFile, '--output', manifestFile]);
  run(['init-ledger', '--manifest', manifestFile, '--output', ledgerFile]);
  return { root, projectFile, taskFile, authorizationFile, manifestFile, ledgerFile };
}

function runtime(f, command, args = [], expected = 0) {
  return run([command, '--manifest', f.manifestFile, '--ledger', f.ledgerFile, ...args], expected);
}

test('pilot-first, rolling readiness, evidence recording, final validation and stale invalidation', () => {
  const f = fixture();
  const first = JSON.parse(runtime(f, 'ready').stdout);
  assert.deepEqual(first.ready, ['A']);

  runtime(f, 'baseline-set', ['--status', 'PASS', '--frontend-commit', 'base', '--node-version', '22', '--lockfile-sha256', 'lock', '--raw-log', '/tmp/baseline.log']);
  runtime(f, 'run-start', ['--node', 'A', '--run-id', 'run-a', '--base-commit', 'base', '--worktree', '/tmp/a', '--branch', 'a']);
  runtime(f, 'node-output', ['--node', 'A', '--key', 'contract', '--value', 'contract-v1']);
  runtime(f, 'test-record', ['--node', 'A', '--name', 'a-test', '--command', 'test-a', '--status', 'PASS', '--exit-code', '0', '--test-count', '1', '--failure-count', '0', '--raw-log', '/tmp/a.log', '--verified-commit', 'a1']);
  runtime(f, 'run-finish', ['--run-id', 'run-a', '--outcome', 'integrated', '--commit', 'a1']);
  assert.deepEqual(JSON.parse(runtime(f, 'ready').stdout).ready, ['B']);

  runtime(f, 'run-start', ['--node', 'B', '--run-id', 'run-b', '--base-commit', 'a1']);
  runtime(f, 'test-record', ['--node', 'B', '--name', 'b-test', '--command', 'test-b', '--status', 'PASS', '--exit-code', '0', '--test-count', '2', '--failure-count', '0', '--raw-log', '/tmp/b.log', '--verified-commit', 'b1']);
  runtime(f, 'review-record', ['--target', 'B', '--status', 'PASS', '--mode', 'cross-model', '--report', '/tmp/b-review.md', '--verified-commit', 'b1']);
  runtime(f, 'run-finish', ['--run-id', 'run-b', '--outcome', 'integrated', '--commit', 'b1']);
  runtime(f, 'integration-set', ['--commit', 'integration-1', '--clean', 'true', '--worktree', '/tmp/integration', '--branch', 'integration']);
  runtime(f, 'review-record', ['--target', 'integration', '--status', 'PASS', '--mode', 'cross-model', '--report', '/tmp/integration-review.md', '--verified-commit', 'integration-1']);
  runtime(f, 'gate-set', ['--gate', 'runtime', '--status', 'PASS', '--evidence', '/tmp/runtime.log', '--verified-commit', 'integration-1']);

  const status = JSON.parse(runtime(f, 'status').stdout);
  assert.equal(status.parent, 'review');
  assert.deepEqual(status.staleEvidence, []);
  runtime(f, 'validate-ledger', ['--final']);
  const report = path.join(f.root, 'report.zh-CN.md');
  run(['report', '--manifest', f.manifestFile, '--ledger', f.ledgerFile, '--output', report]);
  const reportText = fs.readFileSync(report, 'utf8');
  assert.match(reportText, /## 集成审查/);
  assert.match(reportText, /## 复盘分类/);
  assert.match(reportText, /review/);

  runtime(f, 'integration-set', ['--commit', 'integration-2', '--clean', 'true']);
  const stale = JSON.parse(runtime(f, 'resume').stdout);
  assert.equal(stale.parent, 'blocked');
  assert.deepEqual(stale.staleEvidence.sort(), ['gate:runtime', 'integration:review']);
  runtime(f, 'validate-ledger', ['--final'], 1);
});

test('ledger lock rejects live owner, recovers dead owner, inbox drains once, and feedback is classified', () => {
  const f = fixture();
  const lock = `${f.ledgerFile}.lock`;
  fs.writeFileSync(lock, `${JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })}\n`);
  runtime(f, 'inbox-push', ['--event-id', 'e-live', '--kind', 'completion'], 1);
  assert.equal(fs.existsSync(lock), true);
  fs.unlinkSync(lock);

  runtime(f, 'gate-set', ['--gate', 'runtime', '--status', 'PASS'], 1);
  assert.equal(fs.existsSync(lock), false, 'failed mutation must release its own lock');

  fs.writeFileSync(lock, `${JSON.stringify({ pid: 99999999, createdAt: '2000-01-01T00:00:00.000Z' })}\n`);
  runtime(f, 'inbox-push', ['--event-id', 'e-1', '--kind', 'completion', '--run-id', 'run-a', '--node', 'A', '--payload', 'done']);
  assert.equal(fs.existsSync(lock), false);
  const drained = JSON.parse(runtime(f, 'inbox-drain').stdout);
  assert.equal(drained.length, 1);
  assert.equal(JSON.parse(runtime(f, 'inbox-drain').stdout).length, 0);

  runtime(f, 'feedback-record', ['--class', 'duplicate-review', '--scope', 'engine', '--decision', 'accepted', '--evidence', 'session:test', '--enforcement', 'risk-policy']);
  const ledger = JSON.parse(fs.readFileSync(f.ledgerFile, 'utf8'));
  assert.equal(ledger.retrospective.findings[0].scope, 'engine');
});

test('scaffold emits explicit pilot, review policy, behavioral proof, and no unnecessary medium-risk integration review', () => {
  const f = fixture();
  const output = path.join(f.root, 'scaffold.json');
  run(['scaffold-task', '--project', f.projectFile, '--task-id', 'FIX-2', '--title', 'new task', '--output', output]);
  const task = JSON.parse(fs.readFileSync(output, 'utf8')).task;
  assert.equal(task.execution.scheduling.pilotNode, 'implementation');
  assert.equal(task.nodes[0].review.mode, 'independent');
  assert.equal(task.nodes[0].behavioralProofs[0].test, 'primary-behavior');
  assert.equal(task.verification.integrationReview.required, false);
  assert.equal(task.verification.integrationReview.mode, 'none');

  const authorization = path.join(f.root, 'scaffold-authorization.json');
  writeJson(authorization, {
    schemaVersion: 1,
    template: false,
    taskId: 'FIX-2',
    authorizationRef: 'fixture',
    authorizedAt: new Date().toISOString(),
    authorizationPhrase: task.execution.authorizationPhrase,
    permissions: {
      productCodeChanges: true,
      trackerWrites: false,
      localCommits: true,
      backendMutation: false,
      push: false,
      mergeToMain: false,
      destructiveLocalReset: false,
      remoteDataReset: false,
      closeTask: false
    }
  });
  const manifest = path.join(f.root, 'scaffold-manifest.json');
  const compiled = run(['compile', '--project', f.projectFile, '--task', output, '--authorization', authorization, '--output', manifest], 1);
  assert.match(compiled.stderr, /仍含 TODO，占位配置不可 compile/);
});

test('project risk policy rejects weakened high-risk review', () => {
  const f = fixture();
  const task = JSON.parse(fs.readFileSync(f.taskFile, 'utf8'));
  task.task.nodes[1].review.mode = 'receipt';
  writeJson(f.taskFile, task);
  const result = run(['validate', '--project', f.projectFile, '--task', f.taskFile], 1);
  assert.match(result.stderr, /低于 high 风险要求 cross-model/);
});

test('legacy v1 task without v0.2 optional fields remains valid', () => {
  const f = fixture();
  const task = JSON.parse(fs.readFileSync(f.taskFile, 'utf8'));
  delete task.task.execution.scheduling;
  delete task.task.verification;
  for (const node of task.task.nodes) {
    delete node.risk;
    delete node.review;
    delete node.dependencyInputs;
    delete node.behavioralProofs;
  }
  writeJson(f.taskFile, task);
  run(['validate', '--project', f.projectFile, '--task', f.taskFile]);
});
