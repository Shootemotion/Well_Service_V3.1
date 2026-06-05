# Target Operational Model

Este documento define el modelo objetivo contra el que vamos a comparar la app actual.
No reemplaza el Daily Drilling existente ni cambia el runtime actual.

## Estado Actual

La app actual es un frontend estatico:

- `index.html`: layout principal.
- `styles/main.css`: estilos de la experiencia Daily Drilling.
- `js/app.js`: inicializacion.
- `js/dataManager.js`: carga `data/wells.json`, estado actual y persistencia local.
- `js/wellManager.js`: UI, eventos, DDR, sensores, BHA, lodo y NPT.
- `data/wells.json`: pozos, dias, operaciones, NPT y proximas locaciones.

No hay backend ni base remota. La carga diaria agregada por usuario persiste en
`localStorage`.

## Objetivo Conceptual

El modelo futuro debe normalizar la operacion con catalogos relacionados:

```text
Well
  Well Event
    Well Planning
      Plan Steps
    Daily Report
      Daily Time Logs
```

La cadena operativa obligatoria es:

```text
Evento -> Fase -> Actividad -> Operacion -> Tipo de Tiempo -> NPT/Causa si corresponde
```

En el futuro, el usuario no deberia escribir fase, actividad u operacion como texto libre.
Debe seleccionar desde catalogos filtrados.

## Entidades Objetivo

Catalogos:

- `cat_evento`
- `cat_fase`
- `cat_actividad`
- `cat_operacion`
- `cat_tipo_tiempo`
- `cat_estado_pozo`
- `cat_npt_categoria`
- `cat_servicio`

Relaciones:

- `rel_evento_fase`
- `rel_fase_actividad`
- `rel_actividad_operacion`
- `rel_operacion_servicio`
- `rel_operacion_requisitos`

Operativas:

- `well`
- `well_event`
- `well_plan`
- `well_plan_step`
- `daily_report`
- `daily_time_log`

## Adaptacion Desde El Modelo Actual

| Actual | Futuro |
| --- | --- |
| `wells[].id` | `well.well_id` |
| `wells[].name` | `well.well_name` |
| `wells[].field` | `well.field_name` |
| `wells[].location` | `well.area_name` |
| `wells[].status` | `well.current_status_code` |
| `wells[].days[]` | `daily_report` |
| `days[].operations[]` | `daily_time_log` |
| `operations[].code` | `operation_code` y/o `time_type_code` |
| `operations[].description` | `daily_time_log.description` |
| `operations[].md` | `depth_to` o `current_depth` segun operacion |
| `nptCategories` | `cat_npt_categoria` |

## Reglas De Validacion Objetivo

Para guardar un `daily_time_log`:

- Requiere `start_time`.
- Requiere `end_time`.
- Requiere `phase_code`.
- Requiere `activity_code`.
- Requiere `operation_code`.
- Requiere `time_type_code`.
- Requiere descripcion minima.
- `end_time` debe ser mayor que `start_time`.
- `duration_hours` se calcula automaticamente.

Si `time_type_code` es `NPT`, `POZO`, `LOG`, `WTH`, `MNT`, `SEG`, `AMB`, `CLI` o
`TERCERO`:

- Requiere `npt_category_code`.
- Requiere descripcion de al menos 20 caracteres.

Si una operacion requiere datos especiales:

- `requires_depth`: exige `depth_from` y `depth_to`.
- `requires_pressure`: exige `pressure_value`.
- `requires_volume`: exige `volume_value`.
- `required_service_code`: autocompleta o exige `service_code`.

## Estrategia De Implementacion Sin Romper El Mockup

Fase 1 - Base de informacion:

- Crear `data/operationalCatalogs.json`.
- Crear helpers de catalogos sin tocar UI.
- Mapear los codigos actuales (`DRILL`, `CIRC`, `TRIP`, etc.) a operaciones objetivo.

Fase 2 - Daily Drilling normalizado:

- Cambiar el formulario `+ Linea` para usar selectores de Fase, Actividad, Operacion y Tipo de Tiempo.
- Mantener la tabla DDR visual actual.
- Guardar nuevos campos normalizados en `localStorage` junto a los campos legacy.

Fase 3 - Well Planning:

- Agregar una vista nueva sin reemplazar el Daily.
- Crear una grilla editable de plan steps.
- Permitir comparar planificado vs real.

Fase 4 - Backend/API:

- Reemplazar los mock services por endpoints REST.
- Mantener la misma forma de datos para minimizar cambios de UI.

## Principio De Compatibilidad

Hasta que el Daily este migrado, toda operacion nueva debe poder convivir con el formato
actual:

```json
{
  "startTime": "08:00",
  "endTime": "10:00",
  "duration": 120,
  "code": "DRILL",
  "description": "Operacion cargada",
  "md": 0,
  "wob": 0,
  "rpm": 0,
  "torque": 0,
  "gpm": 0,
  "spp": 0,
  "phaseCode": "PERFORACION_SECCION_INTERMEDIA",
  "activityCode": "PERFORAR",
  "operationCode": "PERFORA",
  "timeTypeCode": "OP",
  "serviceCode": null,
  "nptCategoryCode": null,
  "isFromPlan": false
}
```

