# devground demo tape — render con: vhs demo/devground.tape
# Requiere: vhs (https://github.com/charmbracelet/vhs) → brew install vhs
# Salida: demo/devground.gif
#
# Este tape NO ejecuta el CLI real: "escribe" el output esperado con `printf`
# para producir un GIF reproducible y deterministico, sin depender de un
# proyecto de ejemplo ni de la red. Si prefieres grabar el flujo real,
# reemplaza los bloques printf por:  npx devground-init --yes

Output demo/devground.gif

Set Shell "bash"
Set FontSize 18
Set Width 1000
Set Height 720
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 45ms
Set PlaybackSpeed 1.0

# --- Prompt inicial ---
Type "npx devground-init --yes"
Sleep 600ms
Enter
Sleep 800ms

# --- Banner ---
Type@10ms "printf '\n\033[1;36mdevground-init v1.0.0\033[0m\n\n'"
Enter
Sleep 400ms

# --- Deteccion de stack ---
Type@10ms "printf '\033[34mi\033[0m Framework:       Next.js\n'"
Enter
Sleep 200ms
Type@10ms "printf '\033[34mi\033[0m TypeScript:      yes\n'"
Enter
Sleep 200ms
Type@10ms "printf '\033[34mi\033[0m Package manager: pnpm\n\n'"
Enter
Sleep 600ms

# --- Instalando ---
Type@10ms "printf '\033[1;36mInstalling...\033[0m\n\n'"
Enter
Sleep 400ms
Type@10ms "printf '\033[32m✔\033[0m Prettier configured with @devground/prettier-config\n'"
Enter
Sleep 250ms
Type@10ms "printf '\033[32m✔\033[0m ESLint configured with @devground/eslint-config/next\n'"
Enter
Sleep 250ms
Type@10ms "printf '\033[32m✔\033[0m TypeScript configured with @devground/tsconfig/next.json + typecheck variant\n'"
Enter
Sleep 250ms
Type@10ms "printf '\033[32m✔\033[0m Commitlint configured with @devground/commitlint-config\n'"
Enter
Sleep 250ms
Type@10ms "printf '\033[32m✔\033[0m lint-staged configured with @devground/lint-staged-config\n'"
Enter
Sleep 250ms
Type@10ms "printf '\033[32m✔\033[0m Husky hooks configured with @devground/husky-config\n'"
Enter
Sleep 250ms
Type@10ms "printf '\033[32m✔\033[0m AGENTS.md and symlinks configured with @devground/agents-md\n'"
Enter
Sleep 250ms
Type@10ms "printf '\033[32m✔\033[0m Architecture guide + ADR templates configured\n\n'"
Enter
Sleep 500ms

# --- Done ---
Type@10ms "printf '\033[1;36mDone!\033[0m\n\n'"
Enter
Sleep 300ms
Type@10ms "printf '\033[32m✔\033[0m 8 tool(s) configured successfully.\n\n'"
Enter
Sleep 2s
