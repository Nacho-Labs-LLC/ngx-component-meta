import fs from 'fs';
import path from 'path';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { diff } from '../../src/diff.js';
import { createParser } from '../../src/parser.js';
import { formatDiffText, formatDiffJson, formatDiffMarkdown } from '../../src/diff-formatters.js';
import type { ComponentDoc, PipeDoc } from '../../src/types.js';

const COMMENT_MARKER = '<!-- ngx-component-meta-diff -->';

async function run(): Promise<void> {
  const basePath = path.resolve(core.getInput('base', { required: true }));
  const headPath = core.getInput('head');
  const projectPath = core.getInput('project');
  const format = core.getInput('format') || 'markdown';
  const failOnBreaking = core.getBooleanInput('fail-on-breaking');
  const commentOnPr = core.getBooleanInput('comment-on-pr');

  if (!fs.existsSync(basePath)) {
    core.setFailed(`Base file not found: ${basePath}`);
    return;
  }

  const baseDocs: (ComponentDoc | PipeDoc)[] = JSON.parse(fs.readFileSync(basePath, 'utf-8'));

  let headDocs: (ComponentDoc | PipeDoc)[];

  if (headPath) {
    const resolved = path.resolve(headPath);
    if (!fs.existsSync(resolved)) {
      core.setFailed(`Head file not found: ${resolved}`);
      return;
    }
    headDocs = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
  } else {
    if (!projectPath) {
      core.setFailed('Either `head` or `project` input must be provided.');
      return;
    }

    const tsconfigPath = path.resolve(projectPath);
    if (!fs.existsSync(tsconfigPath)) {
      core.setFailed(`tsconfig not found: ${tsconfigPath}`);
      return;
    }

    const parser = createParser(tsconfigPath);
    const program = parser.getProgram();
    const sourceFiles = program
      .getSourceFiles()
      .filter((sf) => !sf.isDeclarationFile && !sf.fileName.includes('node_modules'))
      .map((sf) => sf.fileName);
    headDocs = parser.parse(sourceFiles);
  }

  const result = diff(baseDocs, headDocs);

  let output: string;
  switch (format) {
    case 'json':
      output = formatDiffJson(result);
      break;
    case 'text':
      output = formatDiffText(result);
      break;
    case 'markdown':
    default:
      output = formatDiffMarkdown(result);
      break;
  }

  core.setOutput('breaking-count', String(result.summary.breaking));
  core.setOutput('non-breaking-count', String(result.summary.nonBreaking));
  core.setOutput('has-breaking', result.summary.breaking > 0 ? 'true' : 'false');
  core.setOutput('diff-output', output);

  if (commentOnPr) {
    await postPrComment(result.summary.breaking, result.summary.nonBreaking, output);
  }

  if (failOnBreaking && result.summary.breaking > 0) {
    core.setFailed(
      `${result.summary.breaking} breaking API change(s) detected.`,
    );
  }
}

async function postPrComment(
  breakingCount: number,
  nonBreakingCount: number,
  diffOutput: string,
): Promise<void> {
  const pr = github.context.payload.pull_request;
  if (!pr) {
    core.info('Not a pull request event — skipping PR comment.');
    return;
  }

  const token = core.getInput('GITHUB_TOKEN') || process.env.GITHUB_TOKEN;
  if (!token) {
    core.warning('No GITHUB_TOKEN available — skipping PR comment.');
    return;
  }

  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;
  const issueNumber = pr.number;

  const noChanges = breakingCount === 0 && nonBreakingCount === 0;

  let body: string;
  if (noChanges) {
    body = `${COMMENT_MARKER}\n### ngx-component-meta API Diff\n\nNo API changes detected.`;
  } else {
    const statusIcon = breakingCount > 0 ? '&#x26A0;' : '&#x2705;';
    const summaryLine = `${statusIcon} **${breakingCount}** breaking, **${nonBreakingCount}** non-breaking`;

    body = [
      COMMENT_MARKER,
      '### ngx-component-meta API Diff',
      '',
      '| Breaking | Non-Breaking |',
      '|----------|-------------|',
      `| ${breakingCount} | ${nonBreakingCount} |`,
      '',
      '<details>',
      `<summary>${summaryLine}</summary>`,
      '',
      diffOutput,
      '',
      '</details>',
    ].join('\n');
  }

  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
  });

  const existing = comments.find(
    (c) => c.body?.includes(COMMENT_MARKER),
  );

  if (existing) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body,
    });
    core.info(`Updated existing PR comment (id: ${existing.id}).`);
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    });
    core.info('Created new PR comment.');
  }
}

run().catch((err) => {
  core.setFailed(err instanceof Error ? err.message : String(err));
});
