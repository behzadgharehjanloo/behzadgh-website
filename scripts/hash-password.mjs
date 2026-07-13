import { randomBytes, scryptSync } from "node:crypto";
import readline from "node:readline";

function readPassword() {
  if (!process.stdin.isTTY) {
    return new Promise((resolve) => {
      let input = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => (input += chunk));
      process.stdin.on("end", () => resolve(input.trimEnd()));
    });
  }

  return new Promise((resolve) => {
    const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
    process.stdout.write("Admin password: ");
    process.stdin.setRawMode(true);
    let password = "";

    const onData = (buffer) => {
      const character = buffer.toString("utf8");
      if (character === "\r" || character === "\n") {
        process.stdin.setRawMode(false);
        process.stdin.off("data", onData);
        terminal.close();
        process.stdout.write("\n");
        resolve(password);
      } else if (character === "\u0003") {
        process.exit(130);
      } else if (character === "\u007f" || character === "\b") {
        password = password.slice(0, -1);
      } else if (/^[^\u0000-\u001F\u007F]+$/u.test(character)) {
        password += character;
      }
    };

    process.stdin.on("data", onData);
  });
}

const password = await readPassword();
if (password.length < 16) {
  throw new Error("Use a password with at least 16 characters.");
}

const parameters = { N: 32768, r: 8, p: 1 };
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 32, { ...parameters, maxmem: 64 * 1024 * 1024 });
console.log(`scrypt:${parameters.N}:${parameters.r}:${parameters.p}:${salt.toString("base64url")}:${hash.toString("base64url")}`);
