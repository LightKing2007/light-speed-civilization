export const meta = {
  name: 'build-chapters',
  description: 'Implement every chapter of the 光速文明 film in parallel: build → independent visual review → fix → verify (→ fix again if needed); finale last',
  phases: [
    { title: 'Build', detail: 'one implementer per chapter, owns only its chapter file + src/props/NN/' },
    { title: 'Review', detail: 'fresh-eyes critic renders frames and lists concrete issues' },
    { title: 'Fix', detail: 'implementer fixes every blocker/major issue' },
    { title: 'Verify', detail: 'second critic scores; one more fix round if score < 8' },
    { title: 'Finale', detail: 'chapter 15 montage built after all others exist' },
  ],
}

const ROOT = '/Users/lightking/Downloads/光速文明'
const USER_ASK = `用户（LightKing）对旧版的原话：「通读这个项目，修改一些问题，开头有些意义不明，转场特别生硬。视频的节奏太慢了，可以节奏快一点，但是要讲清楚并且内容更丰富一些，多讲讲原理，视频可以加长，少了点机能风格，不过在合适的时候也不一定要一种风格，根据主题决定，当然用辉光也要保持一定度，要用高质量辉光，通常的辉光效果给人廉价就是因为没把握好扩散范围。篇幅是不是有点不太够，根据内容可以长一些。而且有真实的素材或者资源请用真实的，然后建模希望更精致一些，可以使用3D模型。视频的风格太同质化，希望换成写实的风格。」`

const CONTEXT = c => `You are working on the Chinese popular-science film「光速文明」(Light-speed Civilization), rebuilt from scratch as a photorealistic, real-time three.js film (project root ${ROOT}).
${USER_ASK}

Read these first, carefully and completely:
- ${ROOT}/docs/chapter-guide.md  — engine API, rules, safe areas, chapter-to-chapter transition table, self-check workflow (MANDATORY)
- ${ROOT}/docs/script.md — the fact-checked script; your chapter is section「${c.id}」
- ${ROOT}/docs/director-notes.md — section「${c.id}」: the must-have shots and real assets
- the engine sources you will call: ${ROOT}/src/engine/kit.js, earth.js, hud.js, util.js, post.js (read, never edit)
- your current placeholder: ${ROOT}/src/chapters/${c.file}
- asset manifests: ${ROOT}/assets/*/manifest.json, ${ROOT}/assets/photos/*/manifest.json, ${ROOT}/assets/models/*/manifest.json (and assets/index.json for the full file list). LOOK at candidate photos/textures with the Read tool before using them.

Note: a separate asset-gathering job may still be adding archival photos/models when you start (assets/photos/act1|act2|act3, assets/models/other). Re-read the relevant manifest.json files again before your final iteration and use the best real photos available then.
Ownership: you may only create/modify ${ROOT}/src/chapters/${c.file} and files under ${ROOT}/src/props/${c.id}/. Never edit src/engine, other chapters, docs, assets, or tools. Other agents are working on other chapters at the same time — do not touch their files. Use only the project-local toolchain (node tools/*.mjs); no global installs, no downloads.
Determinism: every visual must be a pure function of chapter time t. Keep the console free of errors.`

const REPORT = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'what each shot shows (with times)' },
    real_assets: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' } },
    engine_requests: { type: 'array', items: { type: 'string' } },
    sheet: { type: 'string', description: 'path to the latest contact sheet' },
  },
  required: ['summary', 'real_assets', 'weaknesses', 'engine_requests', 'sheet'],
}
const REVIEW = {
  type: 'object',
  properties: {
    score: { type: 'number', description: '1-10 against a high-end documentary bar (Branch Education / Apple product film / BBC). 8 = ready to ship' },
    verdict: { type: 'string' },
    issues: {
      type: 'array', items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          time: { type: 'string', description: 'chapter-local seconds or range' },
          problem: { type: 'string' },
          fix: { type: 'string', description: 'concrete, actionable instruction' },
        },
        required: ['severity', 'time', 'problem', 'fix'],
      },
    },
  },
  required: ['score', 'verdict', 'issues'],
}

const BUILD = c => `${CONTEXT(c)}

YOUR TASK: implement chapter ${c.id}「${c.title}」completely, replacing the placeholder build() with the real film chapter.
Bar: this must look like a high-end photoreal documentary (think Branch Education cut-aways, Apple product films, BBC archival documentaries) — NOT the old neon-dots-on-black look. Realistic PBR models with real detail and proportions, believable lighting with shadows/contact shadows, real archival photos where the director notes say so (with lower-thirds/credits), restrained high-quality glow, 机能风 technical annotations only where they explain a principle. Every second must have purposeful motion; captions and visuals in sync; the principle must be genuinely explained by the animation.
If the chapter file (or src/props/${c.id}/) already contains a partial implementation from an earlier interrupted attempt, continue from it instead of starting over.
Work method: block out all shots quickly first (correct timings, cameras, transitions, captions), render a contact sheet, then spend most of your effort on the hero models/materials/lighting and the principle animations. Iterate render → look → improve at least 3 times (more if needed). Check the frames at shot boundaries and the first/last second (transition with neighbours; you can load neighbours with --only ${c.prev ? c.prev + ',' : ''}${c.id}${c.next ? ',' + c.next : ''} once their files exist — they may still be placeholders). Keep per-frame cost reasonable.
${c.extra || ''}
Finish with the structured report.`

const REVIEWER = (c, extra = '') => `${CONTEXT(c)}

YOUR TASK: you are a demanding, independent film director / VFX supervisor reviewing chapter ${c.id}「${c.title}」. Do NOT edit any project files. Render it yourself:
  node tools/spot.mjs --only ${c.id} --every 1 --sheet --out ${ROOT}/_shots/${c.id}_review
plus extra --times around every shot boundary, the first and last 1.5 s, and any moment that looks suspicious (use --debug to see shot names). Look at the sheet AND at several full-resolution frames with the Read tool.
Judge against: the user's requirements above; docs/script.md (every caption present, correct, in sync with what is on screen; principle actually explained visually); docs/director-notes.md must-haves; docs/chapter-guide.md rules (safe areas: nothing important under captions or behind the chapter card/stat/lower-third; transitions as specified; restrained glow; no neon look); realism (materials, scale, lighting, shadows, detail of hero models, no obvious CG-cheapness); composition and camera motion (purposeful, not floaty); HUD/annotation readability and clutter; technical artifacts (aliasing, z-fighting, black frames, popping, overexposure, console errors printed by spot).
${extra}
Be specific and actionable (time, what is wrong, exactly how to fix). Severity: blocker = broken/wrong/ugly enough to embarrass the film; major = clearly below the bar; minor = polish. Score honestly; 8+ only if you would ship it in a high-end documentary.`

const FIX = (c, rev, round) => `${CONTEXT(c)}

YOUR TASK (fix round ${round}): chapter ${c.id}「${c.title}」has been implemented by a previous agent and then reviewed by an independent critic (score ${rev.score}/10). Read the current ${ROOT}/src/chapters/${c.file} (and src/props/${c.id}/ if present) and render it first to understand it. Then fix EVERY blocker and major issue below, and as many minor ones as is sensible, re-rendering to verify each fix (node tools/spot.mjs --only ${c.id} ...). Do not regress what already works. If you disagree with an item, explain why in weaknesses.
Critic verdict: ${rev.verdict}
Issues:
${rev.issues.map((x, i) => `${i + 1}. [${x.severity}] t=${x.time}: ${x.problem}\n   → ${x.fix}`).join('\n')}
Finish with the structured report (summary should describe the final state of every shot).`

const CHAPTERS = (args && args.chapters) || []
const ORDER = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15']
const withNbr = c => { const i = ORDER.indexOf(c.id); return { ...c, prev: i > 0 ? ORDER[i - 1] : null, next: i < ORDER.length - 1 ? ORDER[i + 1] : null } }

async function chapterChain(c0) {
  const c = withNbr(c0)
  const built = await agent(BUILD(c), { label: `build:${c.id}`, phase: 'Build', schema: REPORT })
  const rev1 = await agent(REVIEWER(c), { label: `review:${c.id}`, phase: 'Review', schema: REVIEW })
  if (!rev1) return { id: c.id, built, note: 'review failed' }
  const fix1 = await agent(FIX(c, rev1, 1), { label: `fix:${c.id}`, phase: 'Fix', schema: REPORT })
  const rev2 = await agent(REVIEWER(c, 'This is the second review after a fix round. Previous critic issues (check they are really fixed):\n' + rev1.issues.map(x => `- [${x.severity}] ${x.time}: ${x.problem}`).join('\n')), { label: `verify:${c.id}`, phase: 'Verify', schema: REVIEW })
  let fix2 = null
  if (rev2 && (rev2.score < 8 || rev2.issues.some(x => x.severity === 'blocker'))) {
    fix2 = await agent(FIX(c, rev2, 2), { label: `fix2:${c.id}`, phase: 'Verify', schema: REPORT })
  }
  return { id: c.id, score1: rev1.score, score2: rev2 && rev2.score, final: (fix2 || fix1 || built), remaining: rev2 ? rev2.issues.filter(x => x.severity !== 'minor').map(x => x.time + ': ' + x.problem) : [] }
}

phase('Build')
const main = CHAPTERS.filter(c => c.id !== '15')
const results = await pipeline(main, c => chapterChain(c))
log(`main chapters done: ${results.filter(Boolean).map(r => r.id + ' ' + r.score1 + '→' + r.score2).join(', ')}`)

let finale = null
const f = CHAPTERS.find(c => c.id === '15')
if (f) { phase('Finale'); finale = await chapterChain({ ...f, extra: 'All other chapters are now implemented. Use ctx.clip to reference their most representative moments (inspect them with node tools/spot.mjs --only <id> --every 1 --sheet first). Build the montage with node tools/spot.mjs --only 00,01,02,03,04,05,06,07,08,09,10,11,12,13,14,15 when checking (global times!).' }) }

return { results, finale }
