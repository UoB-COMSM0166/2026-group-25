# Privacy Review & Data Handling

This document describes what data **Bridge Assault** collects, why it is collected, and how it is stored/processed.

## 1) Do we collect personally identifiable data?

### Local-only gameplay data (stored in browser `localStorage`)
- Progress and economy (`coins`, `gems`, `weaponLevels`, etc.)
- High score and wave
- UI preferences (language, weapon panel collapsed state)

These values are gameplay/session data and are stored on the user's own device.

### Leaderboard data (sent to remote service)
- `player_name` (user-chosen display name, max 16 chars)
- `score`, `wave`, `level`
- `hidden` visibility flag

Potential PII risk: a player may type real personal info in `player_name`.

## 2) Do we need to collect it?

- **No**, for core gameplay. The game is fully playable without any remote submission.
- **Yes, only if leaderboard participation is desired.**

## 3) Can we provide functionality without collecting it?

Yes.
- Core game loop, upgrades, and local high score work without remote data.
- Leaderboard is optional.
- Players can remain private and still keep local progress.

## 4) How do we store and process data?

### Local storage
- Stored in browser `localStorage` under app-prefixed keys.
- Used only by the client game logic.

### Leaderboard backend
- Data is sent via HTTPS requests to PocketBase API endpoints.
- Only minimal fields needed for leaderboard are submitted.

## 5) Privacy improvements implemented

- **Privacy by default** for leaderboard users:
  - New records are created with `hidden = true`.
  - Scores remain private until user explicitly chooses "Show my score".
- Added input sanitization for leaderboard display name (control chars removed, trimmed, length-limited).
- Updated in-game leaderboard copy to clearly state private-by-default behavior.

## 6) Recommended next steps

- Add an in-game "Delete leaderboard profile" action.
- Add an in-game "Clear local save data" privacy control.
- Add a visible privacy link from main menu/leaderboard panel.
- If required by policy, define retention period and contact process for data removal.
