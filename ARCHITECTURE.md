# How the Auto-URSSAF / Pajemploi Agent Works

This project has **two main parts** that work together, like a restaurant with a dining room (the website) and a kitchen (the agent).

---

## Part 1: The Website (the "frontend")

This is a **Next.js** web app (think: a website that runs in your browser). Its job is to let the user pick which days their nanny worked, calculate how much to pay, and then send that data to the agent.

### `package.json` (root)
The **shopping list** for the website. It lists all the libraries the project needs (React, Next.js, date-fns for date math, etc.) and defines scripts like `npm run dev` to start the website.

### `src/app/layout.tsx` — The frame
Every page on the website is wrapped in this file. It sets the HTML language to French (`lang="fr"`), loads fonts, and wraps everything in `<Providers>` (which sets up Google authentication).

### `src/app/page.tsx` — The front door
The home page. Super simple: it just renders `<DeclarationApp />`. Think of it as saying "when someone visits the site, show them the declaration app."

### `src/lib/constants.ts` — The configuration
Stores **hardcoded values**: the two children's names (Axelle and Brune), their monthly salaries, their hourly rates for extra hours, and the daily rates for meals and maintenance. This is like a settings file.

### `src/lib/types.ts` — The dictionary
Defines the **shapes of data** used everywhere. For example, `DeclarationResult` says "a result must have a `childName` (text), a `monthlySalary` (number), etc." TypeScript uses these to catch mistakes — if you forget a field, it tells you before the code even runs.

### `src/lib/calculations.ts` — The calculator
The **math brain**. Takes a child's config + which month + which days the nanny was off, and computes everything: the total salary, extra hours, meal and maintenance allowances. One function, `computeDeclaration`, does all the work.

### `src/lib/calendar-utils.ts` — The calendar math
Helper functions for building the calendar grid (which days belong to which week, which are business days, etc.) and counting worked days / worked weeks.

### `src/hooks/useCalendarState.ts` — The memory
A **React hook** — think of it as the app's "brain state." It remembers:
- Which month is currently displayed
- Which days are marked as "off"
- Google Calendar events (if synced)

It also **saves days off to localStorage** so they survive page refreshes. Every time you change something, it automatically recalculates the results for both children using `computeDeclaration`.

### `src/components/DeclarationApp.tsx` — The main screen
The **conductor**. It pulls together all the state from `useCalendarState` and renders three things:
1. A header with the Google Sync button
2. The Calendar
3. The Results Dashboard

### `src/components/Calendar.tsx` — The calendar grid
Displays the month as a grid of days. Each day can be clicked to toggle "worked / not worked."

### `src/components/CalendarDay.tsx` + `CalendarHeader.tsx` — Calendar pieces
Individual day cells and the month navigation header (previous/next arrows). Small building blocks of the calendar.

### `src/components/ResultsDashboard.tsx` — The results area
Shows one `ResultsPanel` per child (Axelle and Brune), plus the "Fill Pajemploi" button at the bottom.

### `src/components/ResultsPanel.tsx` — One child's results card
A card showing the calculated values for one child: monthly salary, extra hours, total salary, maintenance, meals. Each value has a copy button so you can paste it elsewhere.

### `src/components/CopyButton.tsx` — The copy icon
A tiny clipboard button. Click it, the value gets copied to your clipboard.

### `src/components/GoogleSyncButton.tsx` — Google Calendar sync
Lets the user connect their Google account and pull calendar events. This is used to auto-detect days off (vacations, etc.) rather than clicking each day manually.

### `src/components/FillPajemploiButton.tsx` — The bridge to the agent
This is **the connection between the website and the agent**. When you click "Fill Pajemploi":
1. It opens a **WebSocket** connection to `localhost:3001` (the agent)
2. It sends the calculated declaration data via an HTTP POST to `/fill`
3. It listens for real-time status messages ("Logging in...", "Filling field X...") and displays them in a dark terminal-like box

Think of it as a walkie-talkie between the website and the agent.

---

## Part 2: The Agent (the "backend robot")

This is a separate Node.js server that lives in the `agent/` folder. Its job is to **open a real browser, navigate to the Pajemploi government website, and fill in the form automatically** using an AI (Claude) to decide what to click and type.

### `agent/package.json` — The agent's shopping list
Lists the agent's dependencies:
- **Playwright**: a library that controls a real browser programmatically (like a robot clicking buttons)
- **@anthropic-ai/sdk**: the Claude AI SDK, to ask Claude what to do next
- **Express + ws**: a web server with WebSocket support, so the frontend can talk to it

### `agent/src/index.ts` — The starter
The entry point. It loads the `.env` file (which contains the Anthropic API key), prints a banner, and calls `startServer()`. That's it — just the ignition key.

### `agent/src/server.ts` — The dispatcher
Sets up the **Express web server** on port 3001 with two roles:
1. **HTTP endpoint** (`POST /fill`): receives the declaration data from the frontend, validates it, and kicks off the form-filling process
2. **WebSocket server**: maintains a live connection to the frontend so it can send real-time status updates ("Clicking login button...", "Filling salary field...")

The `broadcastStatus` function sends messages to all connected WebSocket clients — that's how the frontend's terminal box gets its updates.

### `agent/src/credentials.ts` — The safe
Fetches the Pajemploi login credentials from **1Password** using the `op` command-line tool. This way, passwords are never hardcoded in the source code. If 1Password isn't set up, it gives you a helpful error message.

### `agent/src/pajemploi.ts` — The brain (the most important file)

This is where the magic happens. It has several layers:

**1. Browser setup** (`fillPajemploiForm` function):
- Gets credentials from 1Password
- Launches a real Chrome browser with Playwright (visible, not hidden)
- Navigates to pajemploi.urssaf.fr

**2. The "tools"** (line 130-210):
These are the **actions Claude can take**. They're defined as a menu of 5 options:
- `fill_field`: type a value into a form field (identified by its label)
- `click`: click a button or link (identified by its text)
- `navigate`: go to a URL
- `wait`: pause for a few seconds
- `done`: signal "I'm finished"

**3. The helpers** (`fillFieldByLabel`, `clickElement`):
These try multiple strategies to find elements on the page. For example, to fill a field labeled "Salaire", it tries: `getByLabel`, then CSS selectors, then placeholder text, then aria-label. This makes it resilient to different page structures.

**4. The system prompt** (`buildSystemPrompt`):
This is the **instruction sheet given to Claude**. It tells Claude:
- Here are the login credentials
- Here are the exact values to fill (formatted with French commas)
- Log in, find the declaration form, fill all the fields
- Do NOT click the final submit button (safety measure)

**5. The agentic loop** (`runAgentLoop`):
This is the core loop. It repeats up to 30 times:

```
1. Take a "snapshot" of the current page (accessibility tree — like a text description of what's on screen)
2. Send that snapshot to Claude, asking "what should I do next?"
3. Claude responds with tool calls (e.g., "click the Login button", "fill the Salary field with 658,13")
4. Execute those actions in the real browser
5. Go back to step 1
```

It's like having Claude look at the screen, decide what to do, do it, look at the screen again, decide the next step, and so on — until Claude calls the `done` tool.

---

## How It All Flows Together

```
User clicks days off on calendar
        |
calculations.ts computes salaries
        |
ResultsPanel shows the numbers
        |
User clicks "Fill Pajemploi"
        |
FillPajemploiButton sends data to agent (HTTP + WebSocket)
        |
server.ts receives it, calls fillPajemploiForm()
        |
pajemploi.ts opens a browser, asks Claude what to do
        |
Claude reads the page, clicks buttons, fills fields (loop)
        |
Status messages stream back to the frontend via WebSocket
        |
User watches progress in the terminal box on the website
```

In short: the website is the **calculator and remote control**, and the agent is the **robot that does the tedious form-filling on the government website**, guided step-by-step by Claude AI.
