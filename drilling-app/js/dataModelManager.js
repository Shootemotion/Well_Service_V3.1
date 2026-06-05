// ============================================
// DATA MODEL MANAGER - Vista de tablas y relaciones
// ============================================

class DataModelManager {
    constructor() {
        this.elements = {};
        this.tables = [];
        this.currentTable = null;
        this.searchQuery = '';
        this.isInitialized = false;
        this.isLoading = false;
    }

    async init() {
        if (this.isInitialized || this.isLoading) return;
        this.isLoading = true;
        this.elements = {
            view: document.getElementById('dataModelView'),
            openBtn: document.getElementById('openDataModelBtn'),
            closeBtn: document.getElementById('closeDataModelBtn'),
            tableList: document.getElementById('dataModelTableList'),
            tableTitle: document.getElementById('dataModelTableTitle'),
            tableDescription: document.getElementById('dataModelTableDescription'),
            tableMeta: document.getElementById('dataModelTableMeta'),
            tableHead: document.getElementById('dataModelTableHead'),
            tableBody: document.getElementById('dataModelTableBody'),
            search: document.getElementById('dataModelSearch')
        };

        this.bindEvents();
        try {
            await this.loadTables();
            this.currentTable = this.tables[0] || null;
            this.render();
            this.isInitialized = true;
        } catch (error) {
            console.error('No se pudo cargar Modelo Datos:', error);
            if (this.elements.tableBody) {
                this.elements.tableBody.innerHTML = '<tr><td class="planning-empty">No se pudo cargar el modelo de datos.</td></tr>';
            }
        } finally {
            this.isLoading = false;
        }
    }

    async loadTables() {
        const [catalogsResponse, dictionaryResponse] = await Promise.all([
            fetch('./data/wellPlanningCatalogs.json'),
            fetch('./data/dataModelDictionary.json')
        ]);
        const catalogs = await catalogsResponse.json();
        const dictionary = await dictionaryResponse.json();

        const dictionaryTables = (dictionary.groups || []).flatMap(group =>
            group.tables.map(table => ({
                group: group.group_name,
                code: table.table_code,
                name: table.table_name,
                description: table.description,
                rows: table.columns
            }))
        );

        const catalogTables = [
            this.fromRows('catalogos', 'cat_evento', 'Cat_Evento', 'Tipos principales de trabajo sobre el pozo.', catalogs.cat_evento),
            this.fromRows('catalogos', 'cat_fase', 'Cat_Fase', 'Fases validas por evento.', catalogs.cat_fase),
            this.fromRows('catalogos', 'cat_actividad', 'Cat_Actividad', 'Actividades normalizadas.', catalogs.cat_actividad),
            this.fromRows('catalogos', 'cat_operacion', 'Cat_Operacion', 'Operaciones cargables y tipo de tiempo default.', catalogs.cat_operacion),
            this.fromRows('catalogos', 'cat_tipo_tiempo', 'Cat_Tipo_Tiempo', 'Clasificacion de tiempo RTP/NPT.', catalogs.cat_tipo_tiempo),
            this.fromRows('catalogos', 'cat_estado', 'Cat_Estado', 'Estados de pozo/evento.', catalogs.cat_estado),
            this.fromRows('catalogos', 'cat_npt', 'Cat_Npt', 'Categorias de NPT y demoras.', catalogs.cat_npt),
            this.fromRows('relaciones', 'rel_fase_actividad', 'Rel_Fase_Actividad', 'Que actividades se habilitan segun la fase.', catalogs.rel_fase_actividad),
            this.fromRows('relaciones', 'rel_actividad_operacion', 'Rel_Actividad_Operacion', 'Que operaciones se habilitan segun la actividad.', catalogs.rel_actividad_operacion),
            this.fromRows('ejemplos', 'sample_plan_steps', 'Ejemplo_Plan_Workover', 'Modelo de plan Workover usado en Well Planning.', catalogs.sample_plan_steps)
        ];

        this.tables = dictionaryTables.concat(catalogTables);
    }

    bindEvents() {
        this.elements.openBtn?.addEventListener('click', () => this.open());
        this.elements.closeBtn?.addEventListener('click', () => this.close());
        this.elements.search?.addEventListener('input', event => {
            this.searchQuery = event.target.value.trim().toLowerCase();
            this.renderTableList();
            this.renderTable();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && this.isOpen()) this.close();
        });
    }

    open() {
        if (!this.tables.length && !this.isLoading) {
            this.init().then(() => {
                this.elements.view?.classList.remove('hidden');
            });
            return;
        }
        this.render();
        this.elements.view?.classList.remove('hidden');
    }

    close() {
        this.elements.view?.classList.add('hidden');
    }

    isOpen() {
        return this.elements.view && !this.elements.view.classList.contains('hidden');
    }

    render() {
        this.renderTableList();
        this.renderTable();
    }

    renderTableList() {
        if (!this.elements.tableList) return;
        const grouped = this.filteredTables().reduce((acc, table) => {
            if (!acc[table.group]) acc[table.group] = [];
            acc[table.group].push(table);
            return acc;
        }, {});

        this.elements.tableList.innerHTML = Object.entries(grouped).map(([group, tables]) => `
            <div class="data-model-group">
                <div class="data-model-group-title">${this.escapeHtml(group)}</div>
                ${tables.map(table => `
                    <button class="data-model-table-btn ${this.currentTable?.code === table.code ? 'active' : ''}" data-table="${this.escapeHtml(table.code)}" type="button">
                        <span>${this.escapeHtml(table.name)}</span>
                        <small>${table.rows.length} filas</small>
                    </button>
                `).join('')}
            </div>
        `).join('');

        this.elements.tableList.querySelectorAll('.data-model-table-btn').forEach(button => {
            button.addEventListener('click', () => {
                this.currentTable = this.tables.find(table => table.code === button.dataset.table) || this.currentTable;
                this.render();
            });
        });
    }

    renderTable() {
        if (!this.currentTable) return;
        const rows = this.filteredRows(this.currentTable);
        const columns = this.columnsForRows(rows.length ? rows : this.currentTable.rows);

        this.elements.tableTitle.textContent = this.currentTable.name;
        this.elements.tableDescription.textContent = this.currentTable.description || '';
        this.elements.tableMeta.textContent = `${this.currentTable.group} · ${this.currentTable.rows.length} filas · ${columns.length} columnas`;

        this.elements.tableHead.innerHTML = `
            <tr>
                ${columns.map(col => `<th>${this.escapeHtml(this.prettyColumn(col))}</th>`).join('')}
            </tr>
        `;
        this.elements.tableBody.innerHTML = rows.length
            ? rows.map(row => `
                <tr>
                    ${columns.map(col => `<td>${this.formatCell(row[col])}</td>`).join('')}
                </tr>
            `).join('')
            : `<tr><td colspan="${columns.length}" class="planning-empty">Sin resultados para la busqueda actual.</td></tr>`;
    }

    filteredTables() {
        if (!this.searchQuery) return this.tables;
        return this.tables.filter(table => {
            const haystack = `${table.name} ${table.code} ${table.description}`.toLowerCase();
            return haystack.includes(this.searchQuery) || this.filteredRows(table).length > 0;
        });
    }

    filteredRows(table) {
        if (!this.searchQuery) return table.rows;
        return table.rows.filter(row =>
            Object.values(row).join(' ').toLowerCase().includes(this.searchQuery)
        );
    }

    fromRows(group, code, name, description, rows) {
        return { group, code, name, description, rows: rows || [] };
    }

    columnsForRows(rows) {
        const columns = [];
        rows.forEach(row => {
            Object.keys(row || {}).forEach(key => {
                if (!columns.includes(key)) columns.push(key);
            });
        });
        return columns;
    }

    prettyColumn(column) {
        return String(column).replace(/_/g, ' ');
    }

    formatCell(value) {
        if (value == null || value === '') return '<span class="text-muted">-</span>';
        if (typeof value === 'boolean') return value ? 'Si' : 'No';
        return this.escapeHtml(String(value));
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

window.DataModelManager = DataModelManager;

document.addEventListener('DOMContentLoaded', () => {
    const openBtn = document.getElementById('openDataModelBtn');
    if (!openBtn) return;

    openBtn.addEventListener('click', async () => {
        const manager = window.app?.dataModelManager || window.dataModelManager || new DataModelManager();
        window.dataModelManager = manager;
        await manager.init();
        manager.open();
    });
});
