# Datos que recoge el sistema de sorteos

_Actualizado: 2026-11-14 · Lo mantiene el agente de sorteos._

## Cuándo se generan

Una persona abre el enlace o el QR de un sorteo (`/sorteo/<enlace>`), llena el formulario y pulsa **Enviar mi participación**.
El registro se guarda en Supabase (tabla `participantes`) mediante la función `registrar_participacion`.
Ese es el momento en que se enviaría al CRM.

## Datos de la persona

| Campo | Tipo | Ejemplo | Notas |
|---|---|---|---|
| `nombres` | texto | `Marianella` | Obligatorio, mínimo 2 caracteres; solo letras, espacios, `'`, `.` y `-`. |
| `apellidos` | texto | `Vila Zevallos` | Obligatorio, mínimo 2 caracteres; solo letras, espacios, `'`, `.` y `-`. |
| `telefono` | texto, 9 dígitos | `999242438` | Celular de Perú, sin prefijo `+51`; empieza con 9. |
| `fecha_nacimiento` | fecha `AAAA-MM-DD` | `1998-03-24` | La persona la escribe como día/mes/año; se valida (no futura, máx. 120 años). |
| `departamento` | texto | `Ayacucho` | Fijo: el formulario no lo pide. |
| `provincia` | texto | `Huamanga` | Fijo: el formulario no lo pide. |
| `distrito` | texto | `Ayacucho` | Elegido de la lista de distritos de Huamanga. |
| `acepta_terminos` | booleano | `true` | Siempre `true`: no se puede enviar sin aceptar términos y política de privacidad. |
| `respuestas` | objeto JSON | `{ "<id pregunta>": "Taxi Super Vip Ayacucho" }` | Respuestas a preguntas adicionales del sorteo (pueden no existir). |
| `preguntas_snapshot` | lista JSON | `[{ "id": "…", "texto": "Empresa de taxi", "tipo": "seleccion_unica", "respuesta": "…" }]` | Las mismas respuestas con el texto de cada pregunta. |

## Datos del registro

| Campo | Tipo | Ejemplo | Notas |
|---|---|---|---|
| `id` | texto (UUID) | `8f3c…` | Identificador único del participante en el sistema de sorteos. |
| `request_id` | UUID | `2b1e…` | Identificador del envío; sirve como clave de idempotencia (el mismo envío no se registra dos veces). |
| `participacion_fecha` | fecha `AAAA-MM-DD` | `2026-11-13` | Día de la participación. |
| `created_at` | fecha y hora con zona | `2026-11-13T16:08:00-05:00` | Momento exacto del registro. |

## Datos del sorteo y del negocio

| Campo | Ejemplo | Notas |
|---|---|---|
| Nombre del sorteo | `NAVIDAD CON LAS FLORES` | |
| Enlace del sorteo (`slug`) | `sorteo-navideno-s3` | Identificador estable del sorteo. |
| Negocio | `Restaurante Las Flores` o `Hotel Umaru` | Cada sorteo pertenece a uno de los dos. |

## Reglas actuales

- Un mismo celular puede registrarse **una vez por día** en cada sorteo.
- Algunos sorteos pueden exigir que la persona esté **en el local** (verificación de ubicación); en ese caso solo llegan registros hechos cerca del negocio.
- No se piden correo electrónico ni DNI.
