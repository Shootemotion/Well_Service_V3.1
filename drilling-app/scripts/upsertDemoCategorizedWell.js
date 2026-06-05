const fs = require('fs');
const path = require('path');

const wellsPath = path.resolve(__dirname, '..', 'data', 'wells.json');
const data = JSON.parse(fs.readFileSync(wellsPath, 'utf8'));

function op(startTime, endTime, duration, code, description, md, params, category) {
    return {
        startTime,
        endTime,
        duration,
        code,
        description,
        md,
        wob: params.wob ?? 0,
        rpm: params.rpm ?? 0,
        torque: params.torque ?? 0,
        gpm: params.gpm ?? 0,
        spp: params.spp ?? 0,
        phaseCode: category.phase,
        activityCode: category.activity,
        operationCode: category.operation,
        timeTypeCode: category.timeType,
        nptCategoryCode: category.npt || ''
    };
}

const demoWell = {
    id: 'CH-2401',
    name: 'CH-2401',
    operator: 'Company Demo',
    rig: 'RIG-07',
    status: 'EN_OPERACION',
    location: 'LOC-2401',
    field: 'El Trebol',
    spudDate: '2026-06-01',
    plannedTD: 3200,
    plannedMD: 3200,
    plannedTVD: 3025,
    currentMD: 2120,
    currentTVD: 2058,
    wellType: 'PRODUCTOR',
    extractionSystem: 'BOMBEO_MECANICO',
    createdFromCategoryPozo: {
        id_pozo: 2401,
        codigo_pozo: 'CH-2401',
        nombre_pozo: 'CH-2401',
        yacimiento: 'El Trebol',
        area: 'Zona Norte',
        locacion: 'LOC-2401',
        bateria: 'BAT-12',
        tipo_pozo: 'PRODUCTOR',
        estado_pozo: 'EN_OPERACION',
        sistema_extraccion: 'BOMBEO_MECANICO',
        profundidad_md: 3200,
        profundidad_tvd: 3025,
        latitud: -45.8642,
        longitud: -67.4821,
        coordenada_x: 2534100,
        coordenada_y: 4938200,
        datum: 'WGS84',
        fecha_alta: '2026-06-01',
        observaciones: 'Pozo demo creado para validar categorias operativas en Well Planning y DDR.',
        activo: 'Si'
    },
    casings: [
        { label: 'Conductor', size: '20"', grade: 'X-52', weight: '94#', shoeMD: 60, tocMD: 0, set: true },
        { label: 'Superficie', size: '13-3/8"', grade: 'N-80', weight: '68#', shoeMD: 930, tocMD: 0, set: true },
        { label: 'Intermedio', size: '9-5/8"', grade: 'P-110', weight: '47#', shoeMD: 2100, tocMD: 760, set: true },
        { label: 'Produccion', size: '7"', grade: 'P-110', weight: '32#', shoeMD: 3200, tocMD: 1750, set: false }
    ],
    bha: [
        { n: 1, item: 'PDC 8-1/2"', length: 0.5 },
        { n: 2, item: 'Motor de fondo 6-3/4"', length: 8.2 },
        { n: 3, item: 'MWD/LWD', length: 9.4 },
        { n: 4, item: 'Monel 6-1/2"', length: 9.1 },
        { n: 5, item: 'HWDP 5"', length: 46.0 }
    ],
    mud: {
        type: 'WBM Polimerico',
        density: 10.8,
        viscosity: 46,
        ph: 9.2,
        filtrate: 5.8,
        yp: 24,
        gels: '7/12'
    },
    afe: 4120000,
    wellPlan: {
        eventCode: 'EVT-PERF',
        objective: 'Perforar pozo CH-2401 hasta 3200 m MD / 3025 m TVD y dejar casing intermedio cementado.',
        startDate: '2026-06-01',
        endDate: '2026-06-05',
        rig: 'RIG-07',
        contractor: 'Servicios Integrados Patagonia',
        supervisor: 'Company Man Demo',
        status: 'APROBADO',
        steps: [
            { id: 'CH2401-PLAN-01', phase: 'PH-PERF-PLAN', activity: 'ACT-SUPERFICIE', operation: 'OP-ACOND-LOCACION', timeType: 'TC-OP', npt: '', duration: 4, depthFrom: 0, depthTo: 0, service: 'Locacion', comments: 'Verificar locacion, seguridad y permisos previo a inicio.' },
            { id: 'CH2401-PLAN-02', phase: 'PH-PERF-MONTAJE', activity: 'ACT-DTM', operation: 'OP-MONTA', timeType: 'TC-DTM', npt: '', duration: 8, depthFrom: 0, depthTo: 0, service: 'Equipo', comments: 'Montaje de equipo perforador y pruebas de sistemas.' },
            { id: 'CH2401-PLAN-03', phase: 'PH-PERF-SPUD', activity: 'ACT-DRILL', operation: 'OP-ROTA', timeType: 'TC-OP', npt: '', duration: 10, depthFrom: 60, depthTo: 930, service: 'Perforacion', comments: 'Spud y perforacion seccion superficial.' },
            { id: 'CH2401-PLAN-04', phase: 'PH-PERF-CASING-SUP', activity: 'ACT-BAJAR-CASING', operation: 'OP-BAJA-CSG-TBG-VB', timeType: 'TC-OP', npt: '', duration: 7, depthFrom: 0, depthTo: 930, service: 'Casing', comments: 'Bajar casing superficial.' },
            { id: 'CH2401-PLAN-05', phase: 'PH-PERF-CEM-SUP', activity: 'ACT-CEMENTAR', operation: 'OP-CEMENTA', timeType: 'TC-OP', npt: '', duration: 5, depthFrom: 0, depthTo: 930, service: 'Cementacion', comments: 'Cementar casing superficial y esperar fragüe.' },
            { id: 'CH2401-PLAN-06', phase: 'PH-PERF-INT', activity: 'ACT-DRILL', operation: 'OP-ROTA', timeType: 'TC-OP', npt: '', duration: 24, depthFrom: 930, depthTo: 2100, service: 'Perforacion', comments: 'Perforar seccion intermedia con MWD/LWD.' },
            { id: 'CH2401-PLAN-07', phase: 'PH-PERF-LOG', activity: 'ACT-LOGGING', operation: 'OP-CABLE', timeType: 'TC-OP', npt: '', duration: 6, depthFrom: 930, depthTo: 2100, service: 'Wireline', comments: 'Perfilaje y correlacion.' },
            { id: 'CH2401-PLAN-08', phase: 'PH-PERF-CASING-INT', activity: 'ACT-BAJAR-CASING', operation: 'OP-BAJA-CSG-TBG-VB', timeType: 'TC-OP', npt: '', duration: 8, depthFrom: 0, depthTo: 2100, service: 'Casing', comments: 'Bajar casing intermedio.' },
            { id: 'CH2401-PLAN-09', phase: 'PH-PERF-CEM-INT', activity: 'ACT-CEMENTAR', operation: 'OP-CEMENTA', timeType: 'TC-OP', npt: '', duration: 5, depthFrom: 0, depthTo: 2100, service: 'Cementacion', comments: 'Cementar casing intermedio.' }
        ]
    },
    days: [
        {
            dayNumber: 1,
            date: '2026-06-01',
            phase: 'Planificacion / Montaje',
            planMD: 60,
            actualMD: 62,
            planTVD: 60,
            actualTVD: 62,
            operations: [
                op('00:00', '04:00', 240, 'RIG_UP', 'Acondicionamiento de locacion, permisos y charla de seguridad.', 0, {}, { phase: 'PH-PERF-PLAN', activity: 'ACT-SUPERFICIE', operation: 'OP-ACOND-LOCACION', timeType: 'TC-OP' }),
                op('04:00', '12:00', 480, 'RIG_UP', 'Montaje de equipo perforador, líneas de flujo y pruebas funcionales.', 0, {}, { phase: 'PH-PERF-MONTAJE', activity: 'ACT-DTM', operation: 'OP-MONTA', timeType: 'TC-DTM' }),
                op('12:00', '14:00', 120, 'BOP', 'Prueba de BOP y verificación de hermeticidad.', 0, { gpm: 120, spp: 650 }, { phase: 'PH-PERF-BOP', activity: 'ACT-HERMETICIDAD', operation: 'OP-PRUEBA-HERM', timeType: 'TC-OP' }),
                op('14:00', '20:30', 390, 'DRILL', 'Spud y perforación inicial hasta 62 m MD.', 62, { wob: 16, rpm: 75, torque: 6.4, gpm: 420, spp: 1450 }, { phase: 'PH-PERF-SPUD', activity: 'ACT-DRILL', operation: 'OP-ROTA', timeType: 'TC-OP' }),
                op('20:30', '24:00', 210, 'CIRC', 'Circulación y limpieza de pozo previo a continuar sección superficial.', 62, { rpm: 45, torque: 2.4, gpm: 460, spp: 1550 }, { phase: 'PH-PERF-SUP', activity: 'ACT-CIRCULAR', operation: 'OP-BOMB-INY-CIRC-DESP', timeType: 'TC-OP' })
            ],
            planCost: 360000,
            actualCost: 354000
        },
        {
            dayNumber: 2,
            date: '2026-06-02',
            phase: 'Seccion superficial',
            planMD: 930,
            actualMD: 918,
            planTVD: 925,
            actualTVD: 913,
            operations: [
                op('00:00', '09:30', 570, 'DRILL', 'Perforación sección superficial 17-1/2" hasta 505 m MD.', 505, { wob: 24, rpm: 92, torque: 10.8, gpm: 520, spp: 2050 }, { phase: 'PH-PERF-SUP', activity: 'ACT-DRILL', operation: 'OP-ROTA', timeType: 'TC-OP' }),
                op('09:30', '10:30', 60, 'CONN', 'Conexiones y medición/observación de parámetros.', 505, { rpm: 20, torque: 1.8, gpm: 180, spp: 730 }, { phase: 'PH-PERF-SUP', activity: 'ACT-DRILL', operation: 'OP-MIDE-OBSERVA', timeType: 'TC-OP' }),
                op('10:30', '18:00', 450, 'DRILL', 'Perforación continua hasta 918 m MD.', 918, { wob: 27, rpm: 95, torque: 12.1, gpm: 540, spp: 2240 }, { phase: 'PH-PERF-SUP', activity: 'ACT-DRILL', operation: 'OP-ROTA', timeType: 'TC-OP' }),
                op('18:00', '20:00', 120, 'CIRC', 'Circulación de fondo y acondicionamiento de lodo.', 918, { rpm: 55, torque: 3.6, gpm: 560, spp: 2300 }, { phase: 'PH-PERF-SUP', activity: 'ACT-CIRCULAR', operation: 'OP-BOMB-INY-CIRC-DESP', timeType: 'TC-OP' }),
                op('20:00', '24:00', 240, 'TRIP', 'Viaje corto de calibración y control de pozo.', 918, { torque: 1.2, gpm: 120, spp: 520 }, { phase: 'PH-PERF-COND', activity: 'ACT-CALIBRA', operation: 'OP-CALIBRA', timeType: 'TC-OP' })
            ],
            planCost: 520000,
            actualCost: 538000
        },
        {
            dayNumber: 3,
            date: '2026-06-03',
            phase: 'Casing y cemento superficial',
            planMD: 930,
            actualMD: 930,
            planTVD: 925,
            actualTVD: 925,
            operations: [
                op('00:00', '04:00', 240, 'TRIP', 'Sacada de BHA y preparación para corrida de casing superficial.', 918, { gpm: 90, spp: 420 }, { phase: 'PH-PERF-WOC-SUP', activity: 'ACT-SACAR-INST', operation: 'OP-VIAJE', timeType: 'TC-OP' }),
                op('04:00', '11:00', 420, 'CASING', 'Bajada de casing superficial 13-3/8" hasta 930 m MD.', 930, { gpm: 160, spp: 680 }, { phase: 'PH-PERF-CASING-SUP', activity: 'ACT-BAJAR-CASING', operation: 'OP-BAJA-CSG-TBG-VB', timeType: 'TC-OP' }),
                op('11:00', '13:00', 120, 'NPT_M', 'Falla hidráulica menor en unidad de cementación. Cambio de manguera.', 930, {}, { phase: 'PH-PERF-CEM-SUP', activity: 'ACT-MANT-CORR', operation: 'OP-EQ-PARADO', timeType: 'TC-NPT', npt: 'NPT-EQ' }),
                op('13:00', '18:00', 300, 'CEMENT', 'Cementación casing superficial, desplazamiento y retorno observado.', 930, { gpm: 420, spp: 1850 }, { phase: 'PH-PERF-CEM-SUP', activity: 'ACT-CEMENTAR', operation: 'OP-CEMENTA', timeType: 'TC-OP' }),
                op('18:00', '24:00', 360, 'BOP', 'WOC, instalación de cabeza y prueba de integridad.', 930, { gpm: 100, spp: 800 }, { phase: 'PH-PERF-CABEZA', activity: 'ACT-HERMETICIDAD', operation: 'OP-PRUEBA-HERM', timeType: 'TC-OP' })
            ],
            planCost: 610000,
            actualCost: 642000
        },
        {
            dayNumber: 4,
            date: '2026-06-04',
            phase: 'Seccion intermedia',
            planMD: 1680,
            actualMD: 1715,
            planTVD: 1648,
            actualTVD: 1680,
            operations: [
                op('00:00', '02:30', 150, 'RIG_UP', 'Armado BHA 12-1/4" con MWD/LWD.', 930, { gpm: 80, spp: 420 }, { phase: 'PH-PERF-RIGUP', activity: 'ACT-SUPERFICIE', operation: 'OP-TRAB-SUP', timeType: 'TC-OP' }),
                op('02:30', '11:30', 540, 'DRILL', 'Perforación sección intermedia de 930 a 1320 m MD.', 1320, { wob: 28, rpm: 88, torque: 13.4, gpm: 580, spp: 2650 }, { phase: 'PH-PERF-INT', activity: 'ACT-DRILL', operation: 'OP-ROTA', timeType: 'TC-OP' }),
                op('11:30', '13:00', 90, 'CIRC', 'Circulación para limpieza por incremento de recortes.', 1320, { rpm: 60, torque: 4.1, gpm: 600, spp: 2720 }, { phase: 'PH-PERF-INT', activity: 'ACT-CIRCULAR', operation: 'OP-BOMB-INY-CIRC-DESP', timeType: 'TC-OP' }),
                op('13:00', '21:30', 510, 'DRILL', 'Perforación direccional controlada hasta 1715 m MD.', 1715, { wob: 30, rpm: 86, torque: 14.8, gpm: 590, spp: 2860 }, { phase: 'PH-PERF-DIR', activity: 'ACT-DRILL', operation: 'OP-ROTA', timeType: 'TC-OP' }),
                op('21:30', '24:00', 150, 'NPT_L', 'Espera de personal de perfilaje para correlación MWD.', 1715, {}, { phase: 'PH-PERF-LOG', activity: 'ACT-LOGGING', operation: 'OP-CABLE', timeType: 'TC-LOG', npt: 'NPT-LOG' })
            ],
            planCost: 690000,
            actualCost: 705000
        },
        {
            dayNumber: 5,
            date: '2026-06-05',
            phase: 'Perfilaje y casing intermedio',
            planMD: 2100,
            actualMD: 2120,
            planTVD: 2040,
            actualTVD: 2058,
            operations: [
                op('00:00', '06:00', 360, 'DRILL', 'Perforación hasta profundidad de casing intermedio 2120 m MD.', 2120, { wob: 31, rpm: 84, torque: 15.6, gpm: 600, spp: 2920 }, { phase: 'PH-PERF-INT', activity: 'ACT-DRILL', operation: 'OP-ROTA', timeType: 'TC-OP' }),
                op('06:00', '09:00', 180, 'CIRC', 'Circulación y acondicionamiento de pozo para perfiles.', 2120, { rpm: 50, torque: 3.2, gpm: 610, spp: 2750 }, { phase: 'PH-PERF-COND', activity: 'ACT-CIRCULAR', operation: 'OP-BOMB-INY-CIRC-DESP', timeType: 'TC-OP' }),
                op('09:00', '13:00', 240, 'TRIP', 'Perfilaje eléctrico y verificación de sección intermedia.', 2120, { gpm: 80, spp: 380 }, { phase: 'PH-PERF-LOG', activity: 'ACT-LOGGING', operation: 'OP-CABLE', timeType: 'TC-OP' }),
                op('13:00', '20:30', 450, 'CASING', 'Bajada de casing intermedio 9-5/8" hasta 2100 m MD.', 2120, { gpm: 150, spp: 720 }, { phase: 'PH-PERF-CASING-INT', activity: 'ACT-BAJAR-CASING', operation: 'OP-BAJA-CSG-TBG-VB', timeType: 'TC-OP' }),
                op('20:30', '24:00', 210, 'CEMENT', 'Cementación casing intermedio y desplazamiento final.', 2120, { gpm: 430, spp: 1980 }, { phase: 'PH-PERF-CEM-INT', activity: 'ACT-CEMENTAR', operation: 'OP-CEMENTA', timeType: 'TC-OP' })
            ],
            planCost: 720000,
            actualCost: 714000
        }
    ]
};

data.wells = (data.wells || []).filter(well => well.id !== demoWell.id);
data.wells.push(demoWell);
fs.writeFileSync(wellsPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(`Upserted demo categorized well ${demoWell.id}`);
