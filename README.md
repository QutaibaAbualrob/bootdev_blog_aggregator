# Gator

A multi-user RSS feed aggregator CLI built with TypeScript, Drizzle ORM, and PostgreSQL.

Gator lets multiple users (on the same machine) register, follow RSS feeds, and browse the latest posts from those feeds — all from the terminal. A long-running `agg` command periodically scrapes followed feeds and stores their posts in a PostgreSQL database.

## Requirements

- [Node.js](https://nodejs.org/) 20+ and npm
- [PostgreSQL](https://www.postgresql.org/) 16+ running locally (default port `5432`)
- [tsx](https://tsx.is/) (installed automatically via `npm install`)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the database

```bash
# start Postgres, then create the gator database
createdb gator
# or inside psql:
#   CREATE DATABASE gator;
```

### 3. Create the config file

Create `~/.gatorconfig.json` in your home directory:

```json
{
  "db_url": "postgres://postgres:postgres@localhost:5432/gator?sslmode=disable"
}
```

Replace `postgres:postgres` with your Postgres username and password. The `sslmode=disable` query parameter is required for local connections.

> Note: the `current_user_name` field is managed by the application itself — you don't need to set it.

### 4. Run the migrations

```bash
npx drizzle-kit migrate
```

This creates the `users`, `feeds`, `feed_follows`, and `posts` tables.

## Usage

All commands run through the CLI:

```bash
npm run start <command> [args...]
```

### Commands

| Command | Description |
| --- | --- |
| `register <name>` | Create a new user account and log in as them |
| `login <name>` | Log in as an existing user |
| `users` | List all users (the current user is marked) |
| `addfeed <name> <url>` | Add an RSS feed and follow it |
| `feeds` | List all feeds and who created them |
| `follow <url>` | Follow an existing feed |
| `following` | List the feeds you follow |
| `unfollow <url>` | Stop following a feed |
| `browse [limit]` | Show the latest posts from your feeds (default limit: 2) |
| `agg <interval>` | Start the feed aggregator loop (e.g. `1m`, `10s`, `1h`) |
| `reset` | Delete all users, feeds, follows, and posts |

### Example session

```bash
# register a user
npm run start register lane

# add and follow a feed
npm run start addfeed "Hacker News" "https://news.ycombinator.com/rss"

# fetch posts in the background (Ctrl+C to stop)
npm run start agg 1m

# browse the latest 5 posts
npm run start browse 5
```

## How it works

- **Config** (`src/config.ts`) reads and writes `~/.gatorconfig.json` — the DB connection string and the currently logged-in user.
- **Commands** (`src/commands.ts`) are registered in a registry; commands that need a logged-in user are wrapped with `middlewareLoggedIn` middleware.
- **Aggregator** (`src/lib/scraper.ts`) runs in a loop: it picks the feed that hasn't been fetched longest (`NULLS FIRST`), downloads and parses its RSS XML (`src/lib/rss.ts`), saves the posts to the database, and repeats.
- **Database** uses Drizzle ORM with migrations in `src/lib/db/migrations`.

## Tests

```bash
npm run test
```

The test suite requires a running Postgres database and a `~/.gatorconfig.json` pointing at it. It truncates the database tables when it runs.
