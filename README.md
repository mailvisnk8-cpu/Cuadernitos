# Cuadernitos — generador web experimental de tapas 3D

**Abrí la web:** https://mailvisnk8-cpu.github.io/Cuadernitos/

## Uso — solo subís tu imagen
1. Abrí la web y verificá el aviso **“Base original cargada automáticamente”**.
2. Elegí **tu foto o ilustración PNG/JPG/WebP**. **No tenés que subir ningún STL**.
3. Ajustá los colores, el relieve y la definición.
4. Tocá **Generar archivos STL + 3MF**.
5. Descargá el modelo que quieras revisar en Bambu Studio.

## Base maestra incorporada
El archivo exacto `base_rosa(1).stl` que compartiste está integrado como recurso estático de GitHub Pages en `assets/base_rosa_exact.b64`.

El recurso está comprimido SIN pérdida: se almacenan todas las posiciones de vértices, los índices, las normales y los atributos originales. Al cargar la página se reconstruye el STL byte por byte y se verifica su SHA-256:

`d0c98f68e73411b20b275383263ea7c56c8e766b9c61ab5152ef7dc79e65733e`

La base mide **155 × 216 × 1 mm**, contiene **13.056 triángulos** y conserva los agujeros hongo, las curvas y los detalles de la cara inferior. La exportación STL de la base es byte por byte idéntica a la original; en el 3MF se reutilizan sus triángulos.

**La aplicación jamás pide que subas el STL.** Solo es necesario que cargues la foto con la que vas a diseñar.

## Limitaciones conocidas
- Los bordes del **dibujo en relieve** todavía tienen una resolución rasterizada, que estamos mejorando. La base maestra no se rasteriza en la exportación.
- El formato 3MF multipartes es experimental; verificar en Bambu Studio las partes y los extrusores.
- El generador corre del lado del navegador, sin servidor ni almacenamiento de fotografías.
- Requiere navegador moderno compatible con `DecompressionStream('gzip')` y `crypto.subtle` para comprobar la base.
- Funciona con Bambu A1 y AMS Lite para diseños de hasta cuatro colores.
- Proyecto personal, no comercial.

## Antes de imprimir
Abrí el 3MF en Bambu Studio y comprobá los huecos, las alturas, la posición de las piezas, los colores y la vista laminada. Probá primero el encastre de discos con una pieza pequeña.
