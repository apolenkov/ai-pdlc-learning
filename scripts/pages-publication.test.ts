import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { isMap, isSeq, parseDocument } from 'yaml';

const workflow = parseDocument(
  readFileSync(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8'),
);
const steps = workflow.getIn(['jobs', 'build', 'steps']);
assert.ok(isSeq(steps));
const buildSteps = steps.items.filter(isMap);
const publicationGate = buildSteps.find((step) => step.get('id') === 'pages-eligibility');
assert.ok(publicationGate);
const gateScript = publicationGate.get('run');
assert.ok(typeof gateScript === 'string');
const course = 'apolenkov/ai-pdlc-learning';

await test('configure, upload and deploy consume the same publication decision', () => {
  const pushBranches = workflow.getIn(['on', 'push', 'branches']);
  assert.ok(isSeq(pushBranches));
  assert.deepEqual(pushBranches.toJSON(), ['main']);
  assert.ok(workflow.hasIn(['on', 'workflow_dispatch']));
  assert.equal(publicationGate.get('shell'), 'bash');
  assert.equal(publicationGate.getIn(['env', 'GH_TOKEN']), '${{ github.token }}');

  const jobs = workflow.get('jobs');
  assert.ok(isMap(jobs));
  const workflowSteps = jobs.items.flatMap(({ value: job }) => {
    const jobSteps = isMap(job) ? job.get('steps') : undefined;
    return isSeq(jobSteps) ? jobSteps.items.filter(isMap) : [];
  });
  for (const action of ['configure-pages', 'upload-pages-artifact']) {
    const actionSteps = workflowSteps.filter((step) => {
      const uses = step.get('uses');
      return typeof uses === 'string' && uses.toLowerCase().startsWith(`actions/${action}@`);
    });
    assert.ok(actionSteps.length > 0, `Missing actions/${action} step`);
    for (const step of actionSteps) {
      assert.ok(buildSteps.includes(step), `actions/${action} must run in the build job`);
      assert.equal(step.get('if'), "steps.pages-eligibility.outputs.publish == 'true'");
    }
  }
  assert.equal(
    workflow.getIn(['jobs', 'build', 'outputs', 'publish']),
    '${{ steps.pages-eligibility.outputs.publish }}',
  );
  assert.equal(workflow.getIn(['jobs', 'deploy', 'needs']), 'build');
  assert.equal(
    workflow.getIn(['jobs', 'deploy', 'if']),
    "github.event_name != 'pull_request' && github.ref == 'refs/heads/main' && needs.build.outputs.publish == 'true'",
  );
  const deployAction = workflow.getIn(['jobs', 'deploy', 'steps', 0, 'uses']);
  assert.ok(typeof deployAction === 'string');
  assert.match(deployAction, /^actions\/deploy-pages@/);
});

const mockGh = `
gh() {
  [[ "$1" == api && "$2" == repositories/123 && "$3" == --jq ]] || return 41
  [[ "$MOCK_REPOSITORY" != unavailable ]] || return 42
  printf '%s\\n' "$MOCK_REPOSITORY"
}
`;

const cases = [
  { name: 'push on main', event: 'push', allowed: true },
  { name: 'manual run on main', event: 'workflow_dispatch', allowed: true },
  { name: 'push on another branch', event: 'push', ref: 'refs/heads/next' },
  { name: 'manual run on another branch', event: 'workflow_dispatch', ref: 'refs/heads/next' },
  { name: 'manual run on Main', event: 'workflow_dispatch', ref: 'refs/heads/Main' },
  { name: 'manual run on a tag', event: 'workflow_dispatch', ref: 'refs/tags/main' },
  { name: 'pull request on main', event: 'pull_request' },
  { name: 'push in another repository', event: 'push', repository: 'example/ai-pdlc-learning' },
  {
    name: 'manual run in a course copy',
    event: 'workflow_dispatch',
    repository: 'apolenkov/ai-pdlc-learning-copy',
  },
  {
    name: 'repository with different casing',
    event: 'workflow_dispatch',
    repository: 'APOLENKOV/ai-pdlc-learning',
  },
  { name: 'push in a private course', event: 'push', metadata: `${course} private` },
  {
    name: 'manual run in an internal course',
    event: 'workflow_dispatch',
    metadata: `${course} internal`,
  },
  { name: 'missing visibility', event: 'push', metadata: `${course} ` },
  { name: 'renamed repository', event: 'push', metadata: 'example/ai-pdlc-learning public' },
  {
    name: 'metadata lookup fails',
    event: 'workflow_dispatch',
    metadata: 'unavailable',
    exitCode: 42,
  },
];

for (const { name, event, ref, repository, metadata, exitCode = 0, allowed = false } of cases) {
  await test(`Pages eligibility for ${name}`, (t) => {
    const dir = mkdtempSync(join(tmpdir(), 'pages-eligibility-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const output = join(dir, 'output');
    writeFileSync(output, '');
    const result = spawnSync(
      'bash',
      ['--noprofile', '--norc', '-eo', 'pipefail', '-c', mockGh + gateScript],
      {
        encoding: 'utf8',
        env: {
          GITHUB_EVENT_NAME: event,
          GITHUB_REF: ref ?? 'refs/heads/main',
          GITHUB_REPOSITORY: repository ?? course,
          GITHUB_REPOSITORY_ID: '123',
          GITHUB_OUTPUT: output,
          MOCK_REPOSITORY: metadata ?? (allowed ? `${course} public` : 'unavailable'),
        },
      },
    );
    assert.ifError(result.error);
    assert.equal(result.status, exitCode, result.stderr);
    assert.equal(readFileSync(output, 'utf8'), allowed ? 'publish=true\n' : '');
  });
}
