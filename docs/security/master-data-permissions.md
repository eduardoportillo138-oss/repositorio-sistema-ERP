# Permisos de categorías y unidades

Los permisos nuevos son `categories.view/create/edit/disable` y
`units.view/create/edit/disable`. Los roles existentes no los reciben al
desplegar código. El rol administrador empresarial debe actualizarse mediante
la migración explícita, sin ejecutar bootstrap otra vez.

Después de compilar el backend, identificar el `companyId`, el `roleId` del
administrador y el `actorId` de un usuario activo que pertenezca a ese rol.
El rol debe tener `roles.manage` y `users.view`, y no contener `platform.*`.
Revisar primero el informe:

```powershell
node backend/dist/utils/grant-master-data-permissions.js --dry-run COMPANY_ID ROLE_ID ACTOR_ID
```

Si los IDs y los permisos faltantes son correctos, ejecutar:

```powershell
node backend/dist/utils/grant-master-data-permissions.js --apply COMPANY_ID ROLE_ID ACTOR_ID
```

La operación añade únicamente permisos faltantes de categorías y unidades,
usa una transacción con auditoría y puede repetirse sin duplicar permisos.
No crea usuarios ni modifica contraseñas. Las sesiones ya existentes consultan
el rol en cada petición, por lo que los permisos nuevos quedan disponibles sin
reemitir credenciales.
