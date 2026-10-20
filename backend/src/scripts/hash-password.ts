// Prints an ADMIN_PASSWORD_HASH for backend/.env.
// Usage: npm run admin:hash -w backend   (asks for the password; nothing is saved or logged)
import { createInterface } from "node:readline/promises";
import { hashPassword } from "../lib/password.ts";

async function readPassword() {
  if (!process.stdin.isTTY) {
    // Piped input, e.g. `echo "pass" | npm run admin:hash -w backend`
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString().trim();
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  // Hide what's typed.
  const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput.bind(rl);
  (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
    if (s.startsWith("New admin password") || s === "\r\n" || s === "\n") write(s);
  };
  const password = await rl.question("New admin password (min 10 characters): ");
  rl.close();
  process.stdout.write("\n");
  return password;
}

const password = await readPassword();
if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}
console.info(`\nADMIN_PASSWORD_HASH=${await hashPassword(password)}\n`);
