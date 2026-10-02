import { describe, expect, mock, test } from 'claude-code/testing'
import type { On, PromptOrigin } from 'claude-code'
import type { Engine } from 'claude-code/testing'

const TOOL = 'mcp__plan-progress__plan_progress'

const BAND_PROPS = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 12,
  bodyColumns: 100,
  scroll: { offset: 0, bodyRows: 12 },
  view: {},
}

type World = { prompts: { text: string; origin: PromptOrigin }[] }

function world(on: On): World {
  const w: World = { prompts: [] }
  mock.clock(on)
  on('turn.start', async (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', async (_$, e) => ({ text: e.answer }))
  on('prompt.submit', async (_$, e) => {
    w.prompts.push({ text: e.text, origin: e.origin })
    return { text: e.text, context: e.context }
  })
  on('tool.call', async () => ({ result: undefined as never }))
  on('audio.play', async () => ({ value: undefined }))
  on('ui.toast', async () => ({ value: undefined }))
  on('ui.render', async () => <></>)
  return w
}

const sentBack = (w: World) => w.prompts.filter(p => p.origin.kind === 'plugin' && p.text.includes('still open'))

async function workTurn($: Engine, turnId: string, answer: string, opts: { agentId?: string; reason?: 'answer' | 'aborted' } = {}) {
  await $.turn.start({ text: 'do it', turnId })
  await $.tool.call({
    tool: TOOL,
    id: 'task',
    title: 'Task',
    stages: [{ name: 'Build', steps: [{ title: 'One', status: 'active' }, { title: 'Two', status: 'pending' }] }],
  })
  await $.tool.call({ tool: 'Edit', file_path: 'a.ts', old_string: 'a', new_string: 'b' })
  await $.turn.complete({
    reason: opts.reason ?? 'answer',
    answer,
    durationMs: 1,
    isAborted: opts.reason === 'aborted',
    turnId,
    ...(opts.agentId ? { agentId: opts.agentId } : {}),
  })
}

describe('sending an unexplained open bar back', () => {
  test('a turn that did work and left the bar open is sent back once by a plugin prompt', async ($, on) => {
    const w = world(on)
    await workTurn($, 'turn-1', 'Edited the file.')

    expect(sentBack(w)).toHaveLength(1)
    expect(sentBack(w)[0]?.origin).toEqual({ kind: 'plugin', name: 'plan-progress' })
    expect(sentBack(w)[0]?.text).toContain('task still open')
  })

  test('the plugin prompt does not re-arm it; the person’s next prompt does', async ($, on) => {
    const w = world(on)
    await workTurn($, 'turn-1', 'Edited the file.')
    await workTurn($, 'turn-2', 'Edited again.')
    expect(sentBack(w)).toHaveLength(1)

    await $.prompt.submit({ text: 'continue', wait: false, origin: { kind: 'composer' } })
    await workTurn($, 'turn-3', 'Edited once more.')
    expect(sentBack(w)).toHaveLength(2)
  })

  test('an answer ending in a question marks the bar as waiting instead', async ($, on) => {
    const w = world(on)
    await workTurn($, 'turn-1', 'Which file should I change next?')

    expect(sentBack(w)).toHaveLength(0)
    const ui = await $.ui.mount({ plugin: 'plan-progress', surface: 'desktop', component: 'AbovePrompt', props: BAND_PROPS })
    expect(await ui.find({ type: 'Text', text: '?' })).toBeDefined()
  })

  test('a subagent turn or an interrupted turn is never sent back', async ($, on) => {
    const w = world(on)
    await workTurn($, 'turn-1', 'Edited the file.', { agentId: 'agent-1' })
    await workTurn($, 'turn-2', 'Edited the file.', { reason: 'aborted' })

    expect(sentBack(w)).toHaveLength(0)
  })

  test('no classic.Stop hook is left to block the stop', async ($, on) => {
    world(on)
    on('classic.Stop', async () => ({}))
    const result = await $.classic.Stop({ stop_hook_active: false, last_assistant_message: 'done' } as never)

    expect(result.block).toBeUndefined()
  })
})
