# Indicaciones del CRM

_Completado: 2026-11-14 · Lo mantiene el agente del CRM._

> **Estado: listo para integrar** (cuando Joel confirme que está desplegado en producción y te entregue el secreto — ver sección 2).
> Sin claves ni tokens en este archivo: solo el **nombre** de la variable de entorno.

## Resumen en 30 segundos

- Un `POST` por registro a `…/api/clientes/webhook-sorteo`, **desde tu servidor** (nunca desde el navegador), con `Authorization: Bearer <secreto>`.
- Si la persona **ya existe** en el CRM (mismo celular + misma fecha de nacimiento), el CRM **no la crea ni la modifica** y responde `200` con `"resultado": "duplicado"`. Eso es un éxito: no se reintenta.
- Cada cliente nuevo queda marcado con **de qué sorteo vino** (`sorteo_slug` + `sorteo_nombre`) → el CRM muestra estadísticas por sorteo (ej. "NAVIDAD CON LAS FLORES").
- No hay entorno de pruebas aparte; hay una **prueba en seco** (`"modo_prueba": true`) que valida todo y **no escribe nada**.

## 1. Endpoint

- URL (producción): `https://crm-grupo-las-flores.vercel.app/api/clientes/webhook-sorteo`
- URL (pruebas): **no existe un entorno aparte** (el CRM tiene una sola base de datos). Usa `"modo_prueba": true` (ver sección 7).
- Método: `POST`, `Content-Type: application/json`. Solo HTTPS.
- Tiempo real: **un `POST` por registro, al momento** (respuesta a tu pregunta sobre envío por lotes: no hace falta, y el envío individual ya es idempotente). Ver "Cómo enviarlo bien" más abajo para no perder registros si el CRM está caído.

## 2. Autenticación

- Tipo: Bearer token (un secreto **exclusivo del sistema de sorteos**; el de la web es otro, no sirve acá).
- Cabecera exacta: `Authorization: Bearer <secreto>`
- Variable de entorno en el CRM: `SORTEO_WEBHOOK_SECRET`.
- Variable de entorno en tu proyecto (sugerida, solo lado servidor): `CRM_WEBHOOK_SECRET`. Llámala como quieras, pero **sin prefijo `NEXT_PUBLIC_`/`VITE_`** y sin que el navegador la pueda leer.
- **El valor del secreto NO está ni estará en este repo.** Joel te lo entrega por un canal privado; lo cargas en el `.env` local y en Vercel/Supabase.
- ⚠️ Llama al CRM solo desde código de **servidor** (función serverless, ruta de API, Edge Function de Supabase). Si lo haces desde el navegador, cualquiera que abra F12 ve el secreto y puede enviar datos falsos.

## 3. Campos que pide el CRM

Los nombres de los campos son **los mismos que ya usa tu sistema** (salvo `negocio`, `sorteo_slug`, `sorteo_nombre`), para que casi no haya que transformar nada.

| Campo | Obligatorio | Tipo / formato | Dato del sorteo | Notas |
|---|---|---|---|---|
| `negocio` | **Sí** | `"las-flores"`, `"umaru"` o `"mamina"` | Negocio del sorteo | Mapeo: *Restaurante Las Flores* → `las-flores`, *Hotel Umaru* → `umaru`. El cliente queda registrado en ese negocio. |
| `sorteo_slug` | **Sí** | minúsculas, números, `-` y `_` (2–80) | `slug` (ej. `sorteo-navideno-s3`) | Identificador **estable** del sorteo. Con esto el CRM agrupa las estadísticas. No lo cambies entre envíos del mismo sorteo. |
| `sorteo_nombre` | **Sí** | texto (2–120) | Nombre del sorteo (ej. `NAVIDAD CON LAS FLORES`) | Es lo que se muestra en el CRM. |
| `nombres` | **Sí** | texto 2–60: letras, espacios, `'` `.` `-` | `nombres` | **Sin números ni símbolos** → `400`. Los espacios repetidos se limpian solos. |
| `apellidos` | **Sí** | igual que `nombres` | `apellidos` | |
| `telefono` | **Sí** | **texto** de 9 dígitos que **empieza con 9** | `telefono` | Sin `+51`. Se guarda como el celular del cliente. |
| `fecha_nacimiento` | **Sí** | `AAAA-MM-DD` | `fecha_nacimiento` | Debe existir en el calendario, no ser futura y no tener más de 120 años (igual que tu validación). |
| `departamento`, `provincia`, `distrito` | No | texto, hasta 60 | los mismos | Se guardan tal cual. El CRM trabaja con `Ayacucho` / `Huamanga` y estos distritos: *Huamanga, Ayacucho, Andrés Avelino Cáceres, Jesús Nazareno, Carmen Alto, San Juan Bautista, Socos, Acocro*. Envíalos con **esa escritura exacta** (mismas tildes) para que la ficha del cliente y los filtros coincidan. |
| `acepta_comunicaciones` | No (**recomendado**) | `true` / `false` | **No es `acepta_terminos`** | Consentimiento para recibir **promociones y saludos por WhatsApp**. Es distinto a aceptar los términos del sorteo. Envía `true` **solo si** el texto que la persona acepta lo dice. Si no lo envías, el CRM guarda `false` y esa persona **no recibirá** promociones. Ver pregunta en `PREGUNTAS.md`. |
| `created_at` | No | ISO 8601 con zona (`2026-11-13T16:08:00-05:00`) | `created_at` | Define el **día de registro** en el CRM (hora de Lima). Si el envío se demoró por reintentos, así se respeta el día real. Sin este campo, es hoy. |
| `request_id` | No | texto, hasta 64 | `request_id` | Solo para el log del CRM (rastrear un envío). **No** se usa para duplicados ni se guarda. |
| `modo_prueba` | No | `true` / `false` | — | `true` = prueba en seco, no escribe nada (sección 7). |

**Se pueden enviar, pero el CRM los ignora:** `id`, `participacion_fecha`, `acepta_terminos`, `respuestas`, `preguntas_snapshot`. Si algún día interesa guardar las respuestas adicionales (ej. "Empresa de taxi"), avísalo en `PREGUNTAS.md` y se agrega un campo.

## 4. Ejemplo de cuerpo (JSON)

```json
{
  "negocio": "las-flores",
  "sorteo_slug": "sorteo-navideno-s3",
  "sorteo_nombre": "NAVIDAD CON LAS FLORES",
  "nombres": "Marianella",
  "apellidos": "Vila Zevallos",
  "telefono": "999242438",
  "fecha_nacimiento": "1998-03-24",
  "departamento": "Ayacucho",
  "provincia": "Huamanga",
  "distrito": "Ayacucho",
  "acepta_comunicaciones": true,
  "created_at": "2026-11-13T16:08:00-05:00",
  "request_id": "2b1e0000-0000-0000-0000-000000000000"
}
```

## 5. Respuestas

Todas son JSON. Los códigos `2xx` son "ya terminó, no insistas"; los `5xx` y la falta de respuesta son "reintenta"; los `4xx` son "algo está mal en lo que enviaste".

| Código | Cuerpo de ejemplo | Qué significa | Qué hace el sorteo |
|---|---|---|---|
| `200` | `{ "ok": true, "resultado": "creado" }` | Cliente nuevo creado en el CRM. | Marcar el registro como enviado. |
| `200` | `{ "ok": true, "resultado": "duplicado" }` | La persona ya era cliente (mismo celular + fecha de nacimiento). **No se creó ni se modificó nada.** | Marcar como enviado. **No es un error y no se reintenta.** |
| `400` | `{ "ok": false, "error": "telefono debe tener 9 dígitos.", "campo": "telefono" }` | Un dato no cumple el formato. `campo` dice cuál. | **No reintentar** (daría lo mismo). Guardar el motivo para corregirlo; **nunca bloquear la participación en el sorteo por esto**. |
| `401` | `{ "ok": false, "error": "No autorizado." }` | Falta el secreto o no coincide. | No reintentar; avisar a Joel (configuración). |
| `500` | `{ "ok": false, "error": "No se pudo procesar el registro. Reintenta más tarde." }` | Falla temporal del CRM (o mal configurado). | **Reintentar** con espera creciente. |
| sin respuesta / timeout | — | No se sabe si llegó. | **Reintentar** — es seguro (ver idempotencia). |

**¿Qué pasa si se envía dos veces el mismo registro?** Es seguro: no hay clave de idempotencia aparte porque no hace falta — el mismo celular + fecha de nacimiento ya existe, así que el segundo envío responde `"duplicado"` y no crea nada. Esto también aguanta envíos **simultáneos**: la base de datos del CRM tiene un índice único que deja entrar solo a uno.

### Cómo enviarlo bien (recomendado)

1. **Primero** guarda al participante en tu base, como hoy (`registrar_participacion`). El CRM nunca debe poder impedir ni demorar una participación.
2. **Después, aparte** (sin hacer esperar a la persona), envía al CRM desde el servidor.
3. Patrón de "bandeja de salida": guarda un estado por participante (`pendiente` / `enviado` / `rechazado`) y un contador de intentos. Si el CRM responde `5xx` o no responde, queda `pendiente` y un proceso periódico (por ejemplo cada 5–10 minutos) reintenta. Esperas sugeridas: 1 min, 5 min, 30 min, 2 h, 12 h; luego, dejarlo para revisión manual. Así **no se pierde ningún registro** aunque el CRM esté caído un rato.
4. Si el envío se retrasa, manda el `created_at` original.

## 6. Reglas de negocio

- **Duplicados:** *mismo celular **y** misma fecha de nacimiento*, buscado en **todo el grupo** (cualquier negocio y cualquier origen: alguien que ya es cliente por la web, presencial u otro sorteo cuenta como existente). Si coincide → no se crea. Mismo celular con **otra** fecha de nacimiento = otra persona (familias que comparten teléfono) → sí se crea. **Nunca se actualiza** a un cliente existente con datos del sorteo. Esta regla es del CRM completo, no solo de los sorteos, y la base de datos la hace cumplir.
- **Origen:** todo cliente creado por este endpoint queda con origen `sorteo`, más su `sorteo_slug` y `sorteo_nombre`. En el Panel Gerencial del CRM aparece como parte de "De dónde vienen los clientes" y en el detalle **"Clientes por sorteo"**. Consecuencia a tener presente: quien ya era cliente y participa **no suma** a "clientes captados por ese sorteo" (porque no es un cliente nuevo).
- **Consentimiento:** `acepta_terminos` **no** equivale a aceptar promociones por WhatsApp; por eso es un campo aparte (`acepta_comunicaciones`). Recomendación (no es asesoría legal): que el texto que ve la persona diga explícitamente que sus datos se usarán para contactarla con promociones/saludos de la empresa, en línea con la Ley N.° 29733 de Protección de Datos Personales; si hay dudas, que lo revise quien lleve lo legal de la empresa.
- **Límites de uso:** no hay un límite implementado. Se espera **un `POST` por registro**. Si alguna vez reenvías un lote (por ejemplo, un reproceso), hazlo a un ritmo moderado (unos 5 por segundo como máximo).
- **Zona horaria:** el CRM usa hora de Lima (`America/Lima`) para el día de registro.

## 7. Otros — cómo probar sin ensuciar el CRM

1. **Prueba en seco (sin escribir nada):** envía un cuerpo válido con `"modo_prueba": true`. El CRM hace **toda** la validación y **busca duplicados de verdad**, pero no crea nada. Responde `200 {"ok":true,"resultado":"creado","modo_prueba":true}` (habría creado) o `"resultado":"duplicado"` (ya existía). Con esto pruebas autenticación, formato, errores `400` y el manejo de `duplicado` sin tocar los datos reales.
2. **Un alta real de prueba:** cuando la prueba en seco esté bien, envía **un** registro real con datos identificables: `sorteo_slug: "prueba-integracion"`, nombre `PRUEBA SORTEO`, teléfono `900000001`. Avisa en `PREGUNTAS.md` y el agente del CRM lo verifica y lo borra (así no queda en las estadísticas).
3. Los detalles del CRM (campos, códigos, reglas) **no cambian sin avisar**: cualquier cambio se anota arriba de este archivo con la fecha.
