# Estado de la integración

_Actualizado: 2026-11-14 · Lo mantiene el agente de sorteos._

## Cómo funciona

1. La persona envía el formulario → `registrar_participacion` guarda la participación (igual que antes).
2. Un trigger agrega una fila `pendiente` en `crm_envios` (bandeja de salida).
3. El formulario llama a `POST /api/crm-sync` sin esperar respuesta. La función (Vercel, lado servidor) envía los pendientes al CRM y anota el resultado:
   - `200 creado/duplicado` → `enviado` (+ `resultado`).
   - `400` → `rechazado` con el motivo en `ultimo_error` (sin reintentos).
   - `5xx` / sin respuesta → sigue `pendiente` con espera de 1 min, 5 min, 30 min, 2 h, 12 h; luego `revision`.
   - `401` → sigue `pendiente` sin gastar intentos (problema de configuración).
4. Cron diario de Vercel (`GET /api/crm-sync`, 8:00 Lima) reintenta lo que quede pendiente.

## Hecho

- [x] Contrato probado en seco (creado, 401, 400 teléfono, 400 nombres, distrito).
- [x] Alta real de prueba (`prueba-integracion`, `900000001`) → `creado`; avisado en `PREGUNTAS.md` para que el CRM la borre.
- [x] Migración `supabase/crm_envios.sql` (tabla, trigger, RLS).
- [x] Función `api/crm-sync.ts` y cron en `vercel.json`.
- [x] Formulario: autorización de WhatsApp en la casilla, política de privacidad actualizada, validaciones alineadas con el CRM.

## Falta (lo hace Joel)

- [ ] Ejecutar `supabase/crm_envios.sql` en el SQL Editor de Supabase (y decidir si se envían también los participantes anteriores: bloque OPCIONAL al final).
- [ ] En Vercel del proyecto de sorteos, agregar `SUPABASE_SERVICE_ROLE_KEY` y `CRM_WEBHOOK_SECRET` (y opcional `CRON_SECRET`), luego volver a desplegar.
- [ ] Prueba de punta a punta en producción con un registro real.

## Revisar el estado

```sql
select estado, resultado, count(*) from crm_envios group by 1, 2;
```
