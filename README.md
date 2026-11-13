# Cuadernitos · Mi taller 3D personal

Web experimental para generar tapas A5 a partir de ilustraciones planas, sin instalar Python ni enviar tus fotos a un servidor.

## Cómo abrir
Activá **Settings → Pages → Build and deployment → Deploy from a branch → main / (root)** en este repositorio.

Tu enlace debería ser: https://mailvisnk8-cpu.github.io/Cuadernitos/

## Funciones iniciales
- PNG, JPG o WebP.
- De 2 a 4 colores con selección de color de base.
- Tapa de 155 × 216 mm; 8 ranuras abiertas de tipo hongo.
- Garganta de 3,4 mm de ancho hasta 4,8 mm de profundidad; cavidad semicircular de radio 4,8 mm.
- Relieves independientes y grosor de base configurable.
- Descarga de STL por color y 3MF multipartes experimental.

## Cómo usar
1. Abrí la web desde Chrome.
2. Elegí una imagen o usá el dibujo de muestra.
3. Ajustá cantidad de colores, paleta y alturas.
4. Generá los archivos y descargá el 3MF.
5. Abrí en Bambu Studio para **verificar** las partes, asignaciones de AMS, dimensiones y laminado.
6. Si Bambu no detecta bien los extrusores, descargá y ensamblá los STL por color.

### Limitaciones de esta versión
- El 3MF es **experimental**. No está validado físicamente ni contra la versión de Bambu Studio instalada.
- El relieve está rasterizado a 0,5 o 0,25 mm: pueden perderse detalles finos y curvas suaves.
- El sistema de ranuras se modeló independientemente y necesita prueba de encastre con los discos físicos.
- No hay visor 3D todavía; la vista previa es en 2D.
- El sistema no guarda proyectos ni imágenes.

### Privacidad
La aplicación procesa las imágenes en el navegador y no las sube ni las guarda en GitHub. El código fuente del repositorio es público.

Proyecto personal para Bambu A1 + AMS Lite. No se distribuyen modelos de terceros.
