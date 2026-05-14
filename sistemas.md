0:00
Diseñar sistemas suena complicado hasta
0:02
que ves como lo hace un ingeniero
0:03
senior. Y es que cuando tienes
0:05
experiencia no te pones a hablar
0:06
directamente de herramientas, [música]
0:08
sino que empiezas con algo muchísimo más
0:09
básico, con una sola pregunta. ¿Cómo
0:12
interactúan los usuarios con los datos
0:14
que estoy encontrando? [música]
0:15
Entender la importancia de esta pregunta
0:18
y cómo responderla es lo que determina
0:20
que los sistemas puedan escalar de forma
0:22
indefinida o que se rompan la primera
0:24
vez que reciben un pico de tráfico. En
0:26
este vídeo [música] te voy a explicar
0:28
cómo piensan los ingañeros senior y qué
0:29
técnicas utilizan para que tú puedas
0:31
aplicar estas herramientas
0:33
independientemente del tamaño de tu
0:35
proyecto. Y es que la pregunta que he
0:36
hecho [música] es básica para entender
0:38
exactamente qué significa escalar. En
0:40
muchas entrevistas laborales se habla de
0:42
disñame un sistema escalable, pero pocas
0:44
veces se comenta de qué significa
0:46
escalable en el contexto de ese
0:49
problema. La pregunta de cómo
0:50
interactúan los usuarios con los datos
0:52
va a determinar la mejor forma de
0:55
escalar. Y la respuesta de esta pregunta
0:57
va a ser una de dos. O bien los usuarios
0:59
son los que [música] leen datos, es
1:01
decir, necesito poder mostrarles mucha
1:03
cantidad de datos de una forma
1:05
eficiente, o bien son los que escriben
1:07
[música] datos, es decir, necesito
1:09
ingestar una gran cantidad de datos.
1:12
Tengo el problema de escalabilidad por
1:13
las lecturas [música] o lo tengo por las
1:15
escrituras. Entender exactamente este
1:17
tipo de interacciones va a determinar
1:19
qué tipo de soluciones vamos a aplicar,
1:21
porque son totalmente diferentes y en
1:23
muchas ocasiones son incluso contrarias.
1:26
Es decir, no [música] puede existir una
1:27
si existe la otra. Este tipo de
1:29
interacción entre usuarios y datos es lo
1:31
que se conoce como access pattern o
1:33
patrón de accesos. Es decir, entender,
1:36
por ejemplo, si hay un solo usuario que
1:38
escribe una gran cantidad de datos o si
1:41
hay muchos usuarios, cada uno
1:44
escribiendo poquito, pero que si lo
1:46
sumas es un montón de ingesta. Lo mismo
1:49
al revés. Se trata de el mismo dato
1:51
mostrado a un montón de usuarios o cada
1:54
usuario va a tener una versión distinta
1:57
de los datos que tiene que ver. Entender
2:00
estos patrones de acceso te va a
2:02
determinar, te va a dar herramientas
2:05
para decidir cómo tienes que hacer la
2:07
arquitectura y qué significa exactamente
2:09
que algo sea escalable. Cuantos más años
2:11
llevas trabajando, la verdad que se
2:13
mantiene es la siguiente y es [música]
2:15
que no existe una solución universal.
2:18
Por lo tanto, lo primero es entender el
2:19
problema, entender el contexto y a
2:22
través de ahí desde tu caja de
2:24
herramientas escoges lo que puede
2:26
solucionar ese problema. Si quieres
2:27
evitar estos errores antes de que
2:29
ocurran, quédate porque ahora te voy a
2:31
dar distintas herramientas que vas a
2:32
poder utilizar en distintos patrones de
2:35
acceso que te puedas encontrar en tu
2:36
carrera profesional. Y es que lo primero
2:37
que deberías determinar a la hora de
2:39
definir la escalabilidad de un sistema
2:41
es si se trata de un sistema fan out un
2:43
sistema fan in. Lo que determina que un
2:45
sistema se considere fan out fan in es
2:49
si es un sistema de lecturas o un
2:51
sistema de escrituras. Empecemos con el
2:53
de lectura. Un sistema con alta carga de
2:55
lectura podría ser, por ejemplo,
2:57
Netflix. Se trata de un sistema donde lo
2:59
importante es poder dar el capítulo de
3:02
la serie o la película a un montón de
3:05
usuarios a la vez. Pero todos los
3:06
usuarios están viendo el mismo capítulo.
3:08
Y en general uno de los principales
3:10
retos de un sistema como este es hacer
3:12
el broadcast, es decir, es capaz de
3:14
distribuir gigas y gigas y gigas de
3:16
datos a un montón de gente alrededor del
3:19
mundo. Es un sistema de alta carga de
3:22
lectura. Para ello podemos utilizar una
3:24
serie de herramientas. La más común y la
3:25
más obvia sería una CDN, una content del
3:28
Delivery Network. Una CDN no deja de ser
3:31
un servicio que te da servidores
3:33
alrededor del mundo. Si yo, por ejemplo,
3:35
estoy aquí ahora en España y tengo un
3:38
servidor CDN cerca, cuando yo haga la
3:40
petición a Netflix para obtener los
3:42
datos de un capítulo, esta CDN va a
3:45
guardar una versión de este capítulo. Es
3:48
decir, cuando yo le he dado a Play, he
3:50
pedido a la CD en el capítulo, no
3:52
estaba, me he ido al servidor central de
3:55
Netflix, [música] ha servido el capítulo
3:57
a la CDN y me lo ha dado a mí. Si ahora
3:59
otro usuario que también está en España,
4:01
que también tiene cerca este servidor
4:04
CDN, cuando pida ese mismo capítulo, ya
4:07
no va a ir al servidor central de
4:09
Netflix porque la CDN ya lo tiene
4:11
disponible. Por lo tanto, esto aligera
4:13
muchísimo la carga del servidor central
4:15
y permite tener lecturas [música] a una
4:18
capacidad muy alta. Y aquí estamos
4:20
usando un ejemplo de contenido estático
4:22
a nivel de vídeo, pero las CDN se pueden
4:24
utilizar en un montón de otros sitios,
4:27
por ejemplo, para distribuir páginas
4:28
web. Todo lo que sea contenido estático,
4:31
JavaScript, HTML, CSS, imágenes, es
4:34
susceptible a ser distribuido mediante
4:37
una CDN. CDNs, hay muchas. Por ejemplo,
4:39
tenemos la CDN de Cloudfare, tenemos la
4:41
CDN de Cloudfront, que es la de WS,
4:43
tenemos CDNs en Google Cloud, tenemos
4:46
CDNs en Asure. Existen multitud de estos
4:49
servicios con diferentes precios y
4:51
capacidades, pero en general utilizarla
4:53
va a aportar una capacidad de
4:55
distribución mucho más alta que si no la
4:57
utilizaras, sino todas las lecturas
5:00
acabarían yendo a tus servidores
5:02
centrales. Otras herramientas que puedes
5:03
utilizar para ayudarte a escalar este
5:06
tipo de sistemas serían las cachés.
5:08
Cachés en memoria o cachés como
5:10
servicio, [música] poniendo por ejemplo
5:12
un redis o un memcatch delante de
5:15
algunos de tus servidores. Esto te puede
5:17
dar una capa que te ayude a no cargar
5:20
tanto de lecturas tu servidor central.
5:22
Pero ten en cuenta una cosa, tanto las
5:24
CDNs como las cachés van a requerir que
5:26
le añadas también al servicio algún tipo
5:29
de lógica para cuándo eliminar la cache.
5:31
Por ejemplo, en las CDNs, si yo subo una
5:33
nueva versión de la página web, si yo no
5:35
invalido la CDN, lo que va a ocurrir es
5:37
que los usuarios seguirán viendo la
5:38
versión antigua. Por lo tanto, tengo que
5:41
tener una estrategia de eliminación de
5:43
la caché para que si yo actualizo datos,
5:46
estos datos sean disponibles lo más
5:48
rápido posible a los usuarios en caso de
5:50
que eso sea necesario. CDNs, podemos
5:52
invalidar la CDNs. En cachés muchas
5:55
veces lo que se hace es que se invalidan
5:57
en escritura. Es decir, si yo inserto un
5:59
dato en la base de datos que estaba
6:01
cacheado, directamente lo borro de la
6:03
caché y espero que se cachee de nuevo
6:05
hasta que lo vuelva a escribir. Esto va
6:07
a hacer, por ejemplo, que si yo tengo
6:08
muchas escrituras, la caché
6:10
prácticamente no haga nada y sea
6:12
totalmente innecesaria porque cada vez
6:14
que estoy escribiendo la estoy
6:15
invalidando y se tiene que volver a
6:17
refrescar. Es por esto que hay que tener
6:18
un tradeoff entre escrituras y lecturas.
6:21
Para acabar con el tema de las
6:22
herramientas de Funout, lo que me
6:23
gustaría comentar es también las
6:25
réplicas de lectura de las bases de
6:26
datos. Y es que a veces puede ser
6:28
interesante tener una base de datos para
6:29
escrituras y una base de datos para
6:31
lecturas, para evitar temas de bloqueos,
6:34
para hacer que sea mucho más fácil
6:36
escribir en la base de datos y la
6:38
performance, la capacidad de lectura no
6:41
impacte con la capacidad de escritura.
6:43
Esto lo puedes conseguir con read
6:45
réplicas en SQL o incluso con réplicas
6:48
en Bongo DB. Depende un poco de cada
6:50
frase de datos, ¿vale? Tendrás
6:52
diferentes sistemas en cada una de
6:54
ellas, pero en general es bastante
6:55
probable que puedas implementar una
6:57
copia de lectura y por lo tanto todo lo
6:59
que sean reads vayan a esa réplica y
7:02
todo lo que sean escrituras vayan a la
7:04
réplica principal. Lo único que puede
7:06
ocurrir aquí es que tengas la réplica de
7:08
lectura quizá algunos segundos retrasada
7:12
con respecto a la descritura, porque le
7:14
añades este tiempo de replicación, pero
7:16
en general acostumbran a ser tiempos
7:18
bastante bajos. Y es que no podemos
7:19
olvidar que las escrituras también son
7:21
otro tipo de necesidad que implican
7:24
otras herramientas a la hora de escalar.
7:26
Los sistemas Fanin son sistemas que
7:29
tienen una gran carga de escritura y se
7:31
solucionan con otras cosas. Aquí tenemos
7:33
el problema contrario. Lo que tenemos es
7:34
un montón de usuarios que están
7:36
escribiendo contra nuestros servicios y
7:38
por ende contra nuestra base de datos.
7:40
Podemos encontrarnos con cuellos de
7:42
botella, tanto en el procesamiento de
7:44
los datos, es decir, lo que ingiere
7:46
estas peticiones y lo que hace algún
7:48
tipo de cálculo, como en la base de
7:50
datos a la hora de impactarla con
7:52
escrituras. Obviamente podemos escalar
7:53
horizontalmente los servidores para que
7:55
sean capaces de procesar todos estos
7:57
datos, pero esto lo podemos hacer hasta
7:59
un límite. En muchas ocasiones lo que se
8:01
hace es se colocan colas justo antes de
8:04
lo que serían los procesadores de datos.
8:07
De esta forma se guardan los comandos y
8:09
se van procesando a la misma velocidad.
8:11
Ahora bien, la experiencia de usuario se
8:14
ve afectada y por lo tanto tenemos que
8:15
informar de lo que está ocurriendo en
8:18
cada momento. Ahora es posible que el
8:19
usuario no haga una petición y reciba la
8:21
respuesta al instante, sino que haga la
8:23
petición y tenga que esperarse un tiempo
8:25
hasta que su petición sea procesada y
8:27
por lo tanto reciba un resultado. Esto
8:29
puede ocurrir, por ejemplo, si pensamos
8:31
en generadores de imágenes con IA.
8:33
Podemos tener nuestros workers, nuestros
8:35
servidores que se encargan de recibir el
8:37
prompt y generar la imagen, pero
8:39
imagínate que tienes millones y millones
8:40
y millones de usuarios pidiendo generar
8:42
imágenes a la vez. Enseguida podrías
8:44
acabar sobrepasando toda la capacidad de
8:46
trabajo que tienes disponible. Aquí pues
8:48
lo que podréis hacer es añadir las
8:50
colas, vas encolando los promps y al
8:52
usuario le muestras un loading, alguna
8:55
forma de interacción que dice, estamos
8:57
procesando la solicitud estado actual en
8:59
cola. Una vez la petición sale de la
9:01
cola, se procesa y termina, el usuario
9:04
recibe algún tipo de notificación y le
9:06
dices, "Oye, mira, tu proceso con ID tal
9:10
ya ha terminado. Aquí tienes la imagen."
9:11
Y de esta forma consigues incluso
9:13
controlar la escalabilidad porque puedes
9:16
controlar la velocidad de consumo de la
9:18
cola. ¿Cómo? con [música] el número de
9:20
workers que tienes disponibles. Cuantos
9:23
más workers tienes procesando
9:25
peticiones, más rápido vas a consumir la
9:27
cola. Por lo tanto, puedes ir jugando
9:29
para ajustar a tus necesidades. Pero es
9:31
que incluso, aunque entiendas cómo
9:33
funcionan los patrones de acceso de tus
9:35
sistemas, [música]
9:35
todavía faltan algunas cosas para acabar
9:37
de pensar como un buen ingeniero.
9:39
Necesitas poder entender cómo se
9:41
comporta el sistema una vez lo pones al
9:43
límite. Quédate porque te voy a dar
9:45
algunas herramientas que puedes utilizar
9:46
para que cuando tu sistema se encuentre
9:48
en límite no termine cayendo, porque al
9:50
final nuestro objetivo es construir
9:52
servicios [música]
9:53
resilientes, productos que aunque
9:55
intentes machacarlos a muerte de
9:57
tráfico, acaben de alguna forma
9:59
sobreviviendo. Que no tengas tú que
10:01
entrar manualmente al servidor y volver
10:02
a levantarlo desde cero, que de alguna
10:04
forma el usuario [música] tenga algún
10:06
tipo de feedback medianamente útil que
10:09
pueda entender qué es lo que está
10:10
sucediendo y no se le quede directamente
10:12
a la pantalla en [música] blanco. Y la
10:13
primera herramienta que te quiero dar
10:14
para poder construir sistemas
10:16
resilientes es la configuración correcta
10:19
de timeouts. En sistemas grandes te
10:21
puede llegar a pasar de que hagas una
10:23
petición a otro servicio y te quedes
10:25
esperando la respuesta. Pero, ¿qué
10:26
ocurre si el otro servicio está caído y
10:28
no tienes una configuración de time out?
10:30
Y es que el servicio que ha hecho la
10:32
petición se puede llegar a quedar
10:33
bloqueado esperando una respuesta que
10:35
nunca va a llegar y por lo tanto ya
10:37
tienes también otro servicio que está
10:39
roto. Tener time out significa
10:41
directamente que si la respuesta no
10:42
llega en x tiempo, dar un error y
10:45
intentar resolverlo de la forma más
10:47
grácil posible. pues por ejemplo
10:48
informando al usuario de que oye, ha
10:50
ocurrido un error, parece que haya algo
10:52
caído, estamos trabajando en ello y
10:54
lanzar una alerta a algún sistema de
10:56
monitoreo, por ejemplo. Esto es mucho
10:57
mejor que no que directamente se quede
10:59
todo bloqueado y el usuario se quede
11:01
esperando sin ver nada. Tener timeouts
11:03
te permite también luego implementar una
11:05
serie de mejoras, como, por ejemplo, los
11:07
rompedores de circuitos o circuit
11:09
breakers. Y es que puede llegar a pasar
11:11
que si tienes un servicio caído y estás
11:13
haciéndole peticiones y todo el rato te
11:15
dan time out, llega un momento donde no
11:17
tenga sentido seguir haciendo peticiones
11:19
a ese servicio. Quizá ese servicio que
11:21
está caído está caído porque se ha
11:23
quedado sin memoria RAM y por lo tanto
11:25
que estés todo el rato probando
11:27
peticiones no le va a ayudar a mejorar.
11:30
Quizá lo que necesita es directamente un
11:32
respiro. Para
11:32
[música]
11:33
ello existen los circuit breakers. Este
11:35
tipo de sistemas lo que hacen es que si
11:36
detectan que hay un número x de
11:38
peticiones [música] que han fallado
11:40
hacia un posible servidor, lo que van a
11:42
hacer es dejar de hacer estas llamadas.
11:44
Van a cortocircuitar el sist. De esta
11:46
forma llegará un punto en el que el
11:48
servicio caído dejará de recibir
11:50
llamadas y quizá puedes meterte a
11:52
debuguear de una forma mucho más
11:53
sencilla porque no tienes tantas
11:54
peticiones fallando. Vas a ver si le
11:56
bajan los recursos y por lo tanto
11:58
resucita. en general te va a dar más
12:00
oportunidades y más facilidades a la
12:03
hora de entender qué ha pasado y por qué
12:05
está fallando. Y también me gustaría
12:07
hacer un apunte a nivel de técnicas y es
12:09
que hemos comentado antes el tema de fan
12:11
in fanout. No tenéis que pensar en el
12:13
sistema completo como que todo es fanin
12:16
o todo es fanout. Cada característica
12:18
del producto va a tener unas condiciones
12:20
distintas. Por ejemplo, Netflix es
12:22
[música] de lectura muy alta a la hora
12:25
de distribuir contenido, pues va a
12:27
utilizar CDNs, va a utilizar un montón
12:29
de técnicas de este estilo para poder
12:31
dar todo el capítulo a un montón de
12:34
usuarios a la vez. Ahora bien, también
12:36
es posible que sea alto en escritura,
12:38
por ejemplo, si quiere guardarse cuando
12:41
los usuarios ya están viendo los
12:42
capítulos. Cada vez que un usuario
12:44
entra, pues quizás se va guardando cuál
12:46
es la parte del capítulo que más se ve,
12:48
va guardando la actividad que hace
12:50
Netflix. Esto implica que por cada
12:51
usuario se están recibiendo un montón de
12:54
datos. Es posible que todas estas
12:56
escrituras [música] no las tenga
12:57
directamente el servidor principal, sino
12:59
que es posible que tenga una serie de
13:00
colas o una serie de herramientas
13:02
intermedias para poder controlar
13:05
exactamente qué necesidades de
13:07
servidores necesitan. Es por ello que
13:08
tenéis que pensar en estas capacidades
13:10
de escalabilidad de forma independiente
13:13
por cada característica del producto. Y
13:15
si con todo esto no tienes suficiente y
13:17
todavía quieres seguir ampliando tus
13:18
capacidades como arquitecto de software,
13:20
te recomiendo ver este vídeo. En este
13:22
vídeo te comparto diferentes
13:23
arquitecturas de backend, desde
13:25
Monolito, pasando por microservicios y
13:27
hasta CQRS. Y es que si tienes esa
13:29
información, vas a tener más
13:30
herramientas para poder solucionar
13:32
diferentes problemas [música] que te
13:33
vayas encontrando. Si este vídeo te
13:34
pareció interesante, por favor,
13:35
suscríbete y déjame un buen like y nos
13:37
vemos en el siguiente con más
13:39
informática. [música] Hasta otra. Yeah.