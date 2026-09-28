# Auditoría de dependencias

Fecha: 2026-09-28. Resultado de npm install seguido de npm audit --json sobre el lockfile actualizado.

| Severidad npm | Cantidad final |
| ------------- | -------------- |
| Critical      | 0              |
| High          | 0              |
| Moderate      | 7              |
| Low           | 0              |

npm audit termina con exit 1 debido a pendientes. El conteo corresponde a paquetes afectados en la cadena, no a siete vulnerabilidades independientes.

## Correcciones

Se retiraron dependencias sin uso y Detox sin harness nativo. Se alinearon React 18.2.0, React Native 0.73.11 y safe-area-context 4.14.1 en los consumidores compartidos para evitar versiones incompatibles.

image-size se fijó a 2.0.4 mediante override. Metro 0.80.12 requiere un parche local: usar imageSize exportada y cargar bytes del asset en vez de pasar una ruta a la nueva API. patch-package aplica patches/metro+0.80.12.patch en postinstall. La prueba asset-compat carga el logo mediante Metro real y verifica 512×512. La solución debe revisarse cuando se migre Metro.

npm audit fix encontró conflictos de peer dependencies. No se forzó una actualización mayor ni se ocultaron dependencias con legacy-peer-deps.

## Pendiente

La cadena incluye react-native, @react-native-community/cli, cli-doctor, cli-hermes, cli-platform-android, cli-platform-ios y fast-xml-parser. El advisory identificado es [GHSA-gh4j-gqv2-49f6](https://github.com/advisories/GHSA-gh4j-gqv2-49f6): XMLBuilder permite inyección de comentarios/CDATA; el rango afectado reportado es menor que 5.7.0.

npm propone una actualización mayor de React Native. Su compatibilidad con Metro, React, módulos nativos, Android/iOS y el parche debe probarse en una migración dedicada. No se acredita que la ruta vulnerable sea explotable en la API ERP; la dependencia instalada sigue afectada y debe corregirse.

Repetir audit con acceso al registry en cada actualización. No asumir que el resultado de esta fecha permanece vigente. El JSON completo local está en logs/npm-audit-final.json ignorado; este documento conserva el resumen sanitizado.
