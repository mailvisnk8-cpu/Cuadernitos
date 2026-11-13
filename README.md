# Cuadernitos — generador web experimental de tapas 3D

**Base maestra obligatoria:** el STL exacto `base_rosa(1).stl` que compartiste, sin volver a generar su perímetro ni sus ranuras tipo hongo.

**Abrí la web:** https://mailvisnk8-cpu.github.io/Cuadernitos/

## Primer uso
1. Abrí la web en el navegador.
2. En **Base maestra obligatoria**, seleccioná tu archivo **base_rosa(1).stl** (el que ya tenés).
3. El programa comprobará su SHA-256 y guardará una copia en **IndexedDB**, dentro de ese navegador.
4. Las próximas veces, desde el mismo navegador y perfil, no hará falta volver a elegirlo. Si borrás los datos del sitio o cambiás de dispositivo, sí hay que cargarlo otra vez.
5. Elegí la ilustración, la cantidad de colores, las alturas y generá STL + 3MF.

## Garantía de fidelidad de base
- La geometría **no se calcula a partir de un mapa de píxeles ni de fórmulas paramétricas**.
- La base se carga de los triángulos del STL original, y al descargar los STL separados se conserva el archivo base **byte por byte**.
- La base del 3MF se construye a partir de esas mismas coordenadas de triángulos.
- El STL original está dimensionado aproximadamente en **155 × 216 × 1 mm** y contiene **13.056 triángulos**.
- Contiene también detalles en la cara inferior: **no se elimina ni se redibuja** ninguna parte de ella.
- Solamente se crean los relieves superiores para la imagen; esos relieves sí están sujetos a la resolución de conversión elegida.

SHA-256 de la base oficial:

`d0c98f68e73411b20b275383263ea7c56c8e766b9c61ab5152ef7dc79e65733e`

Si intentás cargar otro STL, la web **no lo sustituye silenciosamente**: informa que no es la base oficial.

## Limitaciones actuales
- Los contornos del **relieve** pueden verse escalonados: falta sustituir el vectorizador de la V1 por una vectorización con contornos suavizados. Esto **no afecta** los contornos y perforaciones de la base maestra.
- El 3MF multipartes es **experimental**. Las partes y extrusores deben revisarse en Bambu Studio.
- Las imágenes no se guardan en servidores. El STL base se conserva localmente en el navegador.
- No es un simulador real de laminado ni un validador de trayectorias de la impresora.
- El proyecto es para uso personal. No comercial.

## Antes de imprimir
1. Abrí el 3MF en Bambu Studio.
2. Comprobá las ocho ranuras, que los relieves estén apoyados sobre la base y la asignación de cuatro colores a los filamentos.
3. Laminá y revisá las capas.
4. Hacé una prueba pequeña de encastre antes de imprimir toda la tapa.

## Notas
Esta app funciona directamente desde GitHub Pages, sin Python, Render ni instalación. El archivo de referencia se guarda en tu computadora mediante IndexedDB; **no** está publicado en el repositorio.
