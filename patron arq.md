0:00
En este vídeo te voy a explicar cada
0:02
patrón de arquitectura backen con sus
0:04
beneficios y sus limitaciones, porque
0:06
ninguna arquitectura es buena o mala por
0:08
sí misma, sino que debes aprender cuando
0:10
realmente vale la pena utilizarlas. Y es
0:12
que muchos equipos se dejan llevar por
0:14
modas, usar microservicios porque son
0:16
modernos, utilizar serverless porque
0:18
está de moda no tener servidores o
0:19
implementar Clean Architecture
0:21
simplemente porque lo vieron en una
0:23
charla, pero no saben realmente lo
0:25
importante que es conocer estos
0:27
patrones. Y lo mejor, al final del vídeo
0:29
te voy a dejar una receta paso a paso
0:31
para que puedas elegir la arquitectura
0:33
más adecuada para tu siguiente proyecto.
0:35
Todo ello con criterio y sin dejarte
0:37
llevar por el Jaime. Y es que el primer
0:38
patrón arquitectónico del que me
0:40
gustaría hablar es también el que más
0:42
odia la gente, el famoso monolito. Y es
0:45
que hay mucha gente que ve el monolito
0:46
como algo malo, como algo que se tiene
0:48
que evitar, como algo que nunca
0:49
funciona. Pero lo que no entienden es
0:51
que un monolito no es malo por
0:53
definición. Un monolito es malo cuando
0:55
se implementa de forma errónea y esto lo
0:57
puedes extrapolar a un montón de
0:59
conceptos de la programación. El
1:00
monolito ha ganado mucha mala fama
1:02
porque la mayoría de aplicaciones que
1:04
incorporan este patrón de arquitectura
1:06
acaban generando lo que se conoce como
1:08
una bola de barro gigante o Giant Ball
1:11
of Mat del inglés. Esta gran bola de
1:13
barro no deja de ser un montón de código
1:15
que está muy acoplado, que es difícil de
1:17
actualizar y cuyas responsabilidades
1:19
están todas entremezcladas. El problema
1:21
no es el uso del monolito, el problema
1:23
es haber generado un código nefasto. La
1:25
definición de monolito va más allá de
1:28
tener todo el código junto. También
1:29
necesitas que el despliegue sea único,
1:32
es decir, que tú despliegues todo el
1:34
código de una sola vez. Eso es lo que
1:35
define realmente que algo sea o no un
1:37
monolito. No la tecnología, no el stack,
1:40
simplemente que todo el despliegue
1:41
ocurre a la vez. Y es que dominar y
1:43
entender los diferentes patrones de
1:45
arquitectura Ben te va a ayudar a
1:47
seleccionarlos con criterio, te va a
1:49
ayudar a huir del hype y a realmente
1:51
escoger la tecnología que más se adecúa
1:53
a lo que necesitas. Y es que esto se
1:55
puede ver muy claramente cuando hablamos
1:56
de microservicios. Históricamente, los
1:58
microservicios han sido simplemente una
2:01
palabra de marketing que han utilizado
2:03
muchos equipos para dar a entender que
2:05
su tecnología es más escalable y es
2:07
mucho mejor que la competencia. Incluso
2:10
algunas empresas lo utilizaban como
2:11
bandera para poder captar más inversión.
2:13
Y cuidado, como siempre digo, no estoy
2:15
diciendo que los microservicios sean
2:16
malos, estoy diciendo que se han
2:18
utilizado para desarrollar con Hype. De
2:20
hecho, si miramos este artículo de
2:21
Orailey, lo que podemos ver es que
2:23
muchas empresas empezaron a utilizar
2:25
microservicios hace un montón de tiempo,
2:27
hace 5 años, y esto es de 2020. Es
2:29
decir, desde 2015 ya había empresas que
2:32
estaban empezando a utilizar
2:33
microservicios. Ahora bien, muchas de
2:35
estas empresas que empezaron a usar
2:36
microservicios por moda se acabaron
2:38
dando cuenta de que acababan teniendo
2:40
más problemas que soluciones. De hecho,
2:42
en el mismo artículo lo que podemos ver
2:44
es el porcentaje de empresas que
2:46
consideran que aplicaron los
2:47
microservicios de forma correcta o de
2:49
forma exitosa. Y si bien es cierto que
2:51
hay un gran número que dicen que
2:53
mayoritariamente tuvieron éxito, también
2:55
hay un montón de empresas que realmente
2:57
no tuvieron esta suerte. El artículo lo
2:59
intenta hacer en una luz positiva,
3:00
diciendo que más del 37% dicen que han
3:03
tenido un poquito de éxito, pero tener
3:05
un poquito de éxito indica que realmente
3:07
no pudiste completar la migración o que
3:09
en algún punto de tu migración hacia
3:11
microservicios descubriste que quizá no
3:13
eran tan útiles o no te solucionaban
3:15
tantos problemas. De hecho, en este
3:16
mismo artículo se puede ver que la
3:18
mayoría de empresas que han fallado o
3:20
que no han completado su adopción de
3:22
microservicios no ha sido por problemas
3:24
técnicos, sino que ha sido por problemas
3:25
de contexto o del propio equipo. De
3:27
hecho, aquí sale la primera pregunta
3:29
básica que te tienes que hacer cuando
3:30
quieres migrar de un monolito a
3:32
microservicios y es si los equipos de
3:34
desarrollo tienen un dominio claro de
3:37
sus responsabilidades, porque si no es
3:38
así, lo más probable es que los
3:40
microservicios te acaben y es que este
3:42
es el punto donde la mayoría se
3:43
equivoca. Como he dicho, no fallan por
3:45
falta de talento, fallan por falta de
3:47
criterio. Al final, lo que realmente
3:49
diferencia a un senior de un junior es
3:52
su capacidad de analizar, valorar y
3:55
decidir. Ahora te voy a mostrar más
3:56
arquitecturas para que las tengas en tu
3:58
caja de herramientas y por lo tanto
4:00
puedes escoger con criterio tu próximo
4:02
proyecto. Es un error ir directamente de
4:04
un extremo, el monolito, a otro extremo,
4:06
microservicios super pequeños. Para
4:08
hacer esta evolución con criterio,
4:10
tienes que hacerlo por etapas. Y la
4:12
siguiente arquitectura de la que te
4:13
quiero hablar va precisamente en este
4:15
camino. Es una arquitectura que puedes
4:17
trabajar dentro del propio monólito y se
4:19
trata de la arquitectura por capas. La
4:21
arquitectura por capas es la primera
4:23
separación de responsabilidades que
4:25
deberías tener clara en un monolito. Y
4:27
quiero insistir, eh, esta arquitectura
4:28
por capas la puedes aplicar en un
4:29
monolito completo o incluso en cada
4:31
microservicio de forma separada si ya
4:33
tienes microservicios. A mí
4:34
personalmente me gusta mantenerlos en
4:36
sí. Me gusta tener una capa en la que
4:38
estoy hablando de todo el tema de
4:39
transporte, por ejemplo, todo el tema de
4:41
HTTP, express, TRPC, todo lo que sería
4:44
la capa de comunicación con el exterior,
4:46
la definición de la API lo tendría en la
4:49
capa de transporte. Luego entre medio
4:50
tendría la capa de dominio en el que
4:52
tengo definidas todas las funciones. Es
4:55
decir, yo recibo en la capa de
4:56
transporte una petición, me lo invento
4:58
get de algo y eso le delega a la capa de
5:01
dominio la obtención de esto. Pero la
5:03
capa de dominio no sabe si la petición
5:04
le llega porque es una petición http o
5:06
porque es una petición trp o porque lo
5:08
he llamado desde una Cayi. Por lo tanto,
5:10
tengo separadas estas dos capas de
5:12
primeras. Luego también tendría una
5:14
tercera capa que es la capa de datos, la
5:17
capa de repositorios me gusta llamarla a
5:19
mí. en la que tengo todas las
5:21
funcionalidades que llaman a base de
5:23
datos o a APIs externas. De esta forma
5:25
tengo una separación sencilla porque
5:27
solamente tengo tres capas pero con
5:28
responsabilidades muy claras. Capa de
5:31
comunicación, la de transporte con la
5:32
API, capa de cálculos, procesamiento de
5:35
datos de dominio y capa de base de datos
5:38
o obtención de datos de terceras partes.
5:40
A mí esta separación en tres capas me ha
5:42
servido en la mayoría de proyectos de
5:44
backen en los que he trabajado, pero
5:46
existen otras arquitecturas que te
5:48
amplifican esta separación y realmente
5:50
te ayudan a abstraerte muchísimo más.
5:52
Estoy hablando de las arquitecturas
5:54
clean y la arquitectura hexagonal. Estas
5:56
arquitecturas van un paso más allá y te
5:58
ayudan a trabajar mejor con las
5:59
dependencias que puedes tener en tu
6:01
proyecto. Normalmente, cuando trabajas
6:02
en proyectos grandes, puedes acabar
6:03
teniendo un montón de incertidumbre y lo
6:05
que al principio con tres capas te
6:07
parecía sencillo y que funcionaba
6:08
perfectamente, luego se te empieza a
6:10
complicar. Quizá necesitas incorporar
6:12
más tipos de bases de datos, más tipos
6:14
de APIs externas, incluso más capas de
6:16
transporte, porque ya no tienes
6:17
solamente una API pública, ahora
6:19
también, como he dicho antes, tienes una
6:21
CLI, ahora también quieres que esa
6:22
funcionalidad sirva en un programa de
6:24
escritorio. Cuando todo esto ves que
6:26
empieza a complicarse, estas
6:27
arquitecturas más complejas te pueden
6:29
ayudar. Ahora bien, no caigas en tener
6:31
que utilizarlas simplemente porque
6:33
parece que son mejores. De hecho, existe
6:35
controversia sobre la aplicación real
6:37
que tienen estas arquitecturas. Hay
6:39
bastantes posts en internet que tienen
6:41
títulos similares a este que vemos aquí
6:42
de 2022 en el que te explica cuándo no
6:44
tienes que utilizar arquitectura
6:46
hexagonal. Una de las grandes críticas
6:47
que recibe la arquitectura hexagonal es
6:49
que para poder implementarla
6:51
correctamente necesitas que todas las
6:52
características del negocio estén
6:54
definidas por adelantado. Esto va en
6:57
contra, en general de las metodologías
6:59
ágiles o de la forma en la que
7:00
desarrollamos hoy en día, en la que
7:02
intentamos prototipar de una forma
7:04
muchísimo más rápida. Por lo tanto, en
7:05
según qué contextos, aplicar este tipo
7:07
de arquitecturas más extremas pueden no
7:09
ser una solución y causar muchísimos más
7:11
problemas, por ejemplo, haciéndote ir
7:13
más lento. Y cuidado, y sé que estoy muy
7:15
pesado con esto, no estoy diciendo que
7:16
la arquitectura hexagonal sea mala por
7:18
definición. No hay un martillo de oro
7:20
que te solucione todos los problemas. No
7:22
tenemos que buscar la solución perfecta.
7:23
tenemos que buscar la solución que mejor
7:24
se adapte al problema que tenemos
7:26
delante. Conocer los pros y los contras
7:28
de cada una de esas arquitecturas es
7:30
básico para poder hacer nuestro trabajo
7:32
como ingenieros de software y
7:33
desarrollar lo mejor posible. Y es que
7:35
ahí es donde está el punto. No se trata
7:36
para nada de tener la arquitectura más
7:38
pura, sino de tener la arquitectura que
7:40
realmente tu equipo pueda mantener. Si
7:42
quieres algo intermedio, un equilibrio
7:44
entre orden y velocidad, el siguiente
7:46
paso es convertir el monolito en algo
7:48
mucho más escalable, el monólito
7:51
modular. Y recuerda que al final del
7:52
vídeo te voy a dejar un algoritmo
7:53
completo para saber exactamente qué
7:55
arquitectura elegir para tu próximo
7:57
proyecto. Y es que el monolito modular
7:59
puede parecer algo contradictorio. ¿Cómo
8:01
puedo tener un monolito que era todo
8:03
barro, que era horrible de forma falsa,
8:05
que a la vez es modular? Al final,
8:07
cuando pensamos en modularización, que
8:08
siempre nos vamos al extremo de los
8:09
microservicios, pero esto no tiene por
8:11
qué ser así. El monolito modular es una
8:13
etapa en la que la mayoría de empresas
8:15
se sienten muy cómodas trabajando y es
8:17
posible que con este tipo de
8:18
arquitectura te puedas quedar y aguantar
8:20
durante años. Al final, un monólito
8:22
modular no deja de ser un monolito bien
8:24
hecho. Sí es verdad que todo el código
8:27
se despliega a la vez, pero trabajar en
8:29
él no es un desastre. Tienes las
8:30
responsabilidades bien definidas, tienes
8:32
las diferentes partes y los diferentes
8:34
servicios del código bien separados.
8:36
Puedes trabajar en la parte de pagos sin
8:38
romper la parte de compras. Esta
8:39
modularización la puedes conseguir, como
8:41
hemos dicho, por capas o utilizando
8:43
clino hexagonal, pero no tiene por qué
8:44
ser así. Puedes simplemente tener una
8:46
modularización que a ti te funciona y
8:48
que a tu equipo le parece sencilla de
8:50
mantener. Al final, la clave es tener
8:52
los módulos bien definidos y muy bien
8:54
separados. Para ello puedes leer o
8:57
ayudarte de herramientas como, por
8:58
ejemplo, DDD, aunque a mi gusto es un
9:00
poquito demasiado extremo. Hacer una
9:02
buena fase de análisis de las
9:03
funcionalidades, los usuarios y las
9:06
dependencias que tiene tu sistema te va
9:08
a ayudar a realmente hacer una
9:10
modularización de tu monólito. A partir
9:12
de aquí es para mí cuando realmente
9:14
tienes la madurez técnica suficiente
9:16
para poder plantearte ir al siguiente
9:18
nivel en caso de que sea necesario, los
9:20
microservicios. Y es que, como hemos
9:21
dicho, la gente tenía mucho hype por los
9:23
microservicios. Utilizarlos era como
9:25
realmente tener una tecnología super
9:27
avanzada y que no te lo podían tumbar de
9:29
ninguna forma porque la escalabilidad
9:31
era infinita. Spoiler, la mayoría de
9:33
empresas implementaron microservicios de
9:35
una forma que lo hizo todo muchísimo más
9:37
complejo. De hecho, hay un vídeo en
9:38
internet en el que se mofan de todo
9:40
esto. Quieren añadir la fecha de
9:41
nacimiento en el perfil de usuario y
9:43
para hacerlo tienen que recorrer toda
9:45
una serie de microservicios hasta llegar
9:47
al famoso Galactus. Y no se trata
9:49
solamente de humor, hay un montón de
9:50
autores técnicos que determinan que para
9:53
llegar a la fase de microservicios
9:55
primero te has tenido que comer toda la
9:56
fase del monolito. Concretamente, Martin
9:58
Fowler, que le conoceréis porque es el
10:00
autor del libro de Refactoring, uno de
10:02
los libros más famosos en ciencias de la
10:04
computación, dice en su propio blog que
10:06
nunca deberías empezar con la
10:08
arquitectura de microservicios, sino que
10:09
realmente deberías primero empezar con
10:11
un monolito, hacerlo modular y luego
10:13
separarlo en microservicios cuando sea
10:15
realmente un problema. y no es el único.
10:17
De hecho, Sam Newman en su libro de
10:19
Building Microservices también dice algo
10:21
similar. De hecho, Samnum lo enfoca un
10:23
poquito diferente y dice que la forma
10:25
real en la que tienes que determinar si
10:26
quieres utilizar o no microservicios es
10:28
en función del tamaño del equipo. Según
10:30
Sam, implementar microservicios en un
10:32
equipo pequeño es un riesgo muy alto y
10:35
los beneficios que podrías obtener por
10:36
utilizar microservicios, como podría ser
10:38
mejor velocidad de despliegue o más
10:40
seguridad a la hora de desarrollar, no
10:42
acaban de compensar todo el coste
10:43
técnico que le añade sobre el equipo. Y
10:46
acaba llegando a la misma conclusión,
10:47
empezar con un monolito acostumbra a
10:49
funcionar mejor. es cuando el monolito
10:51
crece y cuando empiezas a detectar las
10:53
partes que realmente necesiten
10:54
escalabilidad, cuando realmente tienes
10:56
que pensar en si vale la pena sacar ese
11:00
módulo que ya lo tienes separado porque
11:01
tienes un monolito modular en un
11:03
microservicio aparte. Y si estás ya en
11:05
la fase de microservicios y quieres ir
11:07
un paso más allá en la segregación de
11:10
responsabilidades y en el aumento de la
11:12
escalabilidad, puedes investigar el
11:13
siguiente patrón de arquitectura, el
11:15
patrón CQRS. Este patrón va muy bien
11:18
para arquitecturas enfocadas a eventos y
11:20
lo que hace es segregar los comandos de
11:22
las acciones. Por ello se llama CQRS del
11:25
inglés Command Query Responsibility
11:27
Segregation. Básicamente consiste en
11:28
separar las peticiones, es decir, yo
11:31
tendría comandos que le mando a mi
11:33
servidor, por ejemplo, o a mi
11:34
microservicio de las respuestas. De esta
11:37
forma yo podría empezar a encolar
11:39
peticiones y estar escuchando, por otro
11:41
lado, las respuestas de forma asíncrona.
11:43
Es un patrón de arquitectura altamente
11:45
utilizado, por ejemplo, con los
11:46
websckets. Yo le puedo mandar mensajes
11:48
con un socket para realizar comandos,
11:49
cada comando teniendo un ID único, y
11:52
luego ir escuchando las respuestas que
11:53
van dando el servidor. Yo voy escuchando
11:55
estas peticiones porque tengo un ID
11:57
único que me determina cuál era el
11:58
comando que mandé y por lo tanto puedo
12:00
ir marcando las respuestas como
12:02
completadas. Esto si bien es cierto que
12:03
funciona muy bien para aumentar la
12:05
escalabilidad de un sistema, yo puedo
12:07
empezar a mandar un montón de peticiones
12:09
que lo peor que puede pasar es que se
12:10
acaban encolando. También es cierto que
12:11
me complica el desarrollo porque ahora
12:13
ya, por ejemplo, cada comando tiene que
12:15
poder identificarse únicamente. Le
12:16
estamos añadiendo un montón de carga
12:18
técnica cuando quizá no era necesario.
12:21
Este patrón es aplicable realmente
12:23
cuando tienes una gran cantidad de
12:24
información que tienes que tratar. Por
12:26
ejemplo, eventos de usuario. Imagínate
12:28
que quieres guardar donde los usuarios
12:29
hacen clic en tu plataforma cuando hacen
12:31
scroll de una ventana porque tienes una
12:32
aplicación de registro de eventos de una
12:34
página web. Ahí posiblemente tener un
12:36
sistema CQRS te puede ayudar muchísimo
12:39
porque la cantidad de tráfico entrante
12:41
va a ser altísima. Ahora bien, no
12:42
intentes aplicar este patrón para
12:44
cualquier tipo de solución en las que
12:45
simplemente una petición síncrona HTTP
12:48
te podría servir. Hemos estado hablando
12:49
de las arquitecturas a nivel conceptual,
12:51
pero la forma de implementarlas puede
12:53
variar enormemente. Puedes desplegar tu
12:55
monolito en un servidor dedicado
12:56
utilizando Docker, cubernetes o todo lo
12:58
que quieras. Incluso, por ejemplo, en mi
13:00
caso con Comit Academy, lo que tengo es
13:02
un monolito, porque lo tengo
13:04
directamente con un solo servicio,
13:05
desplegado en lambdas. El hecho de
13:07
desplegar cosas de blandas no hace que
13:09
sean microservicios automáticamente,
13:10
simplemente es la forma en la que yo
13:13
despliego mi código. Por lo tanto,
13:14
entender realmente lo que es serverless
13:16
también es clave porque hay muchísima
13:18
gente que se cree que por utilizar
13:19
serverless ya está utilizando
13:20
microservicios cuando no tiene por qué
13:22
ser así. Tanto puedes tener
13:23
microservicios desplegados en un
13:25
servidor dedicado como puedes tener
13:27
monolitos desplegados en serverless. Y
13:29
es que al final serverless no deja de
13:31
ser una palabra fancy para decir que
13:33
delegas la gestión de servidores a un
13:35
cloud. En mi caso utilizo a WS que tiene
13:37
el concepto de lambdas y si bien es
13:39
cierto que te abstrae un montón de carga
13:41
mental sobre la gestión de servidores,
13:43
también tiene algunas cosas a tener en
13:45
cuenta. Ahora cada vez menos porque está
13:46
enseñando tecnologías que evitan esto,
13:48
pero las lamdas tenían un problema que
13:50
se llamaba el inicio en frío o cold
13:52
start. Aunque parezca magia, estas
13:54
funciones como servicio no dejan de ser
13:56
código que está desplegado en alguna
13:58
máquina. Por lo tanto, cuando se recibía
14:00
una petición a una lambda que llevaba
14:01
mucho tiempo sin ser encendida,
14:03
necesitaba empezar el servidor. Eso es
14:05
lo que se conoce como Cold Start, en el
14:07
que la primera llamada a una función
14:09
lambda siempre tardaba un poco más que
14:11
las llamadas siguientes, que ya tenían
14:13
la lambda, lo que se conoce como
14:14
caliente. De hecho, había hasta técnicas
14:16
en las que le ibas haciendo peticiones a
14:18
una lambda cada hora o así para
14:19
mantenerla caliente y nunca caer en el
14:22
Gold Star. Si bien es cierto que desde
14:24
entonces AS ha sacado algunas
14:25
herramientas para poder mejorar todo
14:27
esto, el otro problema a tener en cuenta
14:29
que tiene serverless es el precio. Y es
14:31
que en general utilizar tecnologías
14:33
serverless es siempre más caro que
14:35
tenerlo todo en un servidor dedicado.
14:37
Por lo tanto, te funciona en según qué
14:38
casos de uso. Y para mí se pueden
14:40
resumir en dos. Por un lado, necesitas
14:42
alta disponibilidad sí o sí, por lo que
14:44
no quieres que ese servicio muera nunca.
14:45
Pues ahí, bueno, puedes pagar unas
14:47
lambdas, aunque también lo puedes
14:49
conseguir con servidores. Y dos, y para
14:50
mí el más obvio, cuando tienes tráfico
14:52
en picos, por ejemplo, cuando de golpe
14:54
todo el mundo utiliza tu producto a las
14:55
9 de la mañana y necesitas poder asumir
14:58
este pico, pero luego ese pico va a
14:59
caer. Si el tráfico es constante, quizás
15:01
es mejor utilizar un servidor dedicado.
15:03
De hecho, muchos medios y también muchos
15:05
creadores técnicos se llenaron la boca
15:07
de que los microservicios eran una
15:09
estafa cuando salió la noticia de que un
15:11
equipo de Amazon, un equipo de Prime
15:13
Video cambió una parte de su producto
15:15
desde microservicios con Serverless
15:18
hasta un servidor dedicado con S2. Esta
15:20
noticia se hizo bastante famosa e
15:22
incluso yo mismo hice un vídeo
15:23
analizándola porque, claro, mucha gente
15:25
estaba esperando el momento para decir
15:27
que los microservicios eran una y
15:29
que realmente teníamos que utilizar
15:30
simplemente servidores dedicados, sin
15:32
analizar realmente cuál fue la razón por
15:34
la que este equipo específico de Prime
15:36
Video cambió de serverless a un servidor
15:39
dedicado, que era principalmente el cost
15:41
y que el problema que ellos estaban
15:42
solucionando no se adaptaba bien a la
15:45
arquitectura de Lambdas y no se adaptaba
15:47
bien porque, tal como lo habían
15:48
planteado, hacía que el coste monetario
15:51
que costaba mantener esas lambdas fuera
15:53
directamente inasumible. No porque las
15:55
lambdas fueran malas, sino porque
15:57
estaban intentando meter en lambdas un
15:59
problema que con un servidor dedicado se
16:01
solucionaba muchísimo más fácil. Te dejo
16:02
el artículo por aquí en la descripción
16:04
si le quieres echar un ojo a realmente
16:05
cómo hicieron esta migración y las
16:07
razones exactas por las que la hicieron.
16:09
Y es que, como ves, hay que tener en
16:10
cuenta un montón de factores a la hora
16:12
de decidir qué arquitectura de Bakend se
16:14
adapta mejor a tus necesidades. Mi
16:16
propuesta es que te hagas una serie de
16:18
preguntas para acabar de decidir
16:20
realmente qué te funcionará mejor. A mí
16:22
me gusta plantear todo esto como si
16:23
fuera un pequeño algoritmo en el que
16:25
puedes ir respondiendo estas preguntas y
16:27
acabar decidiendo. Estas preguntas
16:29
incluyen varios factores, por ejemplo,
16:30
el tamaño del equipo, la frecuencia con
16:32
la que tienes que desplegar cambios y
16:33
otros requisitos como presupuesto o
16:35
necesidades de escalabilidad. He
16:37
intentado plasmar en un algoritmo las
16:38
preguntas que yo me hago cuando tengo
16:40
que escoger que se adapta mejor o si
16:42
tengo que migrar algo a microservicios.
16:43
Por ejemplo, las transacciones son
16:45
fuertes y son frecuentes entre
16:47
diferentes dominios. Es decir, existe
16:49
mucha comunicación entre diferentes
16:51
partes del sistema. Si es que sí,
16:53
significa que esto está bastante
16:54
acoplado y por lo tanto, mi
16:55
recomendación sería mantener el
16:57
monolito. Si la respuesta es no y está
16:58
bastante bien modularizado, tenemos que
17:00
empezar a pensar en otras facetas. Por
17:02
ejemplo, ¿cuál es el objetivo? ¿Estamos
17:03
en una fase de mantenimiento y de tests?
17:05
Si es que sí podemos intentar pues
17:07
aplicar clean o aplicar arquitectura
17:08
hexagonal porque estamos en una fase
17:10
estable en la que los requisitos no
17:12
cambian. Por lo tanto, es una buena
17:13
oportunidad si queremos implementar este
17:15
tipo de arquitecturas que requieren
17:17
mucho más boiler play. En caso de que no
17:19
sea así, entra la parte crítica para mí,
17:21
que es cuál es el tamaño del equipo. Si
17:23
no tenemos un equipo suficientemente
17:25
grande, nos quedamos en monolito, porque
17:26
si no va a ser un problema. En caso de
17:28
que sí realmente tengamos un equipo
17:30
grande, podemos empezar a modularizar
17:32
este modelito. A partir de aquí es donde
17:34
entraríamos en la fase de migración
17:36
hacia microservicios si fuera necesario.
17:38
Es decir, si tenemos una parte de este
17:40
monudito, uno de estos módulos que
17:41
recibe muchas más peticiones, podemos
17:43
empezar a plantear si queremos extraer o
17:45
no esa parte del dominio en un
17:47
microservicio independiente. Como ves,
17:48
he intentado plasmar todo mi proceso
17:51
mental a la hora de pensar todo esto en
17:53
un algoritmo que te dejaré en la
17:54
descripción para que te lo puedas
17:55
descargar. Y ahora ya entiendes las
17:57
diferentes arquitecturas, por lo que el
17:59
siguiente paso es aprender a pensar como
18:00
el top 1% de programadores que no
18:03
solamente escribe código, sino que
18:04
diseña soluciones y crea valor real. Si
18:07
quieres dar ese salto y salir de este
18:09
ciclo de tutoriales, te dejo un vídeo
18:11
por aquí. Y mucho más, espero que este
18:12
vídeo te ha parecido interesante y nos
18:13
vemos en el siguiente con más
18:14
informática. Hasta otra.