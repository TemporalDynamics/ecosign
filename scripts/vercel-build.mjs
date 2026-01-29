import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const clientDir = join(process.cwd(), "client");
const clientPkg = join(clientDir, "package.json");

if (!existsSync(clientPkg)) {
  console.error("Missing client/package.json; cannot run Vercel build.");
  process.exit(1);
}

execSync("npm install", { cwd: clientDir, stdio: "inherit" });
execSync("npm run build", { cwd: clientDir, stdio: "inherit" });
