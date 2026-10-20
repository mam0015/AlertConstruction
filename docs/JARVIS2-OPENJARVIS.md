# Jarvis 2 — run OpenJarvis on your own computer or server

Persian version: [`JARVIS2-OPENJARVIS-FA.md`](JARVIS2-OPENJARVIS-FA.md).

**Jarvis 1** is Claude (Anthropic's cloud AI). **Jarvis 2** is [OpenJarvis](https://github.com/open-jarvis/OpenJarvis) (Apache 2.0), an open-source AI that
runs on a machine **you** control. In **Owner → Jarvis** you pick which one answers. Both read the same things, follow the same rules and can do the same
jobs (the news, plans, drafting and proofreading email, preparing messages / calendar entries / tasks) — only the thinking is done by a different AI.

**Why choose Jarvis 2:** your records go only to your own server, not to Anthropic, and there is no per-question fee.
**What you give up:** you must keep a machine running, and how well it writes depends on the model you load. Small models can be clumsy; Jarvis checks
everything they return and never does anything without your click, but you will notice the difference.

## What you need

* A machine that stays on — an office computer, or a small cloud server (VPS). No GPU is required, but memory matters. OpenJarvis's own guide for model sizes:

  | Memory | Model it suggests | Good enough for Jarvis? |
  |---|---|---|
  | RAM 5–14 GB (or GPU 1–8 GB) | `qwen3.5:2b` | too small to rely on |
  | RAM 15–24 GB (GPU 9–17 GB) | `qwen3.5:4b` | basic |
  | RAM 25–44 GB (GPU 18–35 GB) | `qwen3.5:9b` | **recommended minimum** |
  | RAM 45 GB+ (GPU 36 GB+) | `qwen3.5:27b` | best |

* About an hour. Comfort with a terminal helps; ask whoever looks after your computers.

## Step 1 — Install OpenJarvis

From OpenJarvis's README (macOS / Linux / WSL2): `curl -fsSL https://open-jarvis.github.io/OpenJarvis/install.sh | bash` (Windows: `irm https://open-jarvis.github.io/OpenJarvis/install.ps1 | iex`).
It sets up Python, Ollama and a starter model. Or from source:

```bash
git clone https://github.com/open-jarvis/OpenJarvis.git && cd OpenJarvis
uv sync --extra server
uv run maturin develop -m rust/crates/openjarvis-python/Cargo.toml     # needs Rust
```

Pull the model you chose, for example `ollama pull qwen3.5:9b`.

## Step 2 — Make it safe: text only, no tools

OpenJarvis can also act on its own (web search, memory, skills, scheduled self-improvement). Jarvis 2 must only **write text**. Put this in
`~/.openjarvis/config.toml` (these are the keys OpenJarvis documents):

```toml
[server]
agent = "simple"          # no tools. The default "orchestrator" can use web search and a calculator.

[agent]
default_agent = "simple"
context_from_memory = false

[skills]
enabled = false

[tools.mcp]
enabled = false

[channel]
enabled = false

[learning.spec_search]
enabled = false
```

Jarvis's **Test connection** button warns you if the server reports an agent other than `simple`.

## Step 3 — A key, and start the server

```bash
jarvis auth generate-key                     # prints a key like oj_sk_…  — keep it private
export OPENJARVIS_API_KEY=oj_sk_…            # the server then requires "Authorization: Bearer <key>"
jarvis serve --host 127.0.0.1 --port 8000    # keep it on this machine; Step 4 publishes it safely
```

(With a key set, OpenJarvis protects `/v1/*` and `/api/*`. `/health` and its web screen stay open, so also use Step 4's Cloudflare Access.)

## Step 4 — Let the app reach it (HTTPS required)

The app runs on Cloudflare, so it must reach your server over the internet. Do **not** open port 8000 on your router. Use a **Cloudflare Tunnel**:

1. Install `cloudflared` on the same machine. In Cloudflare **Zero Trust → Networks → Tunnels → Create a tunnel**, point a hostname such as `jarvis2.yourcompany.com.au` at `http://localhost:8000`.
2. Protect it: **Zero Trust → Access → Applications → Add → Self-hosted**, for that hostname, with a policy **Service Auth** and a **service token** (Access → Service Auth → Create Service Token). Copy the token's *Client ID* and *Client Secret*.

Jarvis refuses `http://` addresses except `localhost`, because your records travel to this address.

## Step 5 — Tell the app

Add these as GitHub secrets (Settings → Secrets and variables → Actions) and run **Actions → Run workflow** once (see `docs/GO-LIVE.md`, Step 4):

| Name | Value |
|---|---|
| `JARVIS_OPENJARVIS_URL` | `https://jarvis2.yourcompany.com.au` |
| `JARVIS_OPENJARVIS_API_KEY` | the key from Step 3 |
| `JARVIS_OPENJARVIS_MODEL` | for example `qwen3.5:9b` (leave out to use the first model the server lists) |
| `JARVIS_OPENJARVIS_ACCESS_ID` / `JARVIS_OPENJARVIS_ACCESS_SECRET` | the service token from Step 4 (only if you used Cloudflare Access) |

## Step 6 — Choose it and test it

Open **Owner → Jarvis**, choose **Jarvis 2**, press **Test connection**. You should see "Jarvis 2 answered in … ms" and no warnings. Then ask "What's the news?".
If Jarvis 2 is switched off or unreachable, Jarvis tells you and answers in basic mode — it never quietly uses Jarvis 1 instead.

## What was and was not verified

Jarvis 2 was built from OpenJarvis's documentation and server source (`POST /v1/chat/completions` with `model`, `messages`, `temperature`, `max_tokens`, `stream`;
`GET /health`, `/v1/models`, `/v1/info`; Bearer key from `OPENJARVIS_API_KEY`) and tested against a stand-in for that server. It has **not** been run against a real
OpenJarvis server in this project's test environment — the first real check is the **Test connection** button. OpenJarvis's server does not take a JSON schema, so Jarvis
spells the required answer shape out in the instructions, reads the JSON back out of the text, asks once more if it is malformed, and validates it exactly as it does for Claude.
