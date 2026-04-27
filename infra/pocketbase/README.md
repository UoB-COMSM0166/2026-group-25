# PocketBase Server (Leaderboard Backend)

The `LEADERBOARD_BASE` URL in `docs/js/leaderboard.js` points to a PocketBase
instance hosted on a private VM. The server-side configuration files that
the team needs to keep version-controlled live here.

## Layout

```
infra/pocketbase/
├── README.md                         # this file
└── pb_hooks/
    └── game_scores.pb.js             # API hook for the game_scores collection
```

## What this is NOT

- **Not** the PocketBase binary, data files, or auto-migrations — those live
  in `pb_data/` on the VM and are not source-controlled.
- **Not** automatically deployed — when the file here changes, somebody has to
  copy it onto the VM and restart the service.

## Deploy a hook change

```sh
scp infra/pocketbase/pb_hooks/game_scores.pb.js \
    myserver:/home/ubuntu/pocketbase/pb_hooks/game_scores.pb.js
ssh myserver 'sudo systemctl restart pocketbase'
```

The PocketBase service reads `pb_hooks/*.pb.js` on startup. Confirm with:

```sh
ssh myserver 'sudo systemctl is-active pocketbase'
curl -X POST 'https://www.lzqqq.org/pb/api/collections/game_scores/records' \
  -H 'Content-Type: application/json' \
  -d '{"player_name":"smoke","score":1,"wave":0,"level":1,"hidden":true}'
```

A 200 with the new record JSON means the hook is healthy.

## Notes on the goja hook runtime

PocketBase v0.22+ uses goja for JS hooks, and **each `onXxx` callback runs in
its own eval scope** — top-level helper functions defined in the same file
are NOT visible inside the callback. Helpers must be inlined or duplicated
across callbacks. Likewise, the `e` argument shape varies between PB
versions: older expose `e.request.header.get(name)`, newer rely on
`e.requestInfo()`. The current hook tolerates both.
