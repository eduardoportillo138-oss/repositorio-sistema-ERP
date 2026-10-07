# Evidencia visual responsive

2026-10-07. Capturas generadas mediante Playwright con API real y MongoDB temporal de QA. Las cuentas y empresas son fixtures ficticios. El dashboard y reportes usan datos reales del fixture; métricas sin datos no se presentan como resultados productivos.

| Vista      | Desktop 1440×1000               | Tablet 900×1100                | Mobile 390×844                 |
| ---------- | ------------------------------- | ------------------------------ | ------------------------------ |
| Login      | [Imagen](login-desktop.png)     | [Imagen](login-tablet.png)     | [Imagen](login-mobile.png)     |
| Dashboard  | [Imagen](dashboard-desktop.png) | [Imagen](dashboard-tablet.png) | [Imagen](dashboard-mobile.png) |
| Usuarios   | [Imagen](users-desktop.png)     | [Imagen](users-tablet.png)     | [Imagen](users-mobile.png)     |
| Formulario | [Imagen](user-form-desktop.png) | [Imagen](user-form-tablet.png) | [Imagen](user-form-mobile.png) |
| Reportes   | [Imagen](reports-desktop.png)    | [Imagen](reports-tablet.png)    | [Imagen](reports-mobile.png)    |

El layout usa scroll interno; una captura de página representa el viewport visible, no todo el dashboard desplegado a la vez. Los tests comprueban overflow horizontal, login, CRUD/roles/modal, disponibilidad, reportes, preferencias, notificaciones y revocación remota.

Estas capturas acreditan navegador Chromium. No acreditan Android/iOS, lector de pantalla ni datos productivos.
