// ============================================
// WELL PLANNING MANAGER - mock local de plan operativo
// ============================================

class WellPlanningManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.catalogs = null;
        this.dictionary = null;
        this.wellFields = [];
        this.steps = [];
        this.punzados = [];
        this.bha = [];
        this.storageKey = 'drillingAppWellPlanningDraft';
        this.wellsStorageKey = 'drillingAppPlanningWells';
        this.elements = {};
    }

    async init() {
        this.elements = {
            view: document.getElementById('wellPlanningView'),
            openBtn: document.getElementById('openPlanningBtn'),
            closeBtn: document.getElementById('closePlanningBtn'),
            well: document.getElementById('planWell'),
            event: document.getElementById('planEvent'),
            objective: document.getElementById('planObjective'),
            startDate: document.getElementById('planStartDate'),
            endDate: document.getElementById('planEndDate'),
            rig: document.getElementById('planRig'),
            contractor: document.getElementById('planContractor'),
            supervisor: document.getElementById('planSupervisor'),
            status: document.getElementById('planStatus'),
            openCreateWellBtn: document.getElementById('openCreateWellBtn'),
            createWellView: document.getElementById('createWellView'),
            closeCreateWellBtn: document.getElementById('closeCreateWellBtn'),
            planningWellForm: document.getElementById('planningWellForm'),
            savePlanningWellBtn: document.getElementById('savePlanningWellBtn'),
            planningLocalWells: document.getElementById('planningLocalWells'),
            phase: document.getElementById('stepPhase'),
            activity: document.getElementById('stepActivity'),
            operation: document.getElementById('stepOperation'),
            timeType: document.getElementById('stepTimeType'),
            npt: document.getElementById('stepNpt'),
            duration: document.getElementById('stepDuration'),
            cost: document.getElementById('stepCost'),
            depthFrom: document.getElementById('stepDepthFrom'),
            depthTo: document.getElementById('stepDepthTo'),
            service: document.getElementById('stepService'),
            comments: document.getElementById('stepComments'),
            addStepBtn: document.getElementById('addPlanStepBtn'),
            seedBtn: document.getElementById('seedPlanBtn'),
            clearBtn: document.getElementById('clearPlanBtn'),
            tableBody: document.getElementById('planStepsBody'),
            summary: document.getElementById('planSummary'),
            casingLabel: document.getElementById('casingLabel'),
            casingSize: document.getElementById('casingSize'),
            casingGrade: document.getElementById('casingGrade'),
            casingWeight: document.getElementById('casingWeight'),
            casingShoe: document.getElementById('casingShoe'),
            casingToc: document.getElementById('casingToc'),
            casingSet: document.getElementById('casingSet'),
            addCasingBtn: document.getElementById('addCasingBtn'),
            casingBody: document.getElementById('casingBody'),
            casingWellHint: document.getElementById('casingWellHint'),
            punzFormacion: document.getElementById('punzFormacion'),
            punzMetodo: document.getElementById('punzMetodo'),
            punzTope: document.getElementById('punzTope'),
            punzBase: document.getElementById('punzBase'),
            punzDensidad: document.getElementById('punzDensidad'),
            punzDisparos: document.getElementById('punzDisparos'),
            punzPeso: document.getElementById('punzPeso'),
            punzDiam: document.getElementById('punzDiam'),
            punzDesfasaje: document.getElementById('punzDesfasaje'),
            addPunzadoBtn: document.getElementById('addPunzadoBtn'),
            punzadosBody: document.getElementById('punzadosBody'),
            bhaDesc: document.getElementById('bhaDesc'),
            bhaQty: document.getElementById('bhaQty'),
            bhaMxu: document.getElementById('bhaMxu'),
            bhaOD: document.getElementById('bhaOD'),
            bhaID: document.getElementById('bhaID'),
            bhaPin: document.getElementById('bhaPin'),
            bhaBox: document.getElementById('bhaBox'),
            bhaKgm: document.getElementById('bhaKgm'),
            addBhaBtn: document.getElementById('addBhaBtn'),
            bhaBody: document.getElementById('bhaBody'),
            bhaWobMax: document.getElementById('bhaWobMax'),
            bhaMudWeight: document.getElementById('bhaMudWeight')
        };

        await this.loadCatalogs();
        this.bindEvents();
        this.populateStaticOptions();
        this.resetPlanEmpty();
        this.renderWellForm();
        this.renderLocalWells();
        this.render();
        this.renderCasings();
        this.renderPunzados();
        this.renderBha();
    }

    // Deja el plan vacío (se llena al tocar "Modelo Workover")
    resetPlanEmpty() {
        this.steps = [];
        this.punzados = [];
        this.bha = [];
        if (this.elements.objective) this.elements.objective.value = '';
        if (this.elements.startDate) this.elements.startDate.value = '';
        if (this.elements.endDate) this.elements.endDate.value = '';
        if (this.elements.rig) this.elements.rig.value = '';
        if (this.elements.contractor) this.elements.contractor.value = '';
        if (this.elements.supervisor) this.elements.supervisor.value = '';
        if (this.elements.status) this.elements.status.value = 'BORRADOR';
        if (this.elements.bhaWobMax) this.elements.bhaWobMax.value = '';
        if (this.elements.bhaMudWeight) this.elements.bhaMudWeight.value = '';
    }

    async loadCatalogs() {
        const [catalogResponse, dictionaryResponse] = await Promise.all([
            fetch('./data/wellPlanningCatalogs.json'),
            fetch('./data/dataModelDictionary.json')
        ]);
        this.catalogs = await catalogResponse.json();
        this.dictionary = await dictionaryResponse.json();
        this.wellFields = this.dictionary.groups
            ?.flatMap(group => group.tables || [])
            .find(table => table.table_code === 'well')
            ?.columns || [];
    }

    bindEvents() {
        this.elements.openBtn?.addEventListener('click', () => this.open());
        this.elements.closeBtn?.addEventListener('click', () => this.close());
        this.elements.event?.addEventListener('change', () => {
            this.populatePhases();
            this.steps = [];
            this.saveDraft();
            this.render();
        });
        this.elements.phase?.addEventListener('change', () => this.populateActivities());
        this.elements.activity?.addEventListener('change', () => this.populateOperations());
        this.elements.operation?.addEventListener('change', () => this.applyOperationDefaults());
        this.elements.timeType?.addEventListener('change', () => this.syncNptVisibility());
        this.elements.addStepBtn?.addEventListener('click', () => this.addStep());
        this.elements.seedBtn?.addEventListener('click', () => this.loadSampleSteps());
        this.elements.clearBtn?.addEventListener('click', () => this.clearPlan());
        this.elements.addCasingBtn?.addEventListener('click', () => this.addCasing());
        this.elements.addPunzadoBtn?.addEventListener('click', () => this.addPunzado());
        this.elements.addBhaBtn?.addEventListener('click', () => this.addBha());
        ['bhaWobMax', 'bhaMudWeight'].forEach(key => {
            this.elements[key]?.addEventListener('change', () => this.saveDraft());
        });
        this.elements.openCreateWellBtn?.addEventListener('click', () => this.openCreateWell());
        this.elements.closeCreateWellBtn?.addEventListener('click', () => this.closeCreateWell());
        this.elements.savePlanningWellBtn?.addEventListener('click', () => this.savePlanningWell());
        ['objective', 'startDate', 'endDate', 'rig', 'contractor', 'supervisor', 'status'].forEach(key => {
            this.elements[key]?.addEventListener('change', () => this.saveDraft());
        });
        this.elements.well?.addEventListener('change', () => {
            this.loadStaticPlanForSelectedWell();
            this.renderCasings();
            this.saveDraft();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isCreateWellOpen()) this.closeCreateWell();
            else if (event.key === 'Escape' && this.isOpen()) this.close();
        });
    }

    open() {
        this.populateStaticOptions();
        this.resetPlanEmpty();
        this.renderLocalWells();
        this.render();
        this.renderCasings();
        this.renderPunzados();
        this.renderBha();
        this.elements.view?.classList.remove('hidden');
    }

    // ===== Cañerías (casing) =====
    addCasing() {
        const wellId = this.elements.well?.value;
        const well = this.dataManager.getWellById(wellId);
        if (!well) {
            alert('Seleccioná un pozo existente (no local) para definir sus cañerías.');
            return;
        }
        const shoeMD = Number(this.elements.casingShoe?.value);
        if (!shoeMD || shoeMD <= 0) {
            alert('Ingresá la profundidad de zapata (Zapata MD).');
            return;
        }
        const casing = {
            label: this.elements.casingLabel?.value || 'Casing',
            size: this.elements.casingSize?.value.trim() || '',
            grade: this.elements.casingGrade?.value.trim() || '',
            weight: this.elements.casingWeight?.value.trim() || '',
            shoeMD,
            tocMD: Number(this.elements.casingToc?.value) || 0,
            set: this.elements.casingSet?.value === 'true'
        };
        const casings = [...(well.casings || []), casing].sort((a, b) => (a.shoeMD || 0) - (b.shoeMD || 0));
        this.dataManager.updateWellCasings(wellId, casings);
        this.refreshSchematic(wellId, well);

        ['casingSize', 'casingGrade', 'casingWeight', 'casingShoe', 'casingToc'].forEach(key => {
            if (this.elements[key]) this.elements[key].value = '';
        });
        this.renderCasings();
    }

    deleteCasing(index) {
        const wellId = this.elements.well?.value;
        const well = this.dataManager.getWellById(wellId);
        if (!well || !Array.isArray(well.casings)) return;
        const casings = well.casings.filter((_, i) => i !== index);
        this.dataManager.updateWellCasings(wellId, casings);
        this.refreshSchematic(wellId, well);
        this.renderCasings();
    }

    refreshSchematic(wellId, well) {
        // Si el pozo editado es el que se está viendo en el tablero, redibujar el esquemático
        const app = window.app;
        if (app?.schematicManager && app.dataManager?.getCurrentWell()?.id === wellId) {
            app.schematicManager.render(well);
            const day = app.dataManager.getCurrentDay();
            if (day) app.schematicManager.updateCurrentDepth(well, day);
        }
    }

    renderCasings() {
        if (!this.elements.casingBody) return;
        const wellId = this.elements.well?.value;
        const well = this.dataManager.getWellById(wellId);

        if (this.elements.casingWellHint) {
            this.elements.casingWellHint.textContent = well
                ? `Editando cañerías de ${well.id}`
                : 'Seleccioná un pozo existente para editar sus cañerías.';
        }

        const list = well?.casings || [];
        if (!list.length) {
            this.elements.casingBody.innerHTML =
                '<tr><td colspan="9" class="planning-empty">Sin cañerías cargadas. Agregá la primera (de la más externa a la más interna).</td></tr>';
            return;
        }
        this.elements.casingBody.innerHTML = list.map((c, i) => `
            <tr>
                <td class="mono text-center">${i + 1}</td>
                <td><span class="plan-chip">${this.escapeHtml(c.label)}</span></td>
                <td class="mono">${this.escapeHtml(c.size || '-')}</td>
                <td class="mono">${this.escapeHtml(c.grade || '-')}</td>
                <td class="mono">${this.escapeHtml(c.weight || '-')}</td>
                <td class="mono text-right">${c.shoeMD ?? '-'}</td>
                <td class="mono text-right">${c.tocMD ?? '-'}</td>
                <td>${c.set
                    ? '<span class="plan-chip time">Cementada</span>'
                    : '<span class="plan-chip">Planificada</span>'}</td>
                <td class="planning-actions-cell">
                    <button class="sensor-nav-btn" data-casing-del="${i}" type="button">Del</button>
                </td>
            </tr>
        `).join('');
        this.elements.casingBody.querySelectorAll('[data-casing-del]').forEach(btn => {
            btn.addEventListener('click', () => this.deleteCasing(Number(btn.dataset.casingDel)));
        });
    }

    // ===== Programa de punzados =====
    addPunzado() {
        const tope = Number(this.elements.punzTope?.value);
        const base = Number(this.elements.punzBase?.value);
        if (!tope || !base || base <= tope) {
            alert('Ingresá tope y base válidos (base mayor que tope).');
            return;
        }
        this.punzados.push({
            formacion: this.elements.punzFormacion?.value.trim() || '',
            metodo: this.elements.punzMetodo?.value.trim() || 'WL',
            tope,
            base,
            espesor: Number((base - tope).toFixed(2)),
            densidad: Number(this.elements.punzDensidad?.value) || 0,
            disparos: Number(this.elements.punzDisparos?.value) || 0,
            peso: Number(this.elements.punzPeso?.value) || 0,
            diam: Number(this.elements.punzDiam?.value) || 0,
            desfasaje: Number(this.elements.punzDesfasaje?.value) || 0
        });
        ['punzFormacion', 'punzTope', 'punzBase', 'punzDisparos'].forEach(k => { if (this.elements[k]) this.elements[k].value = ''; });
        this.saveDraft();
        this.renderPunzados();
    }

    deletePunzado(index) {
        this.punzados.splice(index, 1);
        this.saveDraft();
        this.renderPunzados();
    }

    renderPunzados() {
        if (!this.elements.punzadosBody) return;
        if (!this.punzados.length) {
            this.elements.punzadosBody.innerHTML =
                '<tr><td colspan="11" class="planning-empty">Sin punzados cargados. Agregá un intervalo o usá el modelo Workover.</td></tr>';
            return;
        }
        const totEsp = this.punzados.reduce((s, p) => s + (p.espesor || 0), 0);
        const totDisp = this.punzados.reduce((s, p) => s + (p.disparos || 0), 0);
        this.elements.punzadosBody.innerHTML = this.punzados.map((p, i) => `
            <tr>
                <td>${this.escapeHtml(p.formacion || '-')}</td>
                <td><span class="plan-chip">${this.escapeHtml(p.metodo || '-')}</span></td>
                <td class="mono text-right">${p.tope.toFixed(1)}</td>
                <td class="mono text-right">${p.base.toFixed(1)}</td>
                <td class="mono text-right">${p.espesor.toFixed(2)}</td>
                <td class="mono text-right">${p.densidad}</td>
                <td class="mono text-right">${p.disparos}</td>
                <td class="mono text-right">${p.peso}</td>
                <td class="mono text-right">${p.diam}</td>
                <td class="mono text-right">${p.desfasaje}</td>
                <td class="planning-actions-cell"><button class="sensor-nav-btn" data-punz-del="${i}" type="button">Del</button></td>
            </tr>
        `).join('') + `
            <tr class="planning-total-row">
                <td colspan="4" class="text-right">TOTAL</td>
                <td class="mono text-right">${totEsp.toFixed(2)}</td>
                <td></td>
                <td class="mono text-right">${totDisp}</td>
                <td colspan="4"></td>
            </tr>
        `;
        this.elements.punzadosBody.querySelectorAll('[data-punz-del]').forEach(btn => {
            btn.addEventListener('click', () => this.deletePunzado(Number(btn.dataset.punzDel)));
        });
    }

    // ===== BHA =====
    addBha() {
        const desc = this.elements.bhaDesc?.value.trim();
        if (!desc) {
            alert('Ingresá la descripción del componente.');
            return;
        }
        const qty = Number(this.elements.bhaQty?.value) || 1;
        const mxu = Number(this.elements.bhaMxu?.value) || 0;
        const kgm = Number(this.elements.bhaKgm?.value) || 0;
        const longitud = Number((qty * mxu).toFixed(2));
        this.bha.push({
            desc,
            qty,
            mxu,
            longitud,
            od: this.elements.bhaOD?.value.trim() || '',
            id: this.elements.bhaID?.value.trim() || '',
            pin: this.elements.bhaPin?.value.trim() || '',
            box: this.elements.bhaBox?.value.trim() || '',
            kgm,
            pesoTotal: Number((longitud * kgm / 1000).toFixed(3))
        });
        ['bhaDesc', 'bhaQty', 'bhaMxu', 'bhaOD', 'bhaID', 'bhaPin', 'bhaBox', 'bhaKgm'].forEach(k => { if (this.elements[k]) this.elements[k].value = ''; });
        this.saveDraft();
        this.renderBha();
    }

    deleteBha(index) {
        this.bha.splice(index, 1);
        this.saveDraft();
        this.renderBha();
    }

    renderBha() {
        if (!this.elements.bhaBody) return;
        if (!this.bha.length) {
            this.elements.bhaBody.innerHTML =
                '<tr><td colspan="11" class="planning-empty">Sin componentes de BHA. Agregá uno o usá el modelo Workover.</td></tr>';
            return;
        }
        const totLong = this.bha.reduce((s, b) => s + (b.longitud || 0), 0);
        const totPeso = this.bha.reduce((s, b) => s + (b.pesoTotal || 0), 0);
        this.elements.bhaBody.innerHTML = this.bha.map((b, i) => `
            <tr>
                <td>${this.escapeHtml(b.desc)}</td>
                <td class="mono text-right">${b.qty}</td>
                <td class="mono text-right">${(b.mxu || 0).toFixed(2)}</td>
                <td class="mono text-right">${(b.longitud || 0).toFixed(2)}</td>
                <td class="mono">${this.escapeHtml(b.od || '-')}</td>
                <td class="mono">${this.escapeHtml(b.id || '-')}</td>
                <td class="mono">${this.escapeHtml(b.pin || '-')}</td>
                <td class="mono">${this.escapeHtml(b.box || '-')}</td>
                <td class="mono text-right">${(b.kgm || 0).toFixed(2)}</td>
                <td class="mono text-right">${(b.pesoTotal || 0).toFixed(3)}</td>
                <td class="planning-actions-cell"><button class="sensor-nav-btn" data-bha-del="${i}" type="button">Del</button></td>
            </tr>
        `).join('') + `
            <tr class="planning-total-row">
                <td colspan="3" class="text-right">TOTAL</td>
                <td class="mono text-right">${totLong.toFixed(2)}</td>
                <td colspan="5"></td>
                <td class="mono text-right">${totPeso.toFixed(3)}</td>
                <td></td>
            </tr>
        `;
        this.elements.bhaBody.querySelectorAll('[data-bha-del]').forEach(btn => {
            btn.addEventListener('click', () => this.deleteBha(Number(btn.dataset.bhaDel)));
        });
    }

    close() {
        this.elements.view?.classList.add('hidden');
        this.elements.createWellView?.classList.add('hidden');
    }

    isOpen() {
        return this.elements.view && !this.elements.view.classList.contains('hidden');
    }

    isCreateWellOpen() {
        return this.elements.createWellView && !this.elements.createWellView.classList.contains('hidden');
    }

    populateStaticOptions() {
        const currentValue = this.elements.well?.value || '';
        const baseWells = this.dataManager.getAllWells().map(well => ({
            value: well.id,
            label: `${well.id} - ${well.field || well.location || well.name}`
        }));
        const localWells = this.getPlanningWells().map(well => ({
            value: well.id,
            label: `${well.id} - ${well.field || well.location || 'Pozo planificado'}`
        }));
        this.fillSelect(this.elements.well, baseWells.concat(localWells));
        if (currentValue && this.elements.well) this.elements.well.value = currentValue;
        this.fillSelect(this.elements.event, this.catalogs.cat_evento.map(event => ({
            value: event.codigo_evento,
            label: `${event.codigo_evento} - ${event.nombre}`
        })));
        this.fillSelect(this.elements.timeType, this.catalogs.cat_tipo_tiempo.map(type => ({
            value: type.codigo_tiempo,
            label: `${type.nombre}`
        })));
        this.fillSelect(this.elements.npt, [{ value: '', label: 'Sin NPT' }].concat(this.catalogs.cat_npt.map(npt => ({
            value: npt.codigo_npt,
            label: npt.categoria
        }))));

        const currentWell = this.dataManager.getCurrentWell();
        if (currentWell && this.elements.well && !this.elements.well.value) {
            this.elements.well.value = currentWell.id;
        }
        if (this.elements.event && !this.elements.event.value) {
            this.elements.event.value = 'EVT-WO';
        }
        this.populatePhases();
    }

    loadStaticPlanForSelectedWell() {
        const well = this.dataManager.getWellById(this.elements.well?.value);
        if (!well?.wellPlan) return;

        if (this.elements.event) this.elements.event.value = well.wellPlan.eventCode || 'EVT-PERF';
        if (this.elements.objective) this.elements.objective.value = well.wellPlan.objective || '';
        if (this.elements.startDate) this.elements.startDate.value = well.wellPlan.startDate || '';
        if (this.elements.endDate) this.elements.endDate.value = well.wellPlan.endDate || '';
        if (this.elements.rig) this.elements.rig.value = well.wellPlan.rig || well.rig || '';
        if (this.elements.contractor) this.elements.contractor.value = well.wellPlan.contractor || '';
        if (this.elements.supervisor) this.elements.supervisor.value = well.wellPlan.supervisor || '';
        if (this.elements.status) this.elements.status.value = well.wellPlan.status || 'APROBADO';

        this.steps = (well.wellPlan.steps || []).map((step, index) => ({
            id: step.id || `PLAN-${index + 1}`,
            order: index + 1,
            phase: step.phase,
            activity: step.activity,
            operation: step.operation,
            timeType: step.timeType,
            npt: step.npt || '',
            duration: Number(step.duration) || 0,
            cost: Number(step.cost) || 0,
            depthFrom: step.depthFrom ?? null,
            depthTo: step.depthTo ?? null,
            service: step.service || '',
            comments: step.comments || ''
        }));
        this.populatePhases();
        this.saveDraft();
        this.render();
    }

    openCreateWell() {
        this.renderWellForm();
        this.renderLocalWells();
        this.elements.view?.classList.add('hidden');
        this.elements.createWellView?.classList.remove('hidden');
    }

    closeCreateWell() {
        this.elements.createWellView?.classList.add('hidden');
        this.elements.view?.classList.remove('hidden');
        this.populateStaticOptions();
        this.renderLocalWells();
    }

    renderWellForm() {
        if (!this.elements.planningWellForm) return;
        this.elements.planningWellForm.innerHTML = this.wellFields.map(field => {
            const name = field.campo;
            const required = this.isRequiredField(field);
            const type = this.inputTypeForField(field);
            const placeholder = field.ejemplo != null && field.ejemplo !== '' ? `Ej: ${field.ejemplo}` : '';
            const wideClass = ['observaciones', 'locacion', 'nombre_pozo'].includes(name) ? ' planning-field-wide' : '';

            if (type === 'select-boolean') {
                return `
                    <label class="${wideClass.trim()}">
                        <span>${this.escapeHtml(name)}${required ? ' *' : ''}</span>
                        <select data-well-field="${this.escapeHtml(name)}" ${required ? 'required' : ''}>
                            <option value="">Seleccionar</option>
                            <option value="Si">Si</option>
                            <option value="No">No</option>
                        </select>
                    </label>
                `;
            }

            return `
                <label class="${wideClass.trim()}">
                    <span>${this.escapeHtml(name)}${required ? ' *' : ''}</span>
                    <input data-well-field="${this.escapeHtml(name)}" type="${type}" ${required ? 'required' : ''}
                        placeholder="${this.escapeHtml(placeholder)}">
                </label>
            `;
        }).join('');
    }

    savePlanningWell() {
        const inputs = Array.from(this.elements.planningWellForm?.querySelectorAll('[data-well-field]') || []);
        const values = {};
        for (const input of inputs) {
            const key = input.dataset.wellField;
            const field = this.wellFields.find(item => item.campo === key);
            const value = input.value.trim();
            if (this.isRequiredField(field) && !value) {
                alert(`Completa el campo obligatorio: ${key}`);
                input.focus();
                return;
            }
            values[key] = value;
        }

        const id = values.codigo_pozo || values.nombre_pozo || `POZO-${Date.now()}`;
        const wells = this.getPlanningWells().filter(well => well.id !== id);
        const well = {
            id,
            name: values.nombre_pozo || id,
            field: values.yacimiento || values.area || '',
            location: values.locacion || values.area || '',
            status: values.estado_pozo || 'PLANIFICADO',
            plannedTD: this.optionalNumber(values.profundidad_md),
            plannedMD: this.optionalNumber(values.profundidad_md),
            plannedTVD: this.optionalNumber(values.profundidad_tvd),
            source: 'wellPlanningLocal',
            raw: values
        };
        wells.push(well);
        localStorage.setItem(this.wellsStorageKey, JSON.stringify(wells));
        inputs.forEach(input => { input.value = ''; });
        this.populateStaticOptions();
        if (this.elements.well) this.elements.well.value = id;
        this.saveDraft();
        this.renderLocalWells();
        this.closeCreateWell();
    }

    getPlanningWells() {
        try {
            const wells = JSON.parse(localStorage.getItem(this.wellsStorageKey) || '[]');
            return Array.isArray(wells) ? wells : [];
        } catch {
            return [];
        }
    }

    renderLocalWells() {
        if (!this.elements.planningLocalWells) return;
        const wells = this.getPlanningWells();
        if (!wells.length) {
            this.elements.planningLocalWells.innerHTML = '<span class="text-muted">Sin pozos creados localmente.</span>';
            return;
        }
        this.elements.planningLocalWells.innerHTML = wells.map(well => `
            <button class="planning-well-pill" data-well-id="${this.escapeHtml(well.id)}" type="button">
                <span>${this.escapeHtml(well.id)}</span>
                <small>${this.escapeHtml(well.field || well.location || well.status || '')}</small>
            </button>
        `).join('');
        this.elements.planningLocalWells.querySelectorAll('[data-well-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.elements.well) this.elements.well.value = btn.dataset.wellId;
                this.saveDraft();
            });
        });
    }

    isRequiredField(field) {
        return String(field?.obligatorio || '').toLowerCase().startsWith('si');
    }

    inputTypeForField(field) {
        const type = String(field?.tipo_sugerido || '').toLowerCase();
        if (type.includes('fecha')) return 'date';
        if (type.includes('num')) return 'number';
        if (type.includes('si/no') || type.includes('sí/no')) return 'select-boolean';
        return 'text';
    }

    populatePhases() {
        const eventCode = this.elements.event?.value;
        const phases = this.catalogs.cat_fase
            .filter(phase => phase.evento === eventCode)
            .sort((a, b) => a.orden - b.orden)
            .map(phase => ({ value: phase.codigo_fase, label: phase.fase_desc }));
        this.fillSelect(this.elements.phase, phases);
        this.populateActivities();
    }

    populateActivities() {
        const phaseCode = this.elements.phase?.value;
        const rels = this.catalogs.rel_fase_actividad.filter(rel => rel.fase === phaseCode);
        const activityCodes = rels.map(rel => rel.actividad);
        const activities = this.catalogs.cat_actividad
            .filter(activity => activityCodes.includes(activity.codigo_actividad))
            .map(activity => ({ value: activity.codigo_actividad, label: activity.actividad }));
        this.fillSelect(this.elements.activity, activities);
        this.populateOperations();
    }

    populateOperations() {
        const activityCode = this.elements.activity?.value;
        const rels = this.catalogs.rel_actividad_operacion.filter(rel => rel.actividad === activityCode);
        const operationCodes = rels.map(rel => rel.operacion);
        const operations = this.catalogs.cat_operacion
            .filter(operation => operationCodes.includes(operation.codigo_operacion))
            .map(operation => ({ value: operation.codigo_operacion, label: operation.operacion }));
        this.fillSelect(this.elements.operation, operations);
        this.applyOperationDefaults();
    }

    applyOperationDefaults() {
        const operation = this.findOperation(this.elements.operation?.value);
        if (operation && this.elements.timeType) {
            this.elements.timeType.value = operation.tiempo_default || 'TC-OP';
        }
        this.syncNptVisibility();
    }

    syncNptVisibility() {
        const type = this.findTimeType(this.elements.timeType?.value);
        const requiresNpt = type && Number(type.cuenta_npt) === 1;
        if (this.elements.npt) {
            this.elements.npt.disabled = !requiresNpt;
            if (!requiresNpt) this.elements.npt.value = '';
        }
    }

    addStep() {
        this.syncNptVisibility();
        const phase = this.elements.phase?.value;
        const activity = this.elements.activity?.value;
        const operation = this.elements.operation?.value;
        const timeType = this.elements.timeType?.value;
        const duration = Number(this.elements.duration?.value);
        const comments = this.elements.comments?.value.trim();
        const type = this.findTimeType(timeType);

        if (!phase || !activity || !operation || !timeType || !duration || duration <= 0 || !comments) {
            alert('Completa fase, actividad, operacion, tipo de tiempo, duracion y comentarios.');
            return;
        }
        if (type && Number(type.cuenta_npt) === 1 && !this.elements.npt?.value) {
            alert('Para tiempos NPT/demora tenes que seleccionar categoria NPT.');
            return;
        }

        const step = {
            id: `STEP-${Date.now()}`,
            order: this.steps.length + 1,
            phase,
            activity,
            operation,
            timeType,
            npt: this.elements.npt?.value || '',
            duration,
            cost: this.optionalNumber(this.elements.cost?.value) || 0,
            depthFrom: this.optionalNumber(this.elements.depthFrom?.value),
            depthTo: this.optionalNumber(this.elements.depthTo?.value),
            service: this.elements.service?.value.trim() || '',
            comments
        };
        this.steps.push(step);
        this.elements.duration.value = '';
        if (this.elements.cost) this.elements.cost.value = '';
        this.elements.depthFrom.value = '';
        this.elements.depthTo.value = '';
        this.elements.service.value = '';
        this.elements.comments.value = '';
        this.saveDraft();
        this.render();
    }

    loadSampleSteps() {
        if (this.elements.event) this.elements.event.value = 'EVT-WO';
        this.populatePhases();
        if (this.elements.objective) {
            this.elements.objective.value = 'Workover de reparación: aislar intervalo agotado, punzar y estimular nuevas capas y bajar instalación de producción.';
        }
        if (this.elements.status) this.elements.status.value = 'APROBADO';

        // Plan Workover de ejemplo (~8 días) con tiempos y costos, hasta la bajada de instalación final
        const rows = [
            // Día 1 — Montaje
            { phase: 'PH-WO-DESM', activity: 'ACT-DTM', operation: 'OP-TRANSPORTA', timeType: 'TC-DTM', npt: '', duration: 6,  cost: 12000, depthFrom: null, depthTo: null, comments: 'Transporte y movilización del equipo de pulling/workover a la locación.' },
            { phase: 'PH-WO-DESM', activity: 'ACT-DTM', operation: 'OP-MONTA', timeType: 'TC-DTM', npt: '', duration: 12, cost: 28000, depthFrom: null, depthTo: null, comments: 'Montaje del equipo, anclaje y prueba de sistemas de seguridad.' },
            { phase: 'PH-WO-SACAR-INST', activity: 'ACT-CIRCULAR', operation: 'OP-BOMB-INY-CIRC-DESP', timeType: 'TC-OP', npt: '', duration: 8, cost: 14000, depthFrom: 0, depthTo: 1950, comments: 'Control de pozo: circulación y desplazamiento a fluido de matar.' },
            // Día 2 — Sacar instalación
            { phase: 'PH-WO-SACAR-INST', activity: 'ACT-SACAR-BOMBA', operation: 'OP-SACA-CSG-TBG-VB', timeType: 'TC-OP', npt: '', duration: 9, cost: 18000, depthFrom: 1950, depthTo: 0, comments: 'Sacada de bomba de fondo y sarta de varillas.' },
            { phase: 'PH-WO-SACAR-INST', activity: 'ACT-SACAR-INST', operation: 'OP-SACA-CSG-TBG-VB', timeType: 'TC-OP', npt: '', duration: 12, cost: 20000, depthFrom: 1950, depthTo: 0, comments: 'Sacada de tubing de producción, revisión y estiba.' },
            { phase: 'PH-WO-SACAR-INST', activity: 'ACT-SACAR-INST', operation: 'OP-VIAJE', timeType: 'TC-NPT', npt: 'NPT-EQ', duration: 4, cost: 6000, depthFrom: null, depthTo: null, comments: 'NPT: espera por reparación de llave hidráulica de potencia.' },
            // Día 3 — Aislación / cementación secundaria
            { phase: 'PH-WO-CEMENTAR', activity: 'ACT-CEMENTAR', operation: 'OP-CEMENTA', timeType: 'TC-SBY', npt: '', duration: 8, cost: 35000, depthFrom: 1946, depthTo: 1947.5, comments: 'Cementación secundaria (squeeze) para aislar intervalo agotado.' },
            { phase: 'PH-WO-CEMENTAR', activity: 'ACT-CEMENTAR', operation: 'OP-CEMENTA', timeType: 'TC-SBY', npt: '', duration: 16, cost: 6000, depthFrom: null, depthTo: null, comments: 'Espera de fragüe de cemento (WOC).' },
            // Día 4 — Punzados
            { phase: 'PH-WO-PUNZAR', activity: 'ACT-PUNZAR', operation: 'OP-PUNZA-NO-WL', timeType: 'TC-OP', npt: '', duration: 6, cost: 22000, depthFrom: 1747.5, depthTo: 1750.5, comments: 'Punzado Fm. Comodoro Rivadavia 1747.5–1750.5 m (4 tpp).' },
            { phase: 'PH-WO-PUNZAR', activity: 'ACT-PUNZAR', operation: 'OP-PUNZA-NO-WL', timeType: 'TC-OP', npt: '', duration: 4, cost: 15000, depthFrom: 1938, depthTo: 1939.5, comments: 'Punzado Fm. Mina del Carmen 1938.0–1939.5 m (4 tpp).' },
            { phase: 'PH-WO-PUNZAR', activity: 'ACT-PUNZAR', operation: 'OP-PUNZA-NO-WL', timeType: 'TC-OP', npt: '', duration: 4, cost: 15000, depthFrom: 1946, depthTo: 1947.5, comments: 'Punzado Fm. Cañadón Seco 1946.0–1947.5 m (4 tpp).' },
            { phase: 'PH-WO-PUNZAR', activity: 'ACT-ENSAYO', operation: 'OP-PRUEBA-HERM', timeType: 'TC-OP', npt: '', duration: 5, cost: 9000, depthFrom: null, depthTo: null, comments: 'Prueba de hermeticidad de cañería post-punzado.' },
            // Día 5 — Estimulación
            { phase: 'PH-WO-ESTIMULAR', activity: 'ACT-ESTIMULAR', operation: 'OP-ESTIMULA', timeType: 'TC-SBY', npt: '', duration: 14, cost: 60000, depthFrom: 1747.5, depthTo: 1947.5, comments: 'Estimulación de los intervalos punzados.' },
            { phase: 'PH-WO-ESTIMULAR', activity: 'ACT-ESTIMULAR', operation: 'OP-BOMB-INY-CIRC-DESP', timeType: 'TC-WTH', npt: 'NPT-CLIMA', duration: 6, cost: 4000, depthFrom: null, depthTo: null, comments: 'NPT: demora por viento fuerte (operativa suspendida por seguridad).' },
            // Día 6 — Ensayo
            { phase: 'PH-WO-ENSAYAR', activity: 'ACT-ENSAYO', operation: 'OP-ENSAYA', timeType: 'TC-OP', npt: '', duration: 18, cost: 22000, depthFrom: null, depthTo: null, comments: 'Ensayo de pozo / evaluación de producción de los nuevos intervalos.' },
            { phase: 'PH-WO-ENSAYAR', activity: 'ACT-ADMISION', operation: 'OP-PRUEBA-ADM-CIRC', timeType: 'TC-OP', npt: '', duration: 6, cost: 9000, depthFrom: null, depthTo: null, comments: 'Prueba de admisión y circulación.' },
            // Día 7 — Bajar instalación
            { phase: 'PH-WO-BAJAR-INST', activity: 'ACT-BAJAR-INST', operation: 'OP-BAJA-CSG-TBG-VB', timeType: 'TC-OP', npt: '', duration: 10, cost: 22000, depthFrom: 0, depthTo: 1950, comments: 'Bajada de tubing de producción nuevo con calibre.' },
            { phase: 'PH-WO-BAJAR-INST', activity: 'ACT-BAJAR-BOMBA', operation: 'OP-BAJA-CSG-TBG-VB', timeType: 'TC-OP', npt: '', duration: 12, cost: 28000, depthFrom: 0, depthTo: 1950, comments: 'Bajada de instalación final: bomba de fondo y sarta de varillas.' },
            // Día 8 — Prueba final y desmontaje
            { phase: 'PH-WO-ENSAYAR', activity: 'ACT-HERMETICIDAD', operation: 'OP-PRUEBA-HERM', timeType: 'TC-OP', npt: '', duration: 5, cost: 8000, depthFrom: null, depthTo: null, comments: 'Prueba de hermeticidad de la instalación final y puesta en producción.' },
            { phase: 'PH-WO-DESM', activity: 'ACT-DTM', operation: 'OP-DESMONTA', timeType: 'TC-DTM', npt: '', duration: 9, cost: 22000, depthFrom: null, depthTo: null, comments: 'Desmontaje del equipo y acondicionamiento de locación.' },
            { phase: 'PH-WO-DESM', activity: 'ACT-DTM', operation: 'OP-TRANSPORTA', timeType: 'TC-DTM', npt: '', duration: 6, cost: 12000, depthFrom: null, depthTo: null, comments: 'Retiro y transporte del equipo fuera de la locación.' }
        ];

        this.steps = rows.map((r, index) => ({
            id: `SAMPLE-${index + 1}`,
            order: index + 1,
            phase: r.phase,
            activity: r.activity,
            operation: r.operation,
            timeType: r.timeType,
            npt: r.npt || '',
            duration: r.duration,
            cost: r.cost,
            depthFrom: r.depthFrom,
            depthTo: r.depthTo,
            service: '',
            comments: r.comments
        }));

        this.loadSampleProgramsTemplate();
        this.saveDraft();
        this.render();
        this.renderPunzados();
        this.renderBha();
        this.renderCasings();
    }

    // Plantilla de muestra (Modelo Workover): cañerías, punzados y BHA
    loadSampleProgramsTemplate() {
        this.punzados = [
            { formacion: 'Comodoro Rivadavia', metodo: 'WL', tope: 1747.5, base: 1750.5, espesor: 3.00, densidad: 4, disparos: 39, peso: 32, diam: 4, desfasaje: 90 },
            { formacion: 'Mina del Carmen',    metodo: 'WL', tope: 1938.0, base: 1939.5, espesor: 1.50, densidad: 4, disparos: 20, peso: 32, diam: 4, desfasaje: 90 },
            { formacion: 'Cañadón Seco',       metodo: 'WL', tope: 1946.0, base: 1947.5, espesor: 1.50, densidad: 4, disparos: 20, peso: 32, diam: 4, desfasaje: 90 }
        ];
        this.bha = [
            { desc: 'Trépano 17 1/2"',        qty: 1, mxu: 0.70,  longitud: 0.70,  od: '17.5',  id: 'N/A',    pin: '7 5/8 REG', box: '',          kgm: 121.43, pesoTotal: Number((0.70 * 121.43 / 1000).toFixed(3)) },
            { desc: 'Reducción 9"',           qty: 1, mxu: 0.96,  longitud: 0.96,  od: '1.66',  id: '8.812',  pin: '7 5/8 REG', box: '6 5/8 REG', kgm: 273.07, pesoTotal: Number((0.96 * 273.07 / 1000).toFixed(3)) },
            { desc: 'Portamecha 8"',          qty: 1, mxu: 9.14,  longitud: 9.14,  od: '10.80', id: '3',      pin: '6 5/8 REG', box: '6 5/8 REG', kgm: 218.77, pesoTotal: Number((9.14 * 218.77 / 1000).toFixed(3)) },
            { desc: 'Estabilizador 17 7/16"', qty: 1, mxu: 1.88,  longitud: 1.88,  od: '12.68', id: '17.437', pin: '6 5/8 REG', box: '6 5/8 REG', kgm: 255.92, pesoTotal: Number((1.88 * 255.92 / 1000).toFixed(3)) },
            { desc: 'Portamecha 8"',          qty: 5, mxu: 9.14,  longitud: 45.70, od: '10.80', id: '3',      pin: '6 5/8 REG', box: '6 5/8 REG', kgm: 218.77, pesoTotal: Number((45.70 * 218.77 / 1000).toFixed(3)) }
        ];
        if (this.elements.bhaWobMax) this.elements.bhaWobMax.value = 9.3;
        if (this.elements.bhaMudWeight) this.elements.bhaMudWeight.value = 1070;

        // Cañerías de muestra sobre el pozo seleccionado (si es un pozo existente)
        const wellId = this.elements.well?.value;
        const well = this.dataManager.getWellById(wellId);
        if (well) {
            const casings = [
                { label: 'Cañería Guía',          size: '13-3/8"', grade: 'K-55',  weight: '54.5#', shoeMD: 350,  tocMD: 0,    set: true },
                { label: 'Aislación Intermedia',  size: '9-5/8"',  grade: 'N-80',  weight: '47#',   shoeMD: 1500, tocMD: 300,  set: true },
                { label: 'Producción',            size: '7"',      grade: 'N-80',  weight: '29#',   shoeMD: 1950, tocMD: 1200, set: false }
            ];
            this.dataManager.updateWellCasings(wellId, casings);
            this.refreshSchematic(wellId, well);
        }
    }

    clearPlan() {
        this.steps = [];
        this.punzados = [];
        this.bha = [];
        this.saveDraft();
        this.render();
        this.renderPunzados();
        this.renderBha();
    }

    render() {
        if (!this.elements.tableBody) return;
        if (!this.steps.length) {
            this.elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="12" class="planning-empty">Sin pasos cargados. Agrega pasos o usa el modelo Workover.</td>
                </tr>
            `;
        } else {
            this.elements.tableBody.innerHTML = this.steps.map(step => this.stepRow(step)).join('');
            this.elements.tableBody.querySelectorAll('[data-action="delete"]').forEach(btn => {
                btn.addEventListener('click', () => this.deleteStep(btn.dataset.id));
            });
            this.elements.tableBody.querySelectorAll('[data-action="duplicate"]').forEach(btn => {
                btn.addEventListener('click', () => this.duplicateStep(btn.dataset.id));
            });
        }
        this.renderSummary();
    }

    stepRow(step) {
        return `
            <tr>
                <td class="mono text-center">${step.order}</td>
                <td><span class="plan-chip">${this.labelPhase(step.phase)}</span></td>
                <td><span class="plan-chip">${this.labelActivity(step.activity)}</span></td>
                <td><span class="plan-chip">${this.labelOperation(step.operation)}</span></td>
                <td class="mono text-right">${step.duration.toFixed(1)}h</td>
                <td class="mono text-right">${this.dataManager.formatUSD(step.cost || 0)}</td>
                <td class="mono text-right">${step.depthFrom ?? '-'}</td>
                <td class="mono text-right">${step.depthTo ?? '-'}</td>
                <td><span class="plan-chip time">${this.labelTimeType(step.timeType)}</span></td>
                <td>${step.npt ? `<span class="plan-chip npt">${this.labelNpt(step.npt)}</span>` : '-'}</td>
                <td>${this.escapeHtml(step.comments)}</td>
                <td class="planning-actions-cell">
                    <button class="sensor-nav-btn" data-action="duplicate" data-id="${step.id}" type="button">Dup</button>
                    <button class="sensor-nav-btn" data-action="delete" data-id="${step.id}" type="button">Del</button>
                </td>
            </tr>
        `;
    }

    duplicateStep(id) {
        const source = this.steps.find(step => step.id === id);
        if (!source) return;
        this.steps.push({ ...source, id: `STEP-${Date.now()}`, order: this.steps.length + 1 });
        this.saveDraft();
        this.render();
    }

    deleteStep(id) {
        this.steps = this.steps
            .filter(step => step.id !== id)
            .map((step, index) => ({ ...step, order: index + 1 }));
        this.saveDraft();
        this.render();
    }

    renderSummary() {
        const total = this.steps.reduce((sum, step) => sum + step.duration, 0);
        const npt = this.steps
            .filter(step => {
                const type = this.findTimeType(step.timeType);
                return type && Number(type.cuenta_npt) === 1;
            })
            .reduce((sum, step) => sum + step.duration, 0);
        const rtp = this.steps
            .filter(step => {
                const type = this.findTimeType(step.timeType);
                return type && Number(type.cuenta_rtp) === 1;
            })
            .reduce((sum, step) => sum + step.duration, 0);
        const totalCost = this.steps.reduce((sum, step) => sum + (Number(step.cost) || 0), 0);

        this.elements.summary.innerHTML = `
            <div class="loc-stat tone-blue">
                <div class="loc-stat-value">${this.steps.length}</div>
                <div class="loc-stat-label">Pasos</div>
            </div>
            <div class="loc-stat tone-cyan">
                <div class="loc-stat-value">${total.toFixed(1)}h</div>
                <div class="loc-stat-label">Horas plan</div>
            </div>
            <div class="loc-stat tone-green">
                <div class="loc-stat-value">${rtp.toFixed(1)}h</div>
                <div class="loc-stat-label">RTP</div>
            </div>
            <div class="loc-stat tone-yellow">
                <div class="loc-stat-value">${npt.toFixed(1)}h</div>
                <div class="loc-stat-label">NPT/Demoras</div>
            </div>
            <div class="loc-stat tone-blue">
                <div class="loc-stat-value">${this.dataManager.formatUSD(totalCost)}</div>
                <div class="loc-stat-label">Costo plan</div>
            </div>
        `;
    }

    saveDraft() {
        const draft = {
            wellId: this.elements.well?.value || '',
            eventCode: this.elements.event?.value || '',
            objective: this.elements.objective?.value || '',
            startDate: this.elements.startDate?.value || '',
            endDate: this.elements.endDate?.value || '',
            rig: this.elements.rig?.value || '',
            contractor: this.elements.contractor?.value || '',
            supervisor: this.elements.supervisor?.value || '',
            status: this.elements.status?.value || 'BORRADOR',
            steps: this.steps,
            punzados: this.punzados,
            bha: this.bha,
            bhaWobMax: this.elements.bhaWobMax?.value || '',
            bhaMudWeight: this.elements.bhaMudWeight?.value || ''
        };
        localStorage.setItem(this.storageKey, JSON.stringify(draft));
    }

    loadDraft() {
        try {
            const draft = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
            this.steps = Array.isArray(draft.steps) ? draft.steps : [];
            this.punzados = Array.isArray(draft.punzados) ? draft.punzados : [];
            this.bha = Array.isArray(draft.bha) ? draft.bha : [];
            setTimeout(() => {
                if (this.elements.well && draft.wellId) this.elements.well.value = draft.wellId;
                if (this.elements.event && draft.eventCode) this.elements.event.value = draft.eventCode;
                if (this.elements.objective) this.elements.objective.value = draft.objective || '';
                if (this.elements.startDate) this.elements.startDate.value = draft.startDate || '';
                if (this.elements.endDate) this.elements.endDate.value = draft.endDate || '';
                if (this.elements.rig) this.elements.rig.value = draft.rig || '';
                if (this.elements.contractor) this.elements.contractor.value = draft.contractor || '';
                if (this.elements.supervisor) this.elements.supervisor.value = draft.supervisor || '';
                if (this.elements.status) this.elements.status.value = draft.status || 'BORRADOR';
                if (this.elements.bhaWobMax) this.elements.bhaWobMax.value = draft.bhaWobMax || '';
                if (this.elements.bhaMudWeight) this.elements.bhaMudWeight.value = draft.bhaMudWeight || '';
                this.populatePhases();
                this.render();
                this.renderPunzados();
                this.renderBha();
            }, 0);
        } catch (error) {
            this.steps = [];
            this.punzados = [];
            this.bha = [];
        }
    }

    fillSelect(select, options) {
        if (!select) return;
        select.innerHTML = options.map(option =>
            `<option value="${this.escapeHtml(option.value)}">${this.escapeHtml(option.label)}</option>`
        ).join('');
    }

    optionalNumber(value) {
        if (value === '' || value == null) return null;
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    }

    diffHours(start, end) {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    }

    findOperation(code) { return this.catalogs.cat_operacion.find(item => item.codigo_operacion === code); }
    findTimeType(code) { return this.catalogs.cat_tipo_tiempo.find(item => item.codigo_tiempo === code); }
    labelPhase(code) { return this.catalogs.cat_fase.find(item => item.codigo_fase === code)?.fase_desc || code; }
    labelActivity(code) { return this.catalogs.cat_actividad.find(item => item.codigo_actividad === code)?.actividad || code; }
    labelOperation(code) { return this.findOperation(code)?.operacion || code; }
    labelTimeType(code) { return this.findTimeType(code)?.nombre || code; }
    labelNpt(code) { return this.catalogs.cat_npt.find(item => item.codigo_npt === code)?.categoria || code; }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

window.WellPlanningManager = WellPlanningManager;
