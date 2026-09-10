import { readFileSync } from "node:fs";
import { put } from "@vercel/blob";

const groups = readFileSync(new URL("../data/groups.json", import.meta.url), "utf8");
await put("famcal/groups.json", groups, {
  access: "private",
  allowOverwrite: true,
  addRandomSuffix: false,
  contentType: "application/json",
});
const keys = Object.keys(JSON.parse(groups));
console.log(`Seeded ${keys.length} groups`);
