// docs/progress.md 的总表必须和章节文件里的 status、dur 一致，避免进度记录与代码脱节。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const STATUS = { '占位': 'placeholder', '已实现': 'implemented', '已检查': 'reviewed', '可交付': 'deliverable' };
const order = [...fs.readFileSync(path.join(ROOT, 'src/chapters/index.js'), 'utf8').matchAll(/from '\.\/(\d\d)-[^']+'/g)].map(m => m[1]);
const chapters = Object.fromEntries(fs.readdirSync(path.join(ROOT, 'src/chapters')).filter(f => /^\d\d-.*\.js$/.test(f)).map(f => {
  const src = fs.readFileSync(path.join(ROOT, 'src/chapters', f), 'utf8');
  const head = src.match(/id: '(\d\d)'(?:, status: '(\w+)')?, slug: '[^']*', title: '([^']*)', dur: (\d+)/);
  return [f.slice(0, 2), head ? { status: head[2] || null, title: head[3], dur: +head[4] } : null];
}));
const rows = Object.fromEntries(fs.readFileSync(path.join(ROOT, 'docs/progress.md'), 'utf8').split('\n')
  .map(l => l.match(/^\| (\d\d) \| ([^|]+) \| (\d+) s \| ([^|]+) \|/)).filter(Boolean).map(m => [m[1], { title: m[2].trim(), dur: +m[3], status: STATUS[m[4].trim()] }]));

test('每一章都写明了 status', () => {
  for (const id of order) { assert.ok(chapters[id], id); assert.ok(Object.values(STATUS).includes(chapters[id].status), `第 ${id} 章 status = ${chapters[id].status}`); }
});
test('进度表与章节文件一致（状态、标题、时长）', () => {
  assert.deepEqual(Object.keys(rows).sort(), [...order].sort(), '进度表应当正好列出正片的每一章');
  for (const id of order) {
    assert.equal(rows[id].status, chapters[id].status, `第 ${id} 章状态：进度表 ${rows[id].status} / 代码 ${chapters[id].status}`);
    assert.equal(rows[id].title, chapters[id].title, `第 ${id} 章标题`);
    assert.equal(rows[id].dur, chapters[id].dur, `第 ${id} 章时长`);
  }
});
