# DesignView

A web UI for designers working with Claude and Figma, built on the Claude Agent SDK. A fork of
[AgentView](https://github.com/anshuman13/agentview) with the code tools taken out and a design workflow put in.

You start a chat from a Figma file and describe the screens you need. Claude plans, sketches, designs in Figma and
reviews its work against your design system. You watch the timeline, the sketches and the Figma file, and step in
when you want to.

## Run

```bash
npm install
./start.sh
```

`start.sh` builds and opens `dist/DesignView.app`, a menu bar app that runs the server on :7778, the web app on :5174
and a Chrome relay on :7780. It uses the Claude Code CLI you have installed and its login.

| Command | |
| --- | --- |
| `npm run serve` | Server and web app without the menu bar app |
| `npm test` | Unit tests |
| `npm run typecheck` | Type checks for server and web |

## Setup

1. **Figma token.** In Settings, add a Figma personal access token with read access to files and write access to
   comments. DesignView uses it for the file list, frames, thumbnails, the design system check and comments.
2. **Claude's Figma tools.** Settings has "Add Figma to Claude", which adds the remote Figma MCP server
   (`https://mcp.figma.com/mcp`) to your Claude config. Sign in once: run `claude`, type `/mcp`, pick figma and
   authenticate. When Figma is in your config, design chats load only that MCP server.
3. **Chrome.** The Figma tab shows your own Chrome, where you are logged in to Figma. Click Connect Chrome there and
   allow remote debugging. The relay in DesignView.app needs Full Disk Access once.

## The design run

With "Next message starts a design run" on, a message runs four phases. The stepper above the timeline shows where
it is.

1. **Plan.** Opus 5.5 writes a brief in plan mode: screens, states, components, assumptions.
2. **Sketch.** Sonnet 5.5 sketches two or three low-fidelity directions per screen on the Sketch tab, an Excalidraw
   canvas. You can draw and write notes on it; Claude reads your notes before it designs. "Stop after sketch" waits
   for you to pick a direction per screen.
3. **Design.** Sonnet builds the screens in Figma on a page named DesignView, using the library components,
   variables and text styles from the design system profile. Before its first change in each turn it saves a Figma
   version; a hook blocks changes until it has.
4. **Review.** A design system check runs first and uses no model calls. It flags unbound colors, unstyled text,
   local or hand-built components, low contrast, small targets and spacing off the scale. Then the review preset
   decides what else runs.

| Preset | What runs | Fix rounds |
| --- | --- | --- |
| Check | The design system check only | 1 |
| Quick (default) | Check plus one Sonnet reviewer for all areas | 1 |
| Focused | Check plus one reviewer per area you tick | 1 |
| Full | Check plus six area reviewers in parallel: color, typography, spacing and layout, components, accessibility, brief | 2 |

Claude fixes blocking and major findings. Full re-reviews only the areas that failed. Every run ends with the free
check. The Review tab shows tokens per reviewer, and can post findings as Figma comments on the nodes.

## Commands

| Command | |
| --- | --- |
| `/design <brief>` | The full run |
| `/sketch <brief>` | Plan and sketch only |
| `/review [preset] [frame links]` | Review frames without changing them |
| `/audit` | Design system check across the whole file |
| `/system` | Rebuild the design system profile |
| `/prototype` | Clickable HTML prototype in the Preview tab |
| `/flow` | User flow in FigJam |
| `/handoff` | Asset exports, specs and a ticket draft |

## Where things live

Each Figma file gets a folder under `~/DesignView` with the plan, sketches, the design system profile, review
results and prototypes. Settings are in `~/.designview/settings.json`.

See [PLAN.md](PLAN.md) for the design decisions and what is still open.
