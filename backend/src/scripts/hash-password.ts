// Prints an ADMIN_PASSWORD_HASH for backend/.env.
// Usage: npm run admin:hash -w backend   (asks for the password; nothing is saved or logged)
import { hashPassword } from "../lib/password.ts";

/** Reads a line from the terminal without echoing what's typed. */
function promptHidden(question: string) {
  return new Promise<string>((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") {
          // Ctrl+C
          stdin.setRawMode(false);
          process.stdout.write("\n");
          process.exit(130);
        }
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else if (ch >= " ") value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function readPiped() {
  // e.g. `echo "pass" | npm run admin:hash -w backend`
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString().trim();
}

const password = process.stdin.isTTY ? await promptHidden("New admin password (min 10 characters): ") : await readPiped();
if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}
console.info(`\nADMIN_PASSWORD_HASH=${await hashPassword(password)}\n`);
