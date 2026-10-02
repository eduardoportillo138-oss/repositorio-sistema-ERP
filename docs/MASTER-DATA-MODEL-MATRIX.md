# Matriz de modelos heredados para Master Data Hardening

Inspección estática del código en 2026-10-02. `TENANT_INDEX=Sí` indica índices que mencionan `companyId`, aunque el campo **no** está declarado en el schema; por tanto el índice no prueba aislamiento. Ninguno de estos modelos se habilita en esta fase. Las rutas de sus dominios siguen `501 NOT_IMPLEMENTED` tras autenticación.

| MODEL              | HAS_COMPANY_ID | HAS_BRANCH_ID | TENANT_INDEX | REFERENCES                                 | CURRENT_ROUTE            | STATUS                 |
| ------------------ | -------------- | ------------- | ------------ | ------------------------------------------ | ------------------------ | ---------------------- |
| AccountsPayable    | No             | No            | Sí           | PurchaseOrder, Supplier, Invoice           | `/api/v1/finance` 501    | MANUAL_REVIEW_REQUIRED |
| AccountsReceivable | No             | No            | Sí           | Invoice, Customer, SalesOrder              | `/api/v1/finance` 501    | MANUAL_REVIEW_REQUIRED |
| Category           | No             | No            | Sí           | Category                                   | `/api/v1/categories` 501 | MASTER_DATA_PENDING    |
| Customer           | No             | No            | Sí           | Ninguna                                    | `/api/v1/customers` 501  | MASTER_DATA_PENDING    |
| Employee           | No             | No            | Sí           | User                                       | `/api/v1/hr` 501         | MANUAL_REVIEW_REQUIRED |
| Invoice            | No             | No            | Sí           | SalesOrder, Customer, Product              | `/api/v1/sales` 501      | MANUAL_REVIEW_REQUIRED |
| Payment            | No             | No            | Sí           | Invoice, PurchaseOrder, Customer, Supplier | `/api/v1/finance` 501    | MANUAL_REVIEW_REQUIRED |
| Product            | No             | No            | Sí           | Category, Unit                             | `/api/v1/products` 501   | MASTER_DATA_PENDING    |
| Project            | No             | No            | Sí           | Ninguna                                    | `/api/v1/projects` 501   | MANUAL_REVIEW_REQUIRED |
| PurchaseOrder      | No             | No            | Sí           | Supplier, Warehouse, Product               | `/api/v1/purchases` 501  | MANUAL_REVIEW_REQUIRED |
| Quote              | No             | No            | Sí           | Customer, Product                          | `/api/v1/sales` 501      | MANUAL_REVIEW_REQUIRED |
| SalesOrder         | No             | No            | Sí           | Customer, Quote, Warehouse, Product        | `/api/v1/sales` 501      | MANUAL_REVIEW_REQUIRED |
| Supplier           | No             | No            | Sí           | Ninguna                                    | `/api/v1/suppliers` 501  | MASTER_DATA_PENDING    |
| SystemSetting      | No             | No            | Sí           | Ninguna                                    | `/api/v1/settings` 501   | MANUAL_REVIEW_REQUIRED |
| Unit               | No             | No            | Sí           | Ninguna                                    | `/api/v1/units` 501      | MASTER_DATA_PENDING    |
| Warehouse          | No             | No            | Sí           | Ninguna                                    | `/api/v1/warehouses` 501 | MASTER_DATA_PENDING    |

La fase siguiente debe añadir tenant real, validar referencias del mismo tenant, migrar documentos históricos con revisión manual y solo entonces habilitar rutas. Orden: Categories → Units → Customers → Suppliers → Warehouses → Products.
