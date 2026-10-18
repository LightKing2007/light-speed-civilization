// 正式导出的故障演练：node tools/faultcheck.mjs
// 用 test/fixtures/chapters 里的演练章节逐一跑 tools/render.mjs，确认：素材缺失、镜头出错、构建失败、占位章节都会让导出失败
// 并指出具体位置；修好的章节、加 --draft 的占位章节能正常导出。输出在 _render/preview_9x（不进正片）。
import { spawnSync } from 'node:child_process'; import path from 'node:path';
import { ROOT } from './build.mjs';
const env = { ...process.env, FILM_EXTRA_CHAPTERS: 'test/fixtures/chapters' };
const cases = [
  { id: '91', extra: [], fail: true, expect: [/素材加载失败：assets\/__faultcheck__\/missing\.jpg（第 91 章）/] },
  { id: '92', extra: [], fail: true, expect: [/第 92 章 · 帧 \d+/, /镜头 92\.旋转/, /故意的错误/] },
  { id: '93', extra: [], fail: true, expect: [/第 93 章构建失败：.*故意的构建错误/] },
  { id: '95', extra: [], fail: true, expect: [/占位章节尚未实现：95/] },
  { id: '95', extra: ['--draft'], fail: false, expect: [/video: .*preview_95/] },
  { id: '94', extra: [], fail: false, expect: [/video: .*preview_94/] },
];
let bad = 0;
for (const c of cases) {
  const args = [path.join(ROOT, 'tools/render.mjs'), '--only', c.id, '--fps', '5', '--scale', '.25', '--fresh', ...c.extra];
  const r = spawnSync(process.execPath, args, { cwd: ROOT, env, encoding: 'utf8', timeout: 600000 });
  const out = (r.stdout || '') + (r.stderr || ''), failed = r.status !== 0;
  const ok = failed === c.fail && c.expect.every(re => re.test(out));
  if (!ok) bad++;
  const why = out.split('\n').filter(l => /✗|·|video:/.test(l)).slice(0, 4).join(' | ');
  console.log(`${ok ? '✓' : '✗'} 第 ${c.id} 章${c.extra.length ? ' ' + c.extra.join(' ') : ''}：${failed ? '导出失败' : '导出成功'}（期望${c.fail ? '失败' : '成功'}）· ${why}`);
  if (!ok) console.log(out.split('\n').slice(-15).join('\n'));
}
console.log(bad ? `\n${bad} 项未通过` : '\n全部通过'); process.exit(bad ? 1 : 0);
