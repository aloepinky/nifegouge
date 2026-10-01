# Pink Sheet Mafia

**[pinksheetmafia.com](https://pinksheetmafia.com)** is a free study site for Navy flight training,
built by students.

- **NIFE** (Cessna 172): questions, navigation tools, course rules, weather, EPs and limits, briefs.
- **TW-4 Primary** (T-6B): interactive cockpit EPs, limits, briefs, discussion items, course rules,
  systems diagrams, and a jet log and flight plan generator.
- **Advanced** (T-44C): EPs and limits, briefs, and discussion items.

This repository is the site's codebase. It's open source, so anyone can copy it and submit changes for review as a *pull request*.

> Pink Sheet Mafia is a study aid, not a publication. Where it disagrees with NATOPS, FTIs, SOPs
> or checklists, the publication is right. Please fix it if you can. Live by the gouge, die by the gouge.

---

## How to help

Pick the row that matches your goal. **Most actions don't require editing the codebase itself.**

| You want to | Action | Setup |
|---|---|---|
| Fix or write a discussion item, brief, jet log or NIFE question | Click **edit** on that page of the site | None |
| Report something wrong, broken or missing | Use **Complaints / Bugs / Feature Requests** at the bottom of any page, or [open an issue](https://github.com/aloepinky/nifegouge/issues/new/choose) | None |
| Change the website structure, or edit something that has no edit button on the site | Use an AI coding agent (below) | About 30 minutes, once |

### 1. Edit on the site

Discussion items, briefs, shared jet logs and NIFE questions are stored on AWS and can be edited or created on the site itself.
They are not stored in this repository. Public access to these items is controlled entirely through the PSM front end.

### 2. Report a problem

If you know something structural or back-end is wrong but don't want to edit the GitHub repository, report it.

### 3. Change the site yourself, with an AI agent

Anyone can of course contribute normally. However, I don't expect any student naval aviators who are fully engaged with school to also
have, or want to use, extensive coding experience. You don't need to know how to code. An AI coding agent can read the code, make the change you
describe, show it to you running on your own computer, and send it in for review. This
repository includes instructions written for the agent ([`CLAUDE.md`](CLAUDE.md)), so it already
knows the site's rules: sources, style, and permissions.

I use **[Claude Code](https://claude.com/claude-code)**, and the steps below are for it. They are subject to change at the whims of Anthropic, but this should provide a good baseline. Other coding agents can use `CLAUDE.md` too, but you may have to point them to it.

A code change can't reach the live site on its own. It goes live only after a maintainer has
reviewed it and merged it. There may be times I can't review pull requests, so expect some delays.

#### One-time setup

1. **Make a GitHub account** at [github.com/signup](https://github.com/signup).
2. **Copy the site to your account.** Click **Fork** at the top of
   [this page](https://github.com/aloepinky/nifegouge), then **Create fork**. This is your own
   copy to change freely.
3. **Install the tools:**
   - **Claude Code desktop app**: [claude.com/download](https://claude.com/download). Sign in with
     your Claude account.
   - **Git**: [git-scm.com/downloads](https://git-scm.com/downloads). Accept every default.
   - **Node.js**, the LTS version: [nodejs.org](https://nodejs.org). Accept every default.
4. **Open Claude Code, choose a folder to work in, and tell it:**

   > Clone my fork of github.com/aloepinky/nifegouge (my GitHub username is ______), install it,
   > and start the site so I can see it in my browser.

   It will ask for permission before running commands. When it's done, the site opens at
   `http://localhost:3000`. That's your local copy.

#### Making a change

1. **Describe the change in specific student terms**, with your source, the way you'd write it yourself:

   > On the T-6B limits page, [the limit] says [what the site says]. NATOPS Chapter [N],
   > [section name], page [N-N], says [what the publication says]. Here's a photo of the page.
   > Fix it.

   You can be extraordinarily broad and vague.
2. **Check the result in your browser.** Ask the agent where to look if it doesn't say. If it isn't
   right, tell it what's wrong, the same way you'd debrief.
3. **Send it for review:**

   > Commit this and open a pull request, with a plain-language description of what changed and
   > the source.

   The agent will give you a link to the pull request. We'll review it, maybe ask
   questions, and merge it when it's right. If you could include some text to indicate who you are or that a human
   was involved somewhere in the loop, I'd appreciate it.

#### Ground rules

- **Every fact needs a publication behind it**: cite which publication, section, and page.
- **Your local copy shows the live site's content.** Clicking **Publish** on a discussion item,
  brief or jet log from your local copy publishes it on the real site.

---

## For developers

It's a Create React App single-page app deployed on Netlify, with an AWS Lambda backend
(`lambda/discussApi`) for the community-edited content. [`CLAUDE.md`](CLAUDE.md) is the full guide
to the architecture and conventions for agents.

```bash
npm install
npm start        # http://localhost:3000
npm test
npm run build
```

`npm start` reads the live content mirror by default. To work against a local server instead, see
**Discussion Items → Server** in `CLAUDE.md`.

## License

- **Code**: [MIT](LICENSE).
- **What the community writes on the site** (discussion items, briefs, jet logs, questions):
  [CC BY-SA 4.0](LICENSE-CONTENT.md).
- **NATOPS and the other publications** the site quotes belong to their issuing authorities. They're
  used here for training under fair use, and neither license covers them. See
  [`LICENSE-CONTENT.md`](LICENSE-CONTENT.md).

If you'd like to help with the site's hosting costs, there's a **Support PSM** button at the bottom
of every page.
