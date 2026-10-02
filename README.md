# plan-progress

Live plan progress bars above the Claude Code prompt: stages, steps, a pixel fill and soft sounds for decision, error and done. The model creates a bar with `mcp__plan-progress__plan_progress` and moves it along as it works. Subagents show as state strips under the bar they were started from.

A fork of [`plan-progress`](https://github.com/zycck/claude-mods/tree/ea2c96b7372b01d2d3d061597f319d531942a27c/plugins/plan-progress) 0.3.0 from zycck/claude-mods (commit `ea2c96b7372b01d2d3d061597f319d531942a27c`, MIT, by Kirill Serditov). The first commit of this repository is that upstream copy unchanged; the commits after it hold every change. The plugin keeps its name, so the tool is still `mcp__plan-progress__plan_progress`: never enable this fork and the original together.

## Why a fork

In some sessions the built-in `cc-plugin-sec-default` plugin seats itself outermost: Team and Enterprise organizations, and machines with managed settings. It answers `classic.*`, `prompt.section`, `prompt.context`, `prompt.compose` and a few other events with `next.to(e, "append")`, so every user-tier plugin hook on those events is skipped. The debug log says `… bypassed by cc-plugin-sec-default (tier user); beneath runs`. The original sends its working rules through `prompt.compose` and its end-of-turn reminder through `classic.Stop`, so there neither reaches the model.

## Changes

- **Rules:** they ride the session's first prompt as `prompt.submit` context, whatever its origin. They are sent again after a compaction of the main conversation (not a precompute, a skipped one or a subagent's) and after `/clear`. In the transcript they appear as a `hook_additional_context` attachment.
- **End-of-turn reminder:** it moved from `classic.Stop` to `turn.complete`. A turn that did work and left a bar running is sent back once with `$.prompt.submit`: a visible plugin message that starts a new turn, at most once per prompt of yours. An answer that ends in a question marks the bar as waiting instead. Subagent and interrupted turns are never sent back.
- **Vietnamese text:** names and labels containing Vietnamese letters are drawn in the system font. Desktop's Anthropic Sans lacks most precomposed Vietnamese letters, so "Viết" rendered as "Viế t".
- **Rewind and resume:** both start a new process, whose plugin state is empty, so the bars vanished. Once per process the bars are rebuilt from the transcript's `plan_progress` calls (`$.session.messages()`), as they stood at the rewind point. Refused calls are skipped, a prompt you typed sets a waiting bar running again, and a `/progress-clear` in the transcript is honoured.
- **Closing a bar:** the ✕ on a bar hides it instead of deleting it, and it stays hidden while Claude moves it on. The Progress button in the footer and `/progress` show every hidden bar again. Upstream deleted the bar, so the Progress button found nothing to show and only toasted "plan-progress is on".
- **Compact band:** the band draws one row, the bar Claude touched last, an open bar before a finished one. `+N` after its title opens every bar with its agent strips, `▾` opens the strips of a lone bar, and `▴` folds them again; folded, the knob still counts the agents. A finished bar hides when the next turn starts, and the Progress button and `/progress` show it again. Upstream draws every bar, finished ones included, each with its strips.

## Requirements

Function hooks are early access. The hooks module loads only while the engine's `tengu_plugin_hooks_modules` rollout is on for the account, or on Claude Code up to 2.1.284 with `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1` in the session's environment (2.1.287 no longer reads it). In the Desktop Code tab the bars appear only when the Claude Code that Desktop bundles is 2.1.286 or later.

## Install

```
claude plugin marketplace add bqnhat/plan-progress
claude plugin install plan-progress@plan-progress
```

If the original is installed, disable it first:

```
claude plugin disable plan-progress@zycck-mods
```

For one terminal session only, without installing: `claude --plugin-dir <clone of this repository>`.

## Commands

| Command | What it does |
| --- | --- |
| `/progress` | Show or hide the bars; bars hidden with ✕ are shown again |
| `/progress-demo` | Show a sample plan |
| `/progress-clear` | Remove all bars |
| `/progress-sounds` | Play the decision, error and done sounds |

## Tests

```
claude plugin test .
```

48 tests in `tests/`: the rules delivery, the send-back, the Vietnamese font switch, the rebuild after a rewind, closing a bar and the compact band.

## License

MIT, Copyright (c) 2026 Kirill Serditov (`LICENSE`, copied unchanged). The changes are in the commits after the first.
