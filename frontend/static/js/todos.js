/**
 * 待办功能模块
 */

let todos = [];
let categories = [];
let _todoActionLock = false;

/**
 * 初始化待办页面
 */
async function initTodos() {
    if (typeof window.renderHeader === 'function') {
        window.renderHeader('todos');
    } else {
        setTimeout(() => {
            if (typeof window.renderHeader === 'function') {
                window.renderHeader('todos');
            }
        }, 100);
    }
    
    try {
        await loadCategories();
        await loadTodos();
        setupAddTodoForm();
        setupEditTodoForm();
    } catch (error) {
        console.error('待办页面初始化失败:', error);
        if (typeof showMessage === 'function') {
            showMessage('页面加载失败: ' + error.message, 'error');
        }
    }
}

/**
 * 加载分类列表
 */
async function loadCategories() {
    try {
        const api = window.CategoriesAPI || CategoriesAPI;
        if (!api) {
            throw new Error('CategoriesAPI 未找到');
        }
        
        categories = await api.getAll();
        renderCategoryTabs();
    } catch (error) {
        console.error('加载分类失败:', error);
        if (typeof showMessage === 'function') {
            showMessage('加载分类失败: ' + error.message, 'error');
        }
    }
}

/**
 * 渲染分类标签
 */
function renderCategoryTabs() {
    // 添加待办模态框的分类标签
    const tabsContainer = document.getElementById('todo-category-tabs');
    if (tabsContainer) {
        tabsContainer.innerHTML = '';
        categories.forEach(cat => {
            const tab = document.createElement('button');
            tab.type = 'button';
            tab.className = 'category-tab';
            tab.textContent = cat.name;
            tab.dataset.categoryId = cat.id;
            tab.addEventListener('click', function() {
                tabsContainer.querySelectorAll('.category-tab').forEach(t => {
                    t.classList.remove('active');
                });
                this.classList.add('active');
                document.getElementById('todo-category-id').value = cat.id;
            });
            tabsContainer.appendChild(tab);
        });
    }
    
    // 编辑待办模态框的分类标签
    const editTabsContainer = document.getElementById('edit-todo-category-tabs');
    if (editTabsContainer) {
        editTabsContainer.innerHTML = '';
        categories.forEach(cat => {
            const tab = document.createElement('button');
            tab.type = 'button';
            tab.className = 'category-tab';
            tab.textContent = cat.name;
            tab.dataset.categoryId = cat.id;
            tab.addEventListener('click', function() {
                editTabsContainer.querySelectorAll('.category-tab').forEach(t => {
                    t.classList.remove('active');
                });
                this.classList.add('active');
                document.getElementById('edit-todo-category-id').value = cat.id;
            });
            editTabsContainer.appendChild(tab);
        });
    }
}

/**
 * 加载待办列表
 */
let _loadTodosLock = false;
async function loadTodos() {
    if (_loadTodosLock) return;
    _loadTodosLock = true;
    
    const loading = document.getElementById('loading');
    const emptyState = document.getElementById('empty-state');
    const todosList = document.getElementById('todos-list');
    
    if (!todosList) {
        _loadTodosLock = false;
        return;
    }
    
    if (loading) loading.style.display = 'block';
    todosList.innerHTML = '';
    
    try {
        const api = window.ItemsAPI || ItemsAPI;
        if (!api || !api.getTodos) {
            throw new Error('ItemsAPI 未找到');
        }
        
        todos = await api.getTodos();
        
        if (loading) loading.style.display = 'none';
        
        if (todos.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            _loadTodosLock = false;
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        renderTodos(todos);
    } catch (error) {
        console.error('加载待办失败:', error);
        if (loading) loading.style.display = 'none';
        if (typeof showMessage === 'function') {
            showMessage('加载待办失败: ' + error.message, 'error');
        } else {
            alert('加载待办失败: ' + error.message);
        }
    }
    _loadTodosLock = false;
}

/**
 * 渲染待办列表
 */
function renderTodos(todosList) {
    const todosListContainer = document.getElementById('todos-list');
    if (!todosListContainer) return;
    
    todosListContainer.innerHTML = '';
    
    const groupedTodos = {};
    todosList.forEach(todo => {
        const categoryName = todo.category_name || '未分类';
        if (!groupedTodos[categoryName]) {
            groupedTodos[categoryName] = [];
        }
        groupedTodos[categoryName].push(todo);
    });
    
    const groupNames = Object.keys(groupedTodos);
    if (groupNames.length === 0) return;
    
    const maxCount = groupNames.reduce((max, name) => {
        return Math.max(max, groupedTodos[name].length);
    }, 1);
    
    const fragment = document.createDocumentFragment();
    
    groupNames.forEach(categoryName => {
        const count = groupedTodos[categoryName].length;
        const ratio = count / maxCount;
        const sizeFactor = 0.7 + 0.3 * ratio;
        
        const groupContainer = document.createElement('div');
        groupContainer.className = 'todo-group collapsed';
        groupContainer.style.setProperty('--group-size', sizeFactor.toString());
        
        const groupHeader = document.createElement('div');
        groupHeader.className = 'todo-group-header';
        
        const groupTitle = document.createElement('h3');
        groupTitle.className = 'todo-group-title';
        groupTitle.textContent = categoryName;
        
        const groupCount = document.createElement('span');
        groupCount.className = 'todo-group-count';
        groupCount.textContent = `${count} 项`;
        
        groupHeader.appendChild(groupTitle);
        groupHeader.appendChild(groupCount);
        
        const groupContent = document.createElement('div');
        groupContent.className = 'todo-group-content';
        
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'todo-group-content-wrapper';
        
        groupedTodos[categoryName].forEach(todo => {
            contentWrapper.appendChild(createTodoItem(todo));
        });
        
        groupContent.appendChild(contentWrapper);
        groupContainer.appendChild(groupHeader);
        groupContainer.appendChild(groupContent);
        
        groupHeader.addEventListener('click', () => {
            groupContainer.classList.toggle('open');
            groupContainer.classList.toggle('collapsed');
        });
        
        fragment.appendChild(groupContainer);
    });
    
    todosListContainer.appendChild(fragment);
}

/**
 * 创建待办项元素
 */
function createTodoItem(todo) {
    const item = document.createElement('div');
    item.className = 'todo-item';
    item.dataset.todoId = todo.id;
    
    // 检查是否超时
    const isOverdue = todo.due_time && new Date(todo.due_time) < new Date();
    const dueDateClass = isOverdue ? 'todo-due-time overdue' : 'todo-due-time';
    
    // 创建时间
    const createDateText = todo.created_at 
        ? todo.created_at.slice(2, 4) + todo.created_at.slice(5, 7) + todo.created_at.slice(8, 10)
        : '';

    // 格式化日期
    const dueDateText = todo.due_time 
        ? todo.due_time.slice(2, 4) + todo.due_time.slice(5, 7) + todo.due_time.slice(8, 10)
        : '<img src="/static/images/8.svg" style="width: 25px;">';
    
    item.innerHTML = `
        <div class="todo-checkbox-wrapper">
            <input type="checkbox" class="todo-checkbox" id="todo-${todo.id}" onchange="handleCompleteTodo(${todo.id}, this)">
            <label for="todo-${todo.id}" class="todo-checkbox-label"></label>
        </div>
        <div class="todo-content">
            <div class="todo-header">
                <h3 class="todo-title">${todo.title}</h3>
                <span class="todo-category-badge">${todo.category_name}</span>
            </div>
            ${todo.notes ? `<p class="todo-notes">${todo.notes}</p>` : ''}
            <div class="todo-footer">
                <span class="${dueDateClass}">${createDateText} <img src="/static/images/right.svg" style="width: 12px;color:black"> ${dueDateText}</span>
                <div class="todo-actions">
                    <button class="todo-edit-btn" onclick="editTodo(${todo.id})" title="编辑"><img src="/static/images/edit.svg" style="width: 20px;"></button>
                    <button class="todo-delete-btn" onclick="deleteTodo(${todo.id})" title="删除"><img src="/static/images/delete.svg" style="width: 20px;"></button>
                </div>
            </div>
        </div>
    `;
    
    return item;
}

/**
 * 完成待办
 */
async function handleCompleteTodo(itemId, checkbox) {
    if (_todoActionLock || !checkbox.checked) {
        if (checkbox.checked && _todoActionLock) checkbox.checked = false;
        return;
    }
    _todoActionLock = true;
    
    try {
        if (typeof confetti !== 'undefined') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
        
        await ItemsAPI.completeTodo(itemId);
        
        if (typeof showMessage === 'function') {
            showMessage('🎉 恭喜完成一项任务！', 'success');
        }
        
        const todoItem = checkbox.closest('.todo-item');
        if (todoItem) {
            todoItem.style.transition = 'all 0.5s ease';
            todoItem.style.transform = 'scale(0.8)';
            todoItem.style.opacity = '0';
            
            setTimeout(() => {
                loadTodos();
                _todoActionLock = false;
            }, 500);
            return;
        }
        loadTodos();
    } catch (error) {
        console.error('完成待办失败:', error);
        checkbox.checked = false;
        if (typeof showMessage === 'function') {
            showMessage('完成待办失败: ' + error.message, 'error');
        }
    }
    _todoActionLock = false;
}

/**
 * 删除待办
 */
async function deleteTodo(itemId) {
    if (_todoActionLock) return;
    if (typeof showConfirmDialog === 'function') {
        showConfirmDialog('确定要删除这个待办吗？', async () => {
            _todoActionLock = true;
            try {
                await ItemsAPI.delete(itemId);
                if (typeof showMessage === 'function') {
                    showMessage('删除成功', 'success');
                }
                loadTodos();
            } catch (error) {
                console.error('删除待办失败:', error);
                if (typeof showMessage === 'function') {
                    showMessage('删除失败: ' + error.message, 'error');
                }
            }
            _todoActionLock = false;
        });
    }
}

/**
 * 显示添加待办模态框
 */
function showAddTodoModal() {
    const modal = document.getElementById('add-todo-modal');
    if (modal) {
        modal.style.display = 'flex';
        // 重置表单
        document.getElementById('add-todo-form').reset();
        document.getElementById('todo-category-id').value = '';
        // 移除所有分类选中状态
        document.querySelectorAll('#todo-category-tabs .category-tab').forEach(t => {
            t.classList.remove('active');
        });
    }
}

/**
 * 关闭添加待办模态框
 */
function closeAddTodoModal() {
    const modal = document.getElementById('add-todo-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * 编辑待办
 */
function editTodo(itemId) {
    const todo = todos.find(t => t.id === itemId);
    if (!todo) {
        if (typeof showMessage === 'function') {
            showMessage('待办不存在', 'error');
        }
        return;
    }
    
    // 填充编辑表单
    document.getElementById('edit-todo-id').value = todo.id;
    document.getElementById('edit-todo-title').value = todo.title;
    document.getElementById('edit-todo-notes').value = todo.notes || '';
    
    // 设置截止时间
    if (todo.due_time) {
        const dueDate = new Date(todo.due_time);
        const formattedDate = dueDate.toISOString().split('T')[0];
        document.getElementById('edit-todo-due-time').value = formattedDate;
    } else {
        document.getElementById('edit-todo-due-time').value = '';
    }
    
    // 设置分类
    document.getElementById('edit-todo-category-id').value = todo.category_id;
    // 更新分类标签选中状态
    document.querySelectorAll('#edit-todo-category-tabs .category-tab').forEach(tab => {
        tab.classList.remove('active');
        if (parseInt(tab.dataset.categoryId) === todo.category_id) {
            tab.classList.add('active');
        }
    });
    
    // 显示编辑模态框
    const modal = document.getElementById('edit-todo-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * 清除编辑表单中的预计完成时间（改为无期限）
 */
function clearEditDueTime() {
    const input = document.getElementById('edit-todo-due-time');
    if (input) {
        input.value = '';
    }
}

/**
 * 关闭编辑待办模态框
 */
function closeEditTodoModal() {
    const modal = document.getElementById('edit-todo-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * 设置添加待办表单
 */
function setupAddTodoForm() {
    const form = document.getElementById('add-todo-form');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (_todoActionLock) return;
        
        const formData = new FormData(form);
        const categoryId = document.getElementById('todo-category-id').value;
        
        if (!categoryId) {
            if (typeof showMessage === 'function') {
                showMessage('请选择分类', 'error');
            }
            return;
        }
        
        const submitData = new FormData();
        submitData.append('title', formData.get('title'));
        submitData.append('category_id', categoryId);
        submitData.append('is_completed', 'false');
        
        const dueTime = formData.get('due_time');
        if (dueTime) {
            submitData.append('due_time', dueTime);
        }
        
        const notes = formData.get('notes');
        if (notes) {
            submitData.append('notes', notes);
        }
        
        _todoActionLock = true;
        try {
            await ItemsAPI.create(submitData);
            if (typeof showMessage === 'function') {
                showMessage('待办添加成功', 'success');
            }
            closeAddTodoModal();
            loadTodos();
        } catch (error) {
            console.error('添加待办失败:', error);
            if (typeof showMessage === 'function') {
                showMessage('添加待办失败: ' + error.message, 'error');
            }
        }
        _todoActionLock = false;
    });
    
    const modal = document.getElementById('add-todo-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAddTodoModal();
            }
        });
    }
}

/**
 * 设置编辑待办表单
 */
function setupEditTodoForm() {
    const form = document.getElementById('edit-todo-form');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (_todoActionLock) return;
        
        const formData = new FormData(form);
        const itemId = parseInt(document.getElementById('edit-todo-id').value);
        const categoryId = document.getElementById('edit-todo-category-id').value;
        
        if (!categoryId) {
            if (typeof showMessage === 'function') {
                showMessage('请选择分类', 'error');
            }
            return;
        }
        
        const submitData = new FormData();
        submitData.append('title', formData.get('title'));
        submitData.append('category_id', categoryId);
        
        const dueTime = formData.get('due_time');
        if (dueTime) {
            submitData.append('due_time', dueTime);
        } else {
            submitData.append('clear_due_time', '1');
        }
        
        const notes = formData.get('notes');
        submitData.append('notes', notes || '');
        
        _todoActionLock = true;
        try {
            await ItemsAPI.update(itemId, submitData);
            if (typeof showMessage === 'function') {
                showMessage('待办更新成功', 'success');
            }
            closeEditTodoModal();
            loadTodos();
        } catch (error) {
            console.error('更新待办失败:', error);
            if (typeof showMessage === 'function') {
                showMessage('更新待办失败: ' + error.message, 'error');
            }
        }
        _todoActionLock = false;
    });
    
    const modal = document.getElementById('edit-todo-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeEditTodoModal();
            }
        });
    }
}

// 导出全局函数
window.handleCompleteTodo = handleCompleteTodo;
window.deleteTodo = deleteTodo;
window.editTodo = editTodo;
window.showAddTodoModal = showAddTodoModal;
window.closeAddTodoModal = closeAddTodoModal;
window.closeEditTodoModal = closeEditTodoModal;
window.clearEditDueTime = clearEditDueTime;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', initTodos);
