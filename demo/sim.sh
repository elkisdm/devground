#!/usr/bin/env bash
# Simulated `devground-init` output for the demo GIF.
# Deterministic + offline: no real install runs. Edit freely; re-render with
# `vhs demo/devground.tape` from the repo root.
printf '\n\033[1;36mdevground-init v1.0.2\033[0m\n\n'; sleep 0.4
printf '\033[34mi\033[0m Framework:       Next.js\n';      sleep 0.2
printf '\033[34mi\033[0m TypeScript:      yes\n';          sleep 0.2
printf '\033[34mi\033[0m Package manager: pnpm\n\n';       sleep 0.5
printf '\033[1;36mInstalling...\033[0m\n\n';               sleep 0.3
printf '\033[32m✔\033[0m Prettier        @devground/prettier-config\n';      sleep 0.22
printf '\033[32m✔\033[0m ESLint          @devground/eslint-config/next\n';   sleep 0.22
printf '\033[32m✔\033[0m TypeScript      @devground/tsconfig\n';             sleep 0.22
printf '\033[32m✔\033[0m Commitlint      @devground/commitlint-config\n';    sleep 0.22
printf '\033[32m✔\033[0m lint-staged     @devground/lint-staged-config\n';   sleep 0.22
printf '\033[32m✔\033[0m Husky hooks     @devground/husky-config\n';         sleep 0.22
printf '\033[32m✔\033[0m AGENTS.md       @devground/agents-md\n';            sleep 0.22
printf '\033[32m✔\033[0m Architecture    @devground/architecture-guide\n\n'; sleep 0.4
printf '\033[1;36mDone!\033[0m\n';                          sleep 0.2
printf '\033[32m✔\033[0m 8 tools configured successfully.\n\n'
