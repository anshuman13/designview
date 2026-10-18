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
   allow remote debugging. Give DesignView.app Full Disk Access once. The relay reads Chrome's DevToolsActivePort
   file, which macOS protects. The web page and your phone never need this permission.

## Phone

Open `http://<mac>:5174` on your phone over the LAN, Tailscale or Netbird, then add it to the home screen to get the
app icon. The Mac must be awake and DesignView.app running.

Everything except the Figma tab works: chats, the timeline, Sketch, Review, Comments, Rules, the Design system panel
and recipes. The Figma tab shows the Mac's Chrome, so use it on the Mac.

## Workflows

Recipes live in the command palette as "Recipe: ...". A recipe puts a written prompt in the composer and does not send it, so you can
edit it first. If a frame is focused in Files, the prompt names it. "Recipe: Save composer text as recipe" saves your
own prompt (`{frames}` stands for the focused frame) and "Recipe: Edit ..." changes it.

| Group | Recipe | What it does |
| --- | --- | --- |
| Make | Design from a brief | Plan, sketch, design and review screens from a few lines of text |
| Make | Sketch directions | Explore two or three low-fidelity directions first |
| Make | Screenshot to design | Rebuild a pasted screenshot with your components and variables |
| Make | Flow map | Draw a FigJam diagram of your screens and how they connect |
| Improve | Missing states | Add empty, loading, error, long content and no permission variants |
| Improve | Responsive variants | Create 390, 834 and 1440 wide versions with auto layout |
| Improve | Copy pass | Suggest clearer, shorter, consistent UI text (one Sonnet call) |
| Improve | Design crit | Feedback from four points of view, no edits (one Sonnet call) |
| Improve | Audit | Check the file against the design system, no model calls |
| Improve | Localization stress test | Copy frames with 40% longer text and flag what breaks |
| Improve | Dark mode pass | Make dark versions using the library variable modes |
| Ship | Handoff notes | Developer notes with spacing, tokens, props and interactions |
| Ship | Address comments | Fix open Figma comments that ask for changes and reply on each |
| Ship | Accessibility notes | Annotate focus order, headings, labels and alt text |
| Ship | Frame to code | React and CSS for a frame using your tokens, saved to the chat folder |

## Commands

Type these in the composer.

| Command | What it does |
| --- | --- |
| `/design <brief>` | The full run: plan, sketch, design, review |
| `/sketch <brief>` | Plan and sketch only |
| `/review [preset] [frame links]` | Review frames without changing them |
| `/audit` | Design system check across the whole file, no model calls |
| `/system` | Rebuild the design system profile |
| `/crit [frame links]` | Four-viewpoint critique of the frames, one Sonnet call, no edits |
| `/copy [tone:friendly] [frame links]` | Suggest text changes; tones are friendly, neutral and formal |
| `/buildcheck` | Compare a live URL screenshot with a Figma frame (Review tab, Build view) |
| `/prototype` | Clickable HTML prototype in the Preview tab |
| `/flow` | User flow in FigJam |
| `/handoff` | Asset exports, specs and a ticket draft |

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
| Full | Check plus six parallel area reviewers (color, typography, spacing, components, accessibility, brief) | 2 |

Claude fixes blocking and major findings. Full re-reviews only the areas that failed. Every run ends with the free
check. The Review tab shows tokens per reviewer, and can post findings as Figma comments on the nodes.

## Panels

The left bar has these panels. Cmd+. (focus mode) hides both side panels.

- **Files.** Your Figma files and the frames in each. Focus a frame to make recipes and commands target it. Brief
  templates in the new chat dialog (feature screen, landing page, onboarding, settings, dashboard, empty and error
  states) fill the composer.
- **Chats.** Chats grouped by Figma file, plus the sample chat.
- **Comments.** The file's Figma comment threads, open first. Each has Show in Figma, Reply and Ask Claude. "Ask
  Claude to address all open comments" does the whole list. Figma's API cannot resolve comments, so Claude replies.
- **Design system.** The profile of colors, text styles, spacing, radius, components and rules. "Export tokens" gives
  CSS variables, a Tailwind theme or W3C design tokens JSON, with Copy and Download.
- **Rules.** House rules for "This file" and "All files", such as "no drop shadows on cards". Claude gets them in
  every chat, and the reviewers and crit check against them. "Suggest rules from my design system" proposes some.

## Review tab

| View | What it shows |
| --- | --- |
| Review | Findings per area and from the design system check, tokens per reviewer, post as Figma comments |
| Crit | Four viewpoints (new user, power user, accessibility, product), each with a verdict and linked notes |
| Copy | Suggested text changes with a reason each; edit or untick, then "Apply selected in Figma" fills the composer |
| Changes | Figma versions with Claude's checkpoints marked; compare one with now by slider or side by side |
| Build | Build check: a live URL screenshot next to its Figma frame |

"Export report" saves one self-contained HTML file with the brief, sketches, frames, review, crit and copy changes. It
makes no external requests and prints cleanly. Node ids show as Figma-blue chips, and the timeline shows thumbnails
of nodes Claude reports on.

## Cost

Opus 5.5 plans. Sonnet 5.5 does everything else. Crit, copy and build check are single Sonnet calls.

The spend meter in the top bar shows what the chat has cost, split by phase and model, with today's total across
chats. Set a daily budget in Settings; the meter turns amber at 80% and red past 100%. Per-chat spend resets when the
server restarts. The daily total is kept in `~/.designview/spend.json`.

These use no tokens: the Check preset and `/audit`, the sample tour, token export, version compare and the report
export.

## Sample tour

The pinned "Sample: grocery cart tour" row in Chats opens a read-only chat, "Grocery app (sample)", with a finished brief,
sketches, a full review, a crit, a copy pass and a design system profile. It never calls Claude or Figma. Sending a
message, steering or running a command there only shows a note.

## Security

The server checks the Origin of every POST and WebSocket and the Host of every request. It allows localhost
(`127.0.0.1`, `[::1]`), `.local` names, `.ts.net` (Tailscale), `.netbird.cloud`, and private addresses: 10.x,
172.16-31.x, 192.168.x and the Tailscale range 100.64-127.x. Other websites cannot write settings or rules through
your browser. Uploads are checked by their bytes, request bodies are capped at 1 MB and rules at 20 KB. The report
embeds sketches as images and sends a strict CSP.

## Keyboard

Press `?` for the sheet. Chrome may keep Cmd+digit; use Ctrl then.

| Keys | Action |
| --- | --- |
| Cmd+Shift+P or F1 | Command palette |
| Cmd+O | New chat from a Figma file |
| Cmd+B | Toggle sidebar |
| Cmd+. | Toggle focus mode |
| Cmd+J | Toggle terminal (dev tools) |
| Cmd+1 to Cmd+5 | Figma, Sketch, Review, Preview, Settings |
| `/` | Focus the composer |
| `?` | Show the shortcut sheet |
| Enter, Shift+Enter | Send, new line |
| Up | Previous message |
| Tab | Accept suggestion |
| `y`, `a`, `n` | Permission card: allow, always allow, deny |

## Where things live

Each Figma file gets a folder under `~/DesignView` with the plan, sketches, the design system profile, review
results and prototypes. Settings are in `~/.designview/settings.json`.

See [PLAN.md](PLAN.md) for the design decisions and what is still open.
