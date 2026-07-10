0:00
Imagina que estás construyendo una app,
0:02
empiezas guardando datos como puedes,
0:04
pues un fichero aquí, un fichero allá y
0:06
en verdad parece que todo funciona
0:07
correctamente, pero de repente la
0:09
aplicación crece, empiezas a tener
0:11
muchos más datos, muchísimos más
0:13
usuarios y es aquí donde todo se empieza
0:15
a volver mucho más lento, mucho más
0:18
caótico y mucho más difícil de mantener.
0:20
Ahí es precisamente donde entran las
0:23
bases de datos y en este vídeo vas a
0:25
entender realmente qué son, por qué
0:27
existen diferentes tipologías, qué
0:29
técnicas puedes utilizar en tu día a día
0:31
para diseñar mejores datos y lo más
0:33
importante, cuando utilizar cada una en
0:36
el momento adecuado. Una base de datos
0:37
no deja de ser un programa, un programa
0:40
diseñado para poder almacenar y
0:42
gestionar información a gran escala.
0:43
congestionarla. Me refiero a que por un
0:45
lado te permite guardar y almacenar esta
0:47
información y por otro lado te permite
0:49
consultarla. Es decir, tú como
0:51
desarrollador puedes pedirle a la base
0:53
de datos que te devuelva información
0:54
cumpliendo ciertos criterios. En función
0:57
de qué tan flexible es este programa de
0:59
base de datos para que tú puedas hacer
1:01
peticiones, para que tú puedas consultar
1:03
los datos. Digamos que existen
1:04
diferentes tipologías porque al final no
1:07
todas las aplicaciones necesitan lo
1:09
mismo. Algunas necesitan poder
1:11
representar la información con
1:12
relaciones, poder vincular diferentes
1:15
datos. Otras aplicaciones necesitan una
1:17
gran velocidad de consulta. Necesitan
1:19
que cuando tú le preguntas, "Oye, dame
1:21
este dato o este conjunto de datos, te
1:23
lo devuelva rapidísimo en milisegundos."
1:26
Otras aplicaciones quieren favorecer la
1:28
flexibilidad, que los datos puedan ir
1:30
evolucionando sin que tengas que hacer
1:32
nada por detrás. Como ves, como las
1:34
aplicaciones tienen diferentes
1:36
necesidades, también aparecen diferentes
1:38
tipologías de bases de datos que se
1:40
adecúan a cada uno de estos casos de
1:42
uso. Por lo tanto, elegir el tipo
1:44
correcto de base de datos para tu caso
1:46
de uso es una decisión crítica que si
1:49
tomas de forma errónea te puede
1:50
complicar todo el desarrollo desde ahora
1:53
hasta el futuro. Es por ello que es
1:54
importante conocer exactamente qué
1:56
ofrece cada una de ellas. Vamos a verlo.
1:58
La primera tipología de base de datos
2:00
que vamos a ver es la más conocida, la
2:02
que seguramente si has empezado en el
2:04
mundo del desarrollo recientemente, pues
2:06
hayas empezado ya también a aprender,
2:08
que son las bases de datos relacionales.
2:10
El modelo relacional de bases de datos
2:12
fue creado por Edgar Cott, un matemático
2:15
y científico de la computación muy
2:17
famoso porque con su creación generó una
2:19
industria multimillonaria, la industria
2:22
de las bases de datos SQL. Fue allá por
2:24
los años 70 cuando COT en California
2:26
publicó el primer paper en el que se
2:28
describía literalmente cómo iban a
2:30
funcionar las bases de datos
2:32
relacionales. Esta tipología de bases de
2:34
datos organiza la información de una
2:35
forma muy estructurada, es decir, vamos
2:37
a organizar la información en lo que se
2:40
conocen como tablas. Cada tabla tiene
2:42
una estructura, tiene una serie de
2:44
elementos que van a formar parte de la
2:46
organización de ese dato. Es decir,
2:48
podemos definir una tabla de usuarios
2:51
con diferentes columnas, por ejemplo, el
2:53
nombre y el correo electrónico. De esta
2:55
forma definimos que la entidad de un
2:58
usuario está formada por estas
3:00
características. Las columnas serían las
3:02
características y cada una de las filas
3:04
de esta tabla sería cada una de las
3:06
entidades. Ahora bien, la potencia de
3:08
las bases de datos relacionales es
3:10
precisamente la capacidad de modelar
3:13
relaciones. Si nosotros tenemos que un
3:15
usuario puede tener una dirección donde
3:17
vive, lo que podemos hacer es crear otra
3:19
tabla con otras características que
3:21
podemos llamar direcciones y de alguna
3:23
forma enlazar las dos tablas para que
3:26
relacionemos que un usuario tiene una
3:28
dirección. Este sería el fundamento
3:31
clave de esta tipología de bases de
3:33
datos. Se llaman relacionales
3:35
precisamente porque modelan relaciones.
3:37
Insisto, no son bases de datos
3:39
relacionales porque utilicen SQL. Ahora
3:41
vamos a ver qué significa eso. Y es que
3:43
aparte de las bases de datos
3:44
relacionales, tenemos también lo que se
3:46
conoce como bases de datos no SQL, que
3:49
no significa que no utilicen SQL,
3:51
significa que son no solamente SQL, not
3:54
only sequel. Es por ello que quiero
3:56
hacer la distinción de que una base de
3:58
datos se pueda utilizar con SQL no la
4:01
convierte automáticamente en relacional,
4:03
aunque históricamente en la literatura
4:05
veamos que se habla de bases de datos
4:07
SQL y no SQL y pueda dar la apariencia
4:10
de que las bases de datos SQL es
4:12
sinónimo de relacional, no significa
4:14
eso. Entonces, las bases de datos que
4:16
son not only SQL difieren de las bases
4:19
de datos relacionales en el sentido de
4:20
que no se centran directamente en
4:22
modelar relaciones y existen un montón
4:25
de tipologías distintas en esta familia
4:27
de bases de datos. Entre ellas tenemos,
4:29
por ejemplo, las bases de datos
4:31
documentales. Estas bases de datos, en
4:33
vez de organizar la información en
4:35
tablas, columnas y relaciones, la
4:37
definen en formatos similares a Jason.
4:39
El ejemplo más común de estas bases de
4:41
datos sería deb. Si teníamos en
4:43
las relacionales que las tablas tenían
4:45
una estructura muy cerrada y teníamos
4:47
que definir las columnas de cada
4:49
entidad, en las documentales en general
4:52
no tenemos un modelo tan cerrado. Dentro
4:54
de una misma colección de datos podemos
4:56
tener usuarios con nombre, usuarios sin
4:58
nombre, usuarios con edad, usuarios con
5:00
mail y en definitiva tenemos mucha más
5:03
flexibilidad. Es por ello que DB
5:05
se hizo tan famoso para el desarrollo de
5:07
startups. Como el modelo de negocio
5:08
todavía no está definido, pues agradece
5:11
tener cierta flexibilidad y no tener que
5:13
estar haciendo cambios en la estructura
5:15
de tu base de datos. Simplemente
5:16
insertas y te olvidas. Otra tipología
5:18
que nosotros tenemos de bases de datos
5:20
no SQL serían las bases de datos clave
5:22
valor que brillan por su velocidad
5:24
siempre y cuando diseñemos bien el
5:26
modelo de datos. Las bases de datos
5:28
clave valor podrían ser parecidas a
5:30
cuando hablamos de una estructura de
5:32
datos conocida como hash. En los hashes
5:34
tú defines una clave para luego obtener
5:36
el dato de una forma muy rápida. Lo
5:38
mismo ocurre con las bases de datos
5:40
clave valor. Tú te modelas la
5:41
información para que simplemente
5:43
conociendo la clave puedas ir
5:45
directamente a obtener ese dato.
5:47
Ejemplos de datos clave valor podrían
5:49
ser, por ejemplo, redis o dynamo deb.
5:51
Ahora bien, este tipo de bases de datos,
5:53
si bien es cierto que son muy rápidas,
5:55
requieren de un conocimiento muy
5:56
profundo de cómo funcionan para poder
5:59
aprovecharse de esa velocidad. Es decir,
6:01
si modelas mal las claves que vas a
6:03
utilizar, vas a obtener una capacidad
6:05
muy limitada a la hora de hacer
6:07
peticiones y hacer consultas. Luego
6:09
también tenemos bases de datos
6:11
especializadas en grafos. Imagínate que
6:13
quieres modelar una red social en la que
6:16
yo decido si soy o no amigo de una
6:18
persona y quiero poder montarme un grafo
6:20
para ver exactamente las relaciones de
6:22
amistad. Esto lo podría montar
6:23
perfectamente con una base de datos
6:25
relacional. Al final están pensadas para
6:28
relaciones. Ahora bien, quizá quiero
6:30
poder ejecutar algunos algoritmos
6:32
clásicos de grafos sobre mi sistema de
6:35
datos de forma nativa, por ejemplo, para
6:37
obtener el camino entre un usuario y
6:39
otro. Existen bases de datos que me
6:41
permiten ejecutar estos algoritmos de
6:43
grafos directamente sobre mi conjunto de
6:47
información. Un ejemplo de base de datos
6:49
de tipo grafo podría ser Neo forj, que
6:51
como hemos comentado, implementa de
6:53
forma nativa los algoritmos de grafos
6:55
más conocidos, por ejemplo, búsqueda de
6:57
caminos o búsqueda de árboles. Como ves,
7:00
existen un montón de tipologías
7:01
distintas de bases de datos, algunas
7:03
enfocadas más en la consistencia y en la
7:06
estructura de los datos y otras
7:08
enfocadas más en la flexibilidad o en el
7:10
uso específico que tú le quieras dar.
7:12
Por lo tanto, y el mensaje que quiero
7:13
transmitir es, no existe una base de
7:15
datos que sea la mejor en todo. Existen
7:18
bases de datos especializadas, algunas
7:20
más generalistas que otras, que te
7:22
permiten adecuarte al problema
7:24
específico que tú quieres solucionar.
7:25
Pero ahora mismo podrías pensar que la
7:27
regla de oro al momento de escoger una
7:29
base de datos es escoger relacional con
7:31
SQL si quieres una estructura fija o
7:34
bien escoger no SQL si quieres
7:36
flexibilidad. Pero realmente eso no deja
7:38
de ser una simplificación. En el mundo
7:40
real, aunque tengas un solo producto,
7:42
vas a tener un montón de problemas
7:44
diferentes. Es por ello que insisto en
7:46
la elección adecuada de la base de datos
7:48
para cada problema. Y es que no pasa
7:50
nada si tienes un producto con
7:52
diferentes bases de datos. No es el
7:53
mismo problema vincular métodos de pago
7:55
con usuarios que hacer un sistema de
7:58
recomendación de series que te pueden
7:59
interesar. Por ejemplo, Netflix utiliza
8:02
a Casandra, que es una base de datos no
8:04
SQL, para gestionar y guardar la
8:06
actividad de los usuarios y por lo tanto
8:09
lo utiliza también para gestionar las
8:11
recomendaciones. Ahora bien, cuando
8:13
requiere de cierta rigidez y definir las
8:15
relaciones de una manera mucho más
8:17
óptima, también utiliza MySQL. Otro
8:19
ejemplo podría ser Uber. Uber utiliza
8:22
redis, que sería una base de datos clave
8:24
valor para todo el sistema de caché y
8:27
información en tiempo real, pero luego
8:28
también utiliza PostGre SQL para definir
8:31
algunos modelos que también necesitan
8:33
relaciones. Como ves, grandes empresas y
8:36
grandes problemas también requieren de
8:38
escoger diferentes bases de datos para
8:40
cada parte específica. Una vez tienes
8:42
escogida la base de datos, también
8:44
tienes que entender cómo puedes
8:46
escalarla. Es decir, cada una de estas
8:48
tipologías de base de datos tiene
8:49
diferentes necesidades y limitaciones a
8:52
la hora de darte más escalabilidad. Con
8:54
escalabilidad me refiero a, por ejemplo,
8:56
¿qué ocurre cuando tienes una tabla o
8:58
una colección con 1000 documentos, 1000
9:00
entidades y luego porque tu negocio ha
9:03
tenido éxito porque cada vez tienes más
9:04
usuarios, acabas teniendo en vez de 1000
9:06
millones de datos. Obviamente eso tiene
9:09
un efecto a la hora de leer los datos
9:11
con velocidad y ciertas características
9:13
que quizás no habías tenido en cuenta al
9:15
inicio porque no afectaban a ese volumen
9:17
empiezan a notarse. Diferentes maneras
9:19
de escalar una base de datos dependen
9:21
muchísimo de la tecnología, pero podemos
9:23
resumirlo en dos grandes tipologías.
9:25
Podemos escalar de manera vertical o
9:28
podemos escalar de manera horizontal. El
9:30
escalado vertical es directamente darle
9:32
más recursos a la máquina que está
9:35
ejecutando tu base de datos. Esto para
9:37
bases de datos relacionales a veces
9:39
puede ser necesario porque su capacidad
9:41
de escalado horizontal es limitada. Por
9:43
lo tanto, necesitas poderle dar más CPU,
9:46
poderle dar más RAM a la máquina para
9:48
que pueda ejecutar las consultas de una
9:49
manera más eficiente. Ahora bien, en
9:51
otras bases de datos que no tienen una
9:53
estructura tan rígida, por ejemplo, las
9:55
documentales o las clave valor, puedes
9:57
hacer de una forma más simple lo que se
9:58
conoce como escalado horizontal, que es
10:00
en vez de hacer crecer una máquina, lo
10:02
que haces es generar más. te generas un
10:05
ejército de servidores con la
10:07
información de la base de datos
10:09
repartida entre ellos para que puedan
10:11
asumir mucha más carga. Esto lo puedes
10:13
hacer en bases de datos con menos
10:15
estructura porque te permiten de una
10:17
forma más sencilla implementar el
10:19
concepto de sharding. El sharding es
10:21
básicamente seleccionar a qué servidor
10:24
tiene que ir cierto dato en función de
10:26
ciertas reglas. Por ejemplo, si yo tengo
10:28
usuarios de Estados Unidos, de
10:30
Latinoamérica y de España, podría
10:32
decidir que en un servidor se guardan
10:34
los de España, en otro los de
10:36
Latinoamérica y en otro los de Estados
10:38
Unidos. De esta forma puedo ir escalando
10:40
la información porque tengo servidores
10:42
dedicados a cada uno de estos usuarios.
10:45
Separar por región sería una separación
10:47
muy sencilla para que se entienda el
10:49
concepto de sharding, pero en
10:50
aplicaciones más complejas, yo puedo
10:52
definirme diferentes reglas de sharding
10:54
y por lo tanto distribuir la información
10:57
de una manera mucho más repartida. Lo
10:59
que queremos es que la información se
11:00
reparta de una forma supernivelada entre
11:02
diferentes servidores para que no haya
11:04
un servidor que está sirviendo un montón
11:06
de información y un servidor que tenemos
11:08
directamente sin uso. Es por ello que
11:10
escoger bases de datos y definir muy
11:13
bien cómo queremos hacer este
11:15
repartimiento es algo muy importante.
11:17
Como ves, la elección de la base de
11:19
datos no solamente me limita el uso que
11:21
yo le puedo dar, sino también la
11:22
facilidad o la forma en la que yo puedo
11:24
escalarlas. Por lo tanto, hay bases de
11:27
datos que se adaptan mejor a los
11:29
sistemas distribuidos y bases de datos
11:31
que se adaptan peor. Todo ello viene
11:33
dado por el teorema Cap. El teorema CAP,
11:35
para entenderlo, es como decir que algo
11:37
no puede ser bueno, bonito y barato a la
11:39
vez. Si es bueno y bonito, no puede ser
11:41
barato. Si es bueno y barato, no puede
11:43
ser bonito. Y si es barato y bonito, no
11:45
puede ser bueno. Con el teorema CAP pasa
11:47
exactamente lo mismo, pero en vez de
11:48
bueno, bonito y barato, tenemos
11:50
consistente, disponible y tolerante a
11:52
particiones. Tolerante a particiones es
11:54
lo que hemos visto de los sharts, es
11:56
decir, ¿qué capacidad tiene mi base de
11:57
datos de poder guardar diferentes
11:59
particiones de la información en
12:01
diferentes servidores. consistencia
12:03
significaría que cada vez que yo leo
12:06
información de la base de datos, obtengo
12:07
el dato más reciente. Y disponibilidad
12:10
significaría que cuando yo quiero
12:12
consultar la base de datos, la base de
12:14
datos no está caída, es capaz de darme
12:16
una respuesta. No puedo tener los tres a
12:18
la vez, tengo que seleccionar dos y
12:20
pierdo el tercero. Como ves, las bases
12:22
de datos relacionales se centran sobre
12:24
todo en la consistencia. Es decir, como
12:26
hemos definido estas relaciones, no
12:28
queremos, por ejemplo, que se queden
12:30
usuarios sin dirección. Queremos todo el
12:32
rato que los datos tengan una cierta
12:34
lógica, las relaciones sean de cumplir.
12:36
Por lo tanto, en el teorema CAP estamos
12:38
prefiriendo la consistencia y en este
12:41
caso concreto separando o dejando de
12:43
tener la parte de alta disponibilidad o
12:45
incluso la tolerancia a las particiones.
12:48
Los principios ACI ya los vimos también
12:50
en otro vídeo que te dejo por aquí abajo
12:51
en la descripción para que le puedas
12:53
echar un ojo. En cambio, en los sistemas
12:55
más pensados para sistemas distribuidos,
12:57
como podrían ser bases de datos no SQL,
12:59
siempre daremos también preferencia a la
13:02
partición y a la disponibilidad, dando
13:04
como resultado unos principios
13:06
diferentes a los principios ASIT, que
13:08
son los principios base. Base significa
13:11
básicamente disponible del inglés
13:12
basically available, serían la B y la A,
13:15
la S de soft state o está doblando y la
13:18
E de eventual consistency o consistencia
13:21
eventual. La BA significaría que nuestra
13:24
base de datos siempre nos va a
13:25
responder. Es la parte de disponibilidad
13:28
del teorema Cup, aunque el dato sea
13:30
antiguo, pero siempre lo vamos a
13:31
obtener. Por ejemplo, cuando nosotros
13:33
vemos una foto antigua en Instagram,
13:35
aunque nuestro amigo la haya cambiado
13:37
hace 10 minutos. Luego también tenemos
13:39
el estado blando, que significa que el
13:41
estado de los datos puede fluctuar o
13:43
cambiar sin que yo explícitamente lo
13:45
pida. Esto significa que si yo hago un
13:47
cambio en la base de datos, eso puede
13:49
acabar propagando en otros sistemas que
13:51
los datos vayan cambiando a lo largo del
13:53
tiempo. Desde que yo cambio la foto de
13:55
mi perfil de Instagram, pasa un tiempo
13:57
hasta que se va propagando a las
13:59
diferentes partes del sistema y yo acabo
14:01
leyendo desde otro móvil que la foto ha
14:03
cambiado, generando lo que se conoce
14:05
como la e, la consistencia eventual. Si
14:08
nosotros en relacional teníamos alta
14:10
consistencia gracias a los principios
14:12
ASIT, en los principios base tenemos lo
14:14
que se conoce como eventual consistency.
14:16
Al final vas a ver el dato correcto,
14:18
pero va a haber un tiempo en el que no
14:19
lo vas a hacer. Con todo esto ya tienes
14:21
ciertas herramientas para poder escoger
14:23
de la mejor manera posible una
14:24
tecnología de bases de datos adecuada a
14:27
tu problema. Pero independientemente de
14:28
lo que escojas, tienes que entender cómo
14:30
los datos se organizan a nivel interno
14:32
para poderlo aprovechar al máximo. Ahora
14:34
te quiero contar algunas técnicas y
14:36
algunas herramientas que puedes utilizar
14:38
a partir de hoy para que a medida que
14:40
vas teniendo más información, tu base de
14:42
datos no se vuelva una tortuga. Lo
14:44
primero que te quiero comentar es el uso
14:46
de índices. Los índices en bases de
14:48
datos son estructuras que te permiten
14:50
acelerar las peticiones. Imagínate que
14:53
tienes un listado de 1 millón de
14:55
usuarios en tu base de datos y le lanzas
14:57
una petición para obtener el usuario con
14:59
el ID un. Lo peor que puede pasar en ese
15:01
momento es que para encontrar ese
15:03
usuario, la base de datos tenga que
15:05
recorrerse todos los ítems de la tabla o
15:08
de la colección para obtener el dato
15:10
adecuado. Eso lo que hace es que a
15:11
medida que vas teniendo más información,
15:13
tus consultas se vuelvan cada vez más
15:15
lentas, precisamente porque no estás
15:17
usando los índices. ¿Verdad que cuando
15:18
quieres buscar una página específica de
15:20
un libro, no vas leyendo página a página
15:23
buscando el resultado, sino que te vas
15:25
directamente al índice y seleccionas la
15:28
página a la que quieres ir? Pues con los
15:30
índices pasa exactamente lo mismo, pero
15:32
lo haces en bases de datos. La forma en
15:34
la que los índices se implementan a
15:36
nivel interno generalmente es con
15:37
árboles, por ejemplo, vitrz. Estas
15:40
estructuras de árbol se guardarían
15:42
aparte, es decir, a un lado de la base
15:44
de datos normal. Es decir, si yo me creo
15:46
un índice sobre la tabla de usuarios
15:48
para poder hacer consultas por ID, se me
15:51
va a generar uno de estos árboles
15:52
utilizando el ID como clave. Por lo
15:54
tanto, cuando yo quiera hacer una
15:55
consulta para obtener el usuario por ID,
15:58
en vez de recorrerme todo el listado de
16:00
usuarios, lo que va a hacer la base de
16:02
datos es irse a este árbol, recorrerlo
16:05
de forma estructurada y ordenada y
16:07
llegar directamente a los datos, a la
16:10
información que tiene que consultar, por
16:11
lo tanto, acelerando enormemente las
16:14
consultas. Ahora bien, no es oro todo lo
16:16
que reluce. Cuando yo estoy utilizando
16:17
índices, tengo que ir con cuidado porque
16:19
los índices hacen que escribir nueva
16:22
información sea más lenta. Básicamente
16:24
porque tengo que escribir información en
16:26
la tabla original y también tengo que
16:28
construir o regenerar el índice para que
16:31
ahora tenga acceso al nuevo dato. Es por
16:33
ello que los índices se recomiendan en
16:35
tablas que tienen un alto volumen de
16:37
lecturas, pero tienes que ir con cautela
16:39
en tablas que tienen un gran volumen de
16:41
escrituras, porque las escrituras van a
16:43
ser un poquito más lentas. Otro concepto
16:45
importante a conocer a la hora de
16:47
modelar o definir cómo guardamos
16:49
nosotros la información es el concepto
16:51
de normalización y desnormalización. La
16:54
normalización de una base de datos es
16:56
hacer una serie de técnicas para
16:58
organizar la información de forma que la
17:00
consistencia sea mucho más fácil de
17:03
mantener. Estas técnicas o estos pasos
17:05
para hacer la normalización es lo que se
17:07
conocen como normas formales y fueron
17:09
inventadas y definidas también por Edgar
17:12
Cott. Concretamente hay tres de estas
17:14
normas formales. La primera norma formal
17:16
te dice que tienes que eliminar datos
17:19
repetidos. La segunda, que tienes que
17:21
separar dependencias parciales y la
17:23
tercera, que tienes que separar
17:25
dependencias transitivas. Esto suena muy
17:27
teórico y muy raro. Yo creo que la mejor
17:30
forma de entenderlo es con un ejemplo.
17:32
Por ejemplo, imagínate que nosotros
17:33
definimos una tabla de datos relacional
17:35
con esta información. Tenemos un listado
17:38
de pedidos donde tenemos un ID, un
17:40
cliente, el email del cliente, los
17:42
productos que ha comprado y el total. A
17:44
priori puede apecer una tabla
17:46
suficiente, ¿no? Al final cumple lo que
17:48
necesitamos y la podemos consultar
17:50
directamente por pedido ID. Pero hay una
17:52
serie de problemas evidentes. El
17:53
primero, tenemos que la columna de
17:55
productos tiene una lista, es decir, no
17:57
es atómica, no define cada producto de
17:59
forma independiente. Luego tenemos
18:01
repetición de información. Tenemos que
18:03
los pedidos de Alice están todo el rato
18:06
duplicando la información del nombre y
18:08
del email. Es decir, si por lo que fuera
18:10
Alice cambiara de correo electrónico,
18:12
tendríamos que cambiar todas las
18:14
entradas en todos los pedidos para
18:16
actualizar a la nueva información. Por
18:18
lo tanto, teniendo un riesgo muy alto de
18:20
tener los datos inconsistentes, lo
18:22
primero que haríamos entonces sería
18:24
implementar la primera forma normal. En
18:27
este caso, la primera forma normal, como
18:29
hemos dicho, nos elimina el uso de
18:31
listas, es decir, tenemos que atacar la
18:33
columna de productos haciendo algo como
18:35
esto. Generaríamos una entrada, una
18:37
fila, por cada producto que nosotros
18:39
hemos comprado. En vez de tener una fila
18:41
con tres productos, tendríamos tres
18:43
filas con un producto, eso sí, con el
18:45
mismo ID de pedido. Fijaros en el
18:46
detalle, que ahora hemos definido la
18:48
clave como el conjunto de pedido y
18:51
producto. Ahora bien, todavía tenemos
18:53
información duplicada. Para daros cuenta
18:54
que aún tenemos el cliente de Alice
18:56
ahora incluso duplicado más veces. Aquí
18:59
es donde entraría la segunda forma
19:01
normal que se construye siempre encima
19:03
de la primera forma normal, o sea,
19:05
siempre se tienen que aplicar en orden.
19:06
En esta forma habíamos dicho que
19:07
teníamos que eliminar las dependencias
19:10
parciales. ¿Qué significa esto? Pues
19:11
básicamente una dependencia parcial
19:13
significa mirar cada una de las columnas
19:16
y ver de qué parte de las claves
19:18
depende. En este caso, nosotros lo que
19:19
habíamos hecho para cumplir la primera
19:21
forma normal era hacer que pedido ID y
19:24
producto fuera una clave compuesta. Es
19:27
decir, es lo que nos define de forma
19:28
única un elemento. Ahora bien, tenemos
19:30
ciertas columnas que dependen solo de
19:33
una parte de esta clave. Por ejemplo, el
19:35
cliente no depende del producto, depende
19:37
del pedido. Esto es la prueba de que
19:39
estamos incumpliendo la segunda forma
19:41
normal y lo que tenemos que hacer es
19:43
eliminar o reformalizar la información
19:47
para que no exista esta dependencia.
19:49
Para cumplirlo, lo que podemos hacer es
19:50
generar tres tablas distintas. Por un
19:52
lado, tendremos la tabla de pedidos con
19:55
el pedido ID, el cliente y el email de
19:58
este cliente y vamos a generar otra
20:00
tabla de productos. En este caso
20:02
tendremos pues que el producto,
20:03
tendremos portátil, ratón, teclado y el
20:06
precio del producto. Fijaros que hemos
20:07
separado lo que es el pedido del
20:10
producto. Hemos separado las dos claves
20:12
que teníamos compuestas. ¿Cómo las vamos
20:13
a enlazar ahora? Con una tercera tabla,
20:16
que es, por ejemplo, las líneas del
20:17
pedido. En este caso tenemos que el
20:19
pedido 1001 tiene incluido el producto
20:23
portátil y que el pedido 1002 tiene
20:25
incluido el producto móvil. Fijaros que
20:27
ahora estaríamos en la segunda forma
20:29
normal. Ya no tenemos ningún caso en el
20:32
que tenemos atributos de nuestra entidad
20:34
que dependen únicamente de una parte de
20:36
la clave. Ahora bien, es cierto que
20:38
todavía tenemos ciertas repeticiones, en
20:41
este caso de los clientes. Esto es lo
20:43
que se conoce como una relación
20:45
transitiva. Si miramos la tabla de
20:47
pedidos en la segunda forma normal, lo
20:49
que tenemos es que el email del cliente
20:51
depende transitivamente del ID del
20:54
pedido. Es decir, si el cliente cambia
20:56
su correo, tenemos que irnos a los
20:57
pedidos para actualizarlos. es una
20:59
dependencia transitiva. La tercera forma
21:02
normal busca eliminar esto directamente,
21:04
creando, por lo tanto, una tabla de
21:06
clientes. Teniendo, por lo tanto, una
21:08
tabla de clientes, nosotros tenemos
21:09
centralizada la información de nombre y
21:12
correo electrónico y en la parte de
21:14
pedidos directamente añadimos una
21:16
relación entre el pedido ID y el
21:18
cliente, llegando por lo tanto a una
21:19
base de datos totalmente normalizada,
21:22
sin repeticiones de información y con
21:24
una facilidad de consistencia mucho más
21:26
alta. Este proceso de pasar por las
21:28
diferentes formas normales se conoce
21:30
como normalización de la base de datos y
21:33
es un proceso superútil para diseñar
21:36
correctamente bases de datos
21:37
relacionales. Ahora bien, hay
21:39
situaciones fuera del mundo relacional
21:42
en el que lo que quieres es totalmente
21:44
lo contrario. Como no tienes como
21:45
concepto la parte de relaciones, hay
21:48
situaciones en no SQL donde la clave es
21:51
desnormalizar. Por ejemplo, en Dynamo DB
21:53
es a veces preferible tener datos
21:56
repetidos, desnormalizados, para poder
21:58
hacer querer de una manera mucho más
22:00
rápida. Si quieres profundizar en todos
22:01
estos conceptos y en entender
22:03
exactamente cómo modelar información de
22:05
manera correcta, te comparto por aquí el
22:07
libro Fundamentals of database Design,
22:09
un libro que se utiliza en un montón de
22:11
cursos y universidades para explicar
22:12
todos estos conceptos más avanzados de
22:14
bases de datos. Por lo tanto, ahora ya
22:16
entiendes cómo funcionan por dentro las
22:18
diferentes bases de datos, los índices y
22:20
cómo diseñar buenos modelos de formas
22:22
normales, pero realmente para poder
22:24
construir sistemas robustos necesitas
22:26
también cambiar tu mentalidad. Y eso es
22:28
exactamente lo que te voy a explicar
22:30
ahora. Tal como ves, durante este vídeo
22:32
no he entrado en mucho detalle sobre
22:34
cómo escribir SQL o sobre cómo hacer
22:37
joints sobre bases de datos, es decir,
22:39
de cómo obtener información de varias
22:40
tablas al mismo tiempo, porque al final
22:42
considero que el diseño es mucho más
22:45
importante que la propia tecnología. Hay
22:47
un montón de cursos en internet sobre
22:49
SQL y sobre cómo construir buenas
22:51
queries para consultar información, pero
22:53
contenido sobre cómo seleccionar la base
22:55
de datos adecuada, qué diferencias hay
22:57
entre diferentes modelos y sobre todo
22:59
cómo diseñar formas normales, pues no es
23:01
tan común. Hoy en día el diseño correcto
23:04
de los datos y el cómo nosotros
23:06
utilizamos estas tecnologías es mucho
23:08
más importante que la especificidad.
23:10
Tanto si usas de B como si usas
23:12
dynamo, pues también puedes utilizar
23:14
lenguajes distintos a SQL o incluso a
23:17
veces cosas similares a SQL. Por lo
23:19
tanto, cada forma de hacer queries va a
23:21
depender de la herramienta específica
23:23
que utilices, pero los conceptos básicos
23:25
y los conceptos a alto nivel se
23:27
mantienen constantes independientemente
23:29
de lo que haya por debajo. Por lo tanto,
23:31
como siempre digo, entender el problema
23:33
que estás intentando solucionar para
23:35
tomar las mejores decisiones cada vez
23:37
está siendo más valioso, mucho más
23:39
importante que conocer exactamente cómo
23:41
funcionan diferentes lenguajes o
23:44
diferentes herramientas para hacer
23:45
queries, porque también te digo, eso lo
23:47
puedes encontrar directamente en la
23:48
documentación de cada una de estas bases
23:50
de datos. Te dejaré por aquí abajo en la
23:52
descripción algunos enlaces a las bases
23:54
de datos más típicas de cada una de
23:56
estas metodologías para que puedas
23:58
empezar a juguetear con ellas en caso de
24:00
que te interese. Y también un pequeño
24:01
apunte, siempre ten en cuenta qué
24:03
queries o qué peticiones quieres hacer
24:05
para diseñar la información. Cuanto más
24:07
sencillo tengas el código, cuanto más
24:09
adaptado estés a tu caso de uso
24:11
específico, más fácil va a ser que luego
24:13
puedas escalar. Recordemos siempre que
24:15
la simplicidad es una ventaja
24:17
competitiva. Y si te interesan estos
24:19
vídeos de explicaciones técnicas a alto
24:21
nivel de conceptos que quizás no son tan
24:23
comunes en redes sociales como YouTube,
24:25
te dejo por aquí un vídeo en el que te
24:27
hablo del diseño de sistemas,
24:29
concretamente de qué partes del
24:30
desarrollo backend de la infraestructura
24:32
puedes aprender para realmente saber de
24:35
lo que estás hablando. Si te ha gustado
24:36
el vídeo, por favor, suscríbete y déjame
24:37
un buen like y nos vemos en el siguiente
24:39
con más informática. Hasta otra. M.