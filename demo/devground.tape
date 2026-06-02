# devground demo — render: vhs demo/devground.tape  (desde la raíz del repo)
# Requiere vhs (brew install vhs). Salida: demo/devground.gif
#
# NO ejecuta el CLI real: define una función `npx` (oculta) que corre
# demo/sim.sh, una simulación determinista y offline del output del init.
# El comando visible se ve real; el output es reproducible. Edita demo/sim.sh
# para ajustar el contenido.
Output demo/devground.gif

Set Shell "bash"
Set FontSize 18
Set Width 1000
Set Height 760
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 50ms

# --- setup oculto: npx falso que llama a la simulación ---
Hide
Type "npx(){ bash demo/sim.sh; }"
Enter
Type "clear"
Enter
Show

# --- demo visible ---
Type "npx devground-init --yes"
Sleep 700ms
Enter
Sleep 5s
