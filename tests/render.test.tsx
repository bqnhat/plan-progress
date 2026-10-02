import { describe, expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'
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

function world(on: On) {
  mock.clock(on)
  on('ui.render', async () => <></>)
  on('ui.toast', async () => ({ value: undefined }))
  on('audio.play', async () => ({ value: undefined }))
}

async function trackSource($: Engine, stage: string): Promise<string> {
  await $.tool.call({
    tool: TOOL,
    id: 'bar',
    title: 'Bar',
    stages: [{ name: stage, steps: [{ title: 'First', status: 'active' }, { title: 'Second', status: 'pending' }] }],
  })
  const ui = await $.ui.mount({ plugin: 'plan-progress', surface: 'desktop', component: 'AbovePrompt', props: BAND_PROPS })
  const svg = await ui.find({ type: 'Svg' })
  return String(svg?.props.source ?? '')
}

describe('track text font', () => {
  test('a Vietnamese stage name is drawn in the system font', async ($, on) => {
    world(on)
    const source = await trackSource($, 'Viết lại')

    expect(source).toContain('class="kt sf">Viết lại')
    expect(source).toContain('.sf{font-family:')
  })

  test('a name without Vietnamese letters keeps Anthropic Sans', async ($, on) => {
    world(on)
    const source = await trackSource($, 'Read code')

    expect(source).toContain('class="kt">Read code')
  })
})
