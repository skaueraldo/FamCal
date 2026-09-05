# FamCal

A household calendar and shopping list that stay in sync for everyone in a group.

- Month view with the weekday above each date, and the week of the month on each row
- Import events from an `.ics` file (iPhone / Apple Calendar export) or a public iCal URL
- Connect a Spond account to pull training, matches, and other activities onto the shared month
- Shared group calendar via an invite code
- Shared shopping list that updates for everyone in the group

## Run it

```bash
./dev.sh
```

Or, if Node.js is already installed:

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Create a group, then join the same code from another browser or phone on the same network.

## Deploy

The app is set up for [Vercel](https://vercel.com) (Express + WebSocket on Fluid compute). Group data on Vercel is stored in the function’s temporary filesystem, so it can reset when instances recycle. For a lasting household deploy, keep using this machine or add a database later.

## Import from iPhone Calendar

1. On iPhone, open **Calendar** and export or share the calendar as an `.ics` file (or copy a public iCloud / Google Calendar URL).
2. In FamCal, open **Group**, then drop the file or paste the URL.
3. Those events appear on the shared month automatically.
