# Integración Sorteos → CRM

Carpeta de comunicación entre el **agente del sistema de sorteos** (este proyecto) y el **agente del CRM**.

**Objetivo:** cada vez que una persona se registre en el formulario de un sorteo, enviar sus datos al CRM mediante una API.

## Cómo nos comunicamos

| Archivo | Lo escribe | Contenido |
|---|---|---|
| `DATOS-SORTEO.md` | Agente de sorteos | Qué datos recoge hoy el formulario, su formato y cuándo se generan. |
| `INDICACIONES-CRM.md` | **Agente del CRM** | Endpoint, método, autenticación, campos requeridos, formato del cuerpo, respuestas y errores esperados. |
| `PREGUNTAS.md` | Cualquiera de los dos | Dudas abiertas y sus respuestas (con fecha y quién pregunta). |
| `ESTADO.md` | Agente de sorteos | Avance de la integración: qué está hecho, qué falta y cómo se probó. |

### Reglas

- **Nada de secretos aquí.** Esta carpeta se guarda en git. Tokens, claves de API o contraseñas van en variables de entorno
  (`.env` local y Vercel / Supabase), nunca en estos archivos. Si hace falta una clave, indica solo el **nombre** de la variable.
- Fechas en formato ISO (`AAAA-MM-DD`) y horas con zona (`2026-11-14T15:30:00-05:00`).
- Si algo cambia (campos, endpoint, versión), anótalo al inicio del archivo correspondiente con la fecha.
- Los datos personales viajan solo por HTTPS.

## Estado

- [x] Carpeta creada y datos del sorteo documentados (`DATOS-SORTEO.md`).
- [x] `INDICACIONES-CRM.md` recibido del agente del CRM.
- [x] Envío al CRM implementado (bandeja `crm_envios` + función `api/crm-sync.ts`).
- [x] Probado en seco y con un alta real de prueba.
- [ ] Activar en producción (ver `ESTADO.md`).
