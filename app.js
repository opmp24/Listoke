// Estado inicial o carga desde LocalStorage
let appData = JSON.parse(localStorage.getItem('listokeData')) || [
    {
        id: 'list-' + Date.now(),
        title: 'Mi Primera Lista',
        expanded: true,
        tasks: []
    }
];

const container = document.getElementById('mainContainer');

// --- Funciones de Renderizado ---

function render() {
    if (!container) return;
    container.innerHTML = '';
    
    appData.forEach(list => {
        const listEl = createListElement(list);
        container.appendChild(listEl);
        
        // Inicializar Sortable para las Tareas dentro de esta Lista
        const tasksContainer = listEl.querySelector('.tasks-container');
        if (typeof Sortable !== 'undefined') {
            new Sortable(tasksContainer, {
                group: 'shared-tasks',
                animation: 150,
                handle: '.task-handle',
                onEnd: () => handleDragEnd()
            });
        }

        // Renderizar Tareas
        if (list.expanded) {
            list.tasks.forEach(task => {
                const taskEl = createTaskElement(task, list.id);
                tasksContainer.appendChild(taskEl);

                // Inicializar Sortable para Items dentro de esta Tarea
                const itemsContainer = taskEl.querySelector('.items-container');
                if (typeof Sortable !== 'undefined') {
                    new Sortable(itemsContainer, {
                        group: 'shared-items',
                        animation: 150,
                        onEnd: () => handleDragEnd()
                    });
                }

                // Renderizar Items
                if (task.expanded) {
                    task.items.forEach(item => {
                        const itemEl = createItemElement(item, task.id, list.id);
                        itemsContainer.appendChild(itemEl);
                    });
                }
            });
        }
    });

    // Inicializar Sortable para las Listas principales
    if (typeof Sortable !== 'undefined') {
        new Sortable(container, {
            animation: 150,
            handle: '.list-handle',
            onEnd: () => handleDragEnd()
        });
    }
}

// --- Creación de Elementos DOM ---

function createListElement(list) {
    const div = document.createElement('div');
    div.className = 'card shadow-sm border-0 list-item';
    div.dataset.id = list.id;
    div.innerHTML = `
        <div class="card-header bg-white d-flex align-items-center justify-content-between py-3">
            <div class="d-flex align-items-center flex-grow-1 gap-2">
                <i class="bi bi-grip-vertical text-muted list-handle" style="cursor: grab;"></i>
                <button class="btn btn-sm btn-link text-dark p-0 text-decoration-none" onclick="toggleExpand('list', '${list.id}')">
                    <i class="bi bi-chevron-${list.expanded ? 'down' : 'right'}"></i>
                </button>
                <input type="text" class="form-control form-control-sm border-0 fw-bold fs-5" value="${list.title}" onchange="updateTitle('list', '${list.id}', this.value)">
            </div>
            <div class="dropdown">
                <button class="btn btn-light btn-sm rounded-circle" data-bs-toggle="dropdown"><i class="bi bi-three-dots-vertical"></i></button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item text-danger" href="#" onclick="deleteItem('list', '${list.id}')">Eliminar Lista</a></li>
                </ul>
            </div>
        </div>
        <div class="card-body bg-light p-2 ${list.expanded ? '' : 'd-none'}">
            <div class="tasks-container d-flex flex-column gap-2 min-h-50"></div>
            <button class="btn btn-outline-primary btn-sm w-100 mt-2 dashed-border" onclick="addNew('task', '${list.id}')">
                <i class="bi bi-plus"></i> Agregar Tarea
            </button>
        </div>
    `;
    return div;
}

function createTaskElement(task, listId) {
    const div = document.createElement('div');
    div.className = 'card border-0 shadow-sm task-item ms-2';
    div.dataset.id = task.id;
    div.innerHTML = `
        <div class="card-body p-2">
            <div class="d-flex align-items-center justify-content-between mb-2">
                <div class="d-flex align-items-center flex-grow-1 gap-2">
                    <i class="bi bi-grip-vertical text-muted task-handle" style="cursor: grab;"></i>
                    <button class="btn btn-sm btn-link text-dark p-0" onclick="toggleExpand('task', '${task.id}', '${listId}')">
                        <i class="bi bi-chevron-${task.expanded ? 'down' : 'right'}"></i>
                    </button>
                    <input type="text" class="form-control form-control-sm border-0 fw-semibold" value="${task.title}" onchange="updateTitle('task', '${task.id}', this.value, '${listId}')">
                </div>
                <button class="btn btn-sm text-danger opacity-50 hover-opacity-100" onclick="deleteItem('task', '${task.id}', '${listId}')"><i class="bi bi-trash"></i></button>
            </div>
            <div class="items-container ps-4 ${task.expanded ? '' : 'd-none'} min-h-30"></div>
            <div class="ps-4 mt-1 ${task.expanded ? '' : 'd-none'}">
                <div class="input-group input-group-sm">
                    <input type="text" class="form-control" placeholder="Nuevo item..." onkeypress="if(event.key === 'Enter') addNew('item', '${task.id}', '${listId}', this)">
                    <button class="btn btn-outline-secondary" onclick="addNew('item', '${task.id}', '${listId}', this.previousElementSibling)"><i class="bi bi-plus"></i></button>
                </div>
            </div>
        </div>
    `;
    return div;
}

function createItemElement(item, taskId, listId) {
    const div = document.createElement('div');
    div.className = 'd-flex align-items-center gap-2 p-1 bg-white border rounded mb-1 item-row';
    div.dataset.id = item.id;
    div.innerHTML = `
        <i class="bi bi-grip-vertical text-muted small" style="cursor: grab;"></i>
        <input type="checkbox" class="form-check-input mt-0" ${item.done ? 'checked' : ''} onchange="toggleDone('${item.id}', '${taskId}', '${listId}')">
        <input type="text" class="form-control form-control-sm border-0 ${item.done ? 'text-decoration-line-through text-muted' : ''}" value="${item.text}" onchange="updateTitle('item', '${item.id}', this.value, '${taskId}', '${listId}')">
        <button class="btn btn-sm text-danger p-0 ms-auto" onclick="deleteItem('item', '${item.id}', '${taskId}', '${listId}')"><i class="bi bi-x"></i></button>
    `;
    return div;
}

// --- Lógica de Datos y Eventos Globales ---

window.addNew = (type, parentId, grandParentId, inputEl) => {
    const id = Date.now().toString();
    
    if (type === 'list') {
        appData.push({ id: 'list-' + id, title: 'Nueva Lista', expanded: true, tasks: [] });
    } else if (type === 'task') {
        const list = appData.find(l => l.id === parentId);
        if (list) list.tasks.push({ id: 'task-' + id, title: 'Nueva Tarea', expanded: true, items: [] });
    } else if (type === 'item') {
        if (!inputEl.value.trim()) return;
        const list = appData.find(l => l.id === grandParentId);
        const task = list?.tasks.find(t => t.id === parentId);
        if (task) {
            task.items.push({ id: 'item-' + id, text: inputEl.value, done: false });
            inputEl.value = ''; // Limpiar input
            inputEl.focus(); // Mantener foco
        }
    }
    saveAndRender();
};

window.deleteItem = (type, id, parentId, grandParentId) => {
    if (!confirm('¿Estás seguro de eliminar esto?')) return;
    
    if (type === 'list') {
        appData = appData.filter(l => l.id !== id);
    } else if (type === 'task') {
        const list = appData.find(l => l.id === parentId);
        if (list) list.tasks = list.tasks.filter(t => t.id !== id);
    } else if (type === 'item') {
        const list = appData.find(l => l.id === grandParentId);
        const task = list?.tasks.find(t => t.id === parentId);
        if (task) task.items = task.items.filter(i => i.id !== id);
    }
    saveAndRender();
};

window.toggleExpand = (type, id, parentId) => {
    if (type === 'list') {
        const list = appData.find(l => l.id === id);
        if (list) list.expanded = !list.expanded;
    } else if (type === 'task') {
        const list = appData.find(l => l.id === parentId);
        const task = list?.tasks.find(t => t.id === id);
        if (task) task.expanded = !task.expanded;
    }
    saveAndRender();
};

window.updateTitle = (type, id, value, parentId, grandParentId) => {
    if (type === 'list') {
        const list = appData.find(l => l.id === id);
        if (list) list.title = value;
    } else if (type === 'task') {
        const list = appData.find(l => l.id === parentId);
        const task = list?.tasks.find(t => t.id === id);
        if (task) task.title = value;
    } else if (type === 'item') {
        const list = appData.find(l => l.id === grandParentId);
        const task = list?.tasks.find(t => t.id === parentId);
        const item = task?.items.find(i => i.id === id);
        if (item) item.text = value;
    }
    saveData();
};

window.toggleDone = (id, taskId, listId) => {
    const list = appData.find(l => l.id === listId);
    const task = list?.tasks.find(t => t.id === taskId);
    const item = task?.items.find(i => i.id === id);
    if (item) {
        item.done = !item.done;
        saveAndRender();
    }
};

function handleDragEnd() {
    // Reconstruir el estado basado en el DOM actual
    const newListData = [];
    const listElements = container.querySelectorAll('.list-item');
    
    listElements.forEach(listEl => {
        const oldList = appData.find(l => l.id === listEl.dataset.id);
        const newList = { ...oldList, tasks: [] };
        
        const taskElements = listEl.querySelectorAll('.task-item');
        taskElements.forEach(taskEl => {
            // Buscar tarea en cualquier lista anterior
            let oldTask;
            appData.forEach(l => {
                const found = l.tasks.find(t => t.id === taskEl.dataset.id);
                if (found) oldTask = found;
            });
            
            const newTask = { ...oldTask, items: [] };
            const itemElements = taskEl.querySelectorAll('.item-row');
            
            itemElements.forEach(itemEl => {
                // Buscar item en cualquier tarea anterior
                let oldItem;
                appData.forEach(l => {
                    l.tasks.forEach(t => {
                        const found = t.items.find(i => i.id === itemEl.dataset.id);
                        if (found) oldItem = found;
                    });
                });
                if (oldItem) newTask.items.push(oldItem);
            });
            
            newList.tasks.push(newTask);
        });
        
        newListData.push(newList);
    });
    
    appData = newListData;
    saveData();
}

function saveData() {
    localStorage.setItem('listokeData', JSON.stringify(appData));
}

function saveAndRender() {
    saveData();
    render();
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    const btnAddList = document.getElementById('btnAddList');
    if (btnAddList) {
        btnAddList.addEventListener('click', () => window.addNew('list'));
    }
    
    render();
});