export const meta = {
  name: 'build-chapters-lean',
  description: 'Implement the 光速文明 film chapters, max 3 at a time, each with a self-check loop (token-lean)',
  phases: [{ title: 'Build', detail: 'one implementer per chapter, 3 concurrent' }],
}
const ROOT = '/Users/lightking/Downloads/光速文明'
const USER_ASK = `用户对旧版的要求：开头意义不明、转场生硬要改；节奏要快但讲清楚、内容更丰富、多讲原理，可以加长；适当的地方用机能风格，但按主题换风格；辉光要克制、高质量（控制扩散范围）；有真实素材就用真实的；建模更精致，可用 3D 模型；整体从同质化的霓虹风格换成写实风格。`
const SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'final state of every shot, with times' },
    real_assets: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' } },
    engine_requests: { type: 'array', items: { type: 'string' } },
    sheet: { type: 'string' },
  },
  required: ['summary', 'real_assets', 'weaknesses', 'engine_requests', 'sheet'],
}
const PROMPT = c => `You are implementing ONE chapter of the Chinese popular-science film「光速文明」— a photorealistic, real-time three.js documentary (project root ${ROOT}). ${USER_ASK}

Your chapter: ${c.id}「${c.title}」, file ${ROOT}/src/chapters/${c.file} (currently a placeholder unless an earlier interrupted attempt left partial work — if so, continue from it).

Read first (and only these, to save effort): ${ROOT}/docs/chapter-guide.md (engine API, rules, safe areas, transition table, self-check commands); section「${c.id}」of ${ROOT}/docs/script.md; section「${c.id}」of ${ROOT}/docs/director-notes.md; your placeholder file. Consult engine sources (${ROOT}/src/engine/kit.js, earth.js, hud.js, util.js) only to check a specific signature (use grep / partial reads). Pick real assets from ${ROOT}/assets/photos/act*/manifest.json, ${ROOT}/assets/index.json (hdri/tex/models file names). Look at a candidate photo before using it.

Ownership: only modify src/chapters/${c.file} and files under src/props/${c.id}/. Never edit engine, docs, tools, assets or other chapters (other agents are working in parallel). No downloads, no global installs.

Bar: high-end photoreal documentary (Branch Education cut-aways / Apple product film / BBC archival doc), not neon dots on black. Detailed hero models with real proportions and materials (bevels, screws, labels, wear), believable lighting with shadows, real archival photos with lower-thirds where the notes say so, restrained glow (only genuinely bright things), 机能风 annotations only where they explain a principle, purposeful camera moves, every caption in the script present and in sync with what is on screen, the principle actually explained by animation. Respect the safe areas and the first-shot transition from the guide's table. Everything must be a pure function of t; zero console errors.

Efficiency rules (important — compute budget is limited): plan all shots, then write the chapter in large coherent edits (not dozens of tiny ones). Verify with contact sheets: node tools/spot.mjs --only ${c.id} --every 1 --sheet (one image shows all frames) and only open a few individual full-res frames when needed (≤ 15 image reads in total). Do 2–3 render→look→improve rounds, focusing effort on the hero shots. Stop when it meets the bar.

Finish with the structured report.`

const CH = (args && args.chapters) || []
const N = (args && args.concurrency) || 3
const out = []
let next = 0
async function worker() {
  while (next < CH.length) {
    const c = CH[next++]
    const r = await agent(PROMPT(c), { label: `build:${c.id}`, phase: 'Build', schema: SCHEMA })
    out.push({ id: c.id, ok: !!r, ...(r || {}) })
    log(`chapter ${c.id} ${r ? 'done' : 'FAILED'}`)
  }
}
await Promise.all(Array.from({ length: N }, () => worker()))
return out
