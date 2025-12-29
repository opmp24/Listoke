document.addEventListener('DOMContentLoaded', () => {
  // Estado inicial
  const defaultData = {
    'pendientes': [],
    'compras': [],
    'tareas': []
  };
  
  let currentList = 'pendientes';
  let data = JSON.parse(localStorage.getItem('listoke-db')) || defaultData;

  // Elementos DOM
  const listTabs = document.getElementById('listTabs');
  const input = document.getElementById('newItemInput');
  const addBtn = document.getElementById('addItemBtn');
  const itemsContainer = document.getElementById('itemsList');

  // Guardar en LocalStorage
  const save = () => {
    localStorage.setItem('listoke-db', JSON.stringify(data));
    render();
  };

  // Renderizar lista
  const render = () => {
    // Actualizar tabs
    if(listTabs) {
        listTabs.querySelectorAll('.nav-link').forEach(link => {
        if (link.dataset.list === currentList) link.classList.add('active');
        else link.classList.remove('active');
        });
    }

    // Renderizar items
    if(itemsContainer) {
        itemsContainer.innerHTML = '';
        const items = data[currentList] || [];

        if (items.length === 0) {
        itemsContainer.innerHTML = `
            <div class="text-center py-5 text-muted">
            <i class="bi bi-clipboard-check fs-1 d-block mb-2 opacity-50"></i>
            <p>No hay elementos en ${currentList}</p>
            </div>`;
        return;
        }

        items.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = `list-group-item list-group-item-action d-flex align-items-center p-3 border-0 border-bottom ${item.done ? 'bg-light text-decoration-line-through text-muted' : ''}`;
        el.innerHTML = `
            <input class="form-check-input me-3 fs-5" type="checkbox" ${item.done ? 'checked' : ''}>
            <span class="flex-grow-1 user-select-none">${item.text}</span>
            <button class="btn btn-sm btn-outline-danger border-0 opacity-50 hover-opacity-100"><i class="bi bi-trash"></i></button>
        `;

        // Eventos del item
        const checkbox = el.querySelector('input');
        checkbox.addEventListener('change', () => {
            item.done = checkbox.checked;
            save();
        });

        const deleteBtn = el.querySelector('button');
        deleteBtn.addEventListener('click', () => {
            items.splice(index, 1);
            save();
        });

        itemsContainer.appendChild(el);
        });
    }
  };

  // Agregar item
  const addItem = () => {
    const text = input.value.trim();
    if (!text) return;
    
    if (!data[currentList]) data[currentList] = [];
    
    data[currentList].unshift({ text, done: false });
    input.value = '';
    save();
  };

  // Event Listeners
  if (addBtn) addBtn.addEventListener('click', addItem);
  
  if (input) {
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addItem();
    });
  }

  if (listTabs) {
    listTabs.addEventListener('click', (e) => {
        if (e.target.classList.contains('nav-link')) {
        e.preventDefault();
        currentList = e.target.dataset.list;
        render();
        }
    });
  }

  // Inicializar
  render();
});