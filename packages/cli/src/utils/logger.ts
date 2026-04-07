const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';

export function header(text: string): void {
  console.log(`\n${BOLD}${CYAN}${text}${RESET}\n`);
}

export function log(message: string): void {
  console.log(message);
}

export function info(message: string): void {
  console.log(`${BLUE}i${RESET} ${message}`);
}

export function success(message: string): void {
  console.log(`${GREEN}\u2714${RESET} ${message}`);
}

export function warn(message: string): void {
  console.log(`${YELLOW}\u26A0${RESET} ${message}`);
}

export function error(message: string): void {
  console.error(`${RED}\u2718${RESET} ${message}`);
}
