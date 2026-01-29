/**
 * 待办功能模块
 */

let todos = [];
let categories = [];

/**
 * 初始化待办页面
 */
async function initTodos() {
    console.log('待办页面初始化开始...');
    
    // 渲染头部导航（待办页面）
    if (typeof window.renderHeader === 'function') {
        console.log('调用 renderHeader...');
        window.renderHeader('todos');
        console.log('renderHeader 调用完成');
    } else {
        console.error('renderHeader 函数未找到！请检查 components.js 是否已正确加载。');
        // 延迟重试
        setTimeout(() => {
            if (typeof window.renderHeader === 'function') {
                window.renderHeader('todos');
            } else {
                console.error('renderHeader 仍然未找到！');
            }
        }, 100);
    }
    
    try {
        console.log('开始加载分类...');
        await loadCategories();
        console.log('分类加载完成');
        
        console.log('开始加载待办...');
        await loadTodos();
        console.log('待办加载完成');
        
        console.log('设置表单...');
        setupAddTodoForm();
        setupEditTodoForm();
        console.log('待办页面初始化完成');
    } catch (error) {
        console.error('待办页面初始化失败:', error);
        console.error('错误堆栈:', error.stack);
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
        console.log('loadCategories 开始执行...');
        console.log('CategoriesAPI 是否存在:', typeof CategoriesAPI);
        console.log('window.CategoriesAPI 是否存在:', typeof window.CategoriesAPI);
        
        // 确保使用全局的 CategoriesAPI
        const api = window.CategoriesAPI || CategoriesAPI;
        if (!api) {
            throw new Error('CategoriesAPI 未找到，请检查 api.js 是否已正确加载');
        }
        
        categories = await api.getAll();
        console.log('分类数据获取成功，数量:', categories.length);
        renderCategoryTabs();
        console.log('分类标签渲染完成');
    } catch (error) {
        console.error('加载分类失败:', error);
        console.error('错误详情:', {
            message: error.message,
            stack: error.stack
        });
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
async function loadTodos() {
    console.log('loadTodos 开始执行...');
    const loading = document.getElementById('loading');
    const emptyState = document.getElementById('empty-state');
    const todosList = document.getElementById('todos-list');
    
    if (!todosList) {
        console.error('找不到 todos-list 元素！');
        return;
    }
    
    console.log('显示加载提示...');
    if (loading) loading.style.display = 'block';
    todosList.innerHTML = '';
    
    try {
        console.log('调用 ItemsAPI.getTodos()...');
        console.log('ItemsAPI 是否存在:', typeof ItemsAPI);
        console.log('window.ItemsAPI 是否存在:', typeof window.ItemsAPI);
        
        // 确保使用全局的 ItemsAPI
        const api = window.ItemsAPI || ItemsAPI;
        if (!api) {
            throw new Error('ItemsAPI 未找到，请检查 api.js 是否已正确加载');
        }
        if (!api.getTodos) {
            throw new Error('ItemsAPI.getTodos 方法未找到');
        }
        
        console.log('调用 api.getTodos()...');
        todos = await api.getTodos();
        console.log('待办数据获取成功，数量:', todos.length);
        console.log('待办数据:', todos);
        
        if (loading) loading.style.display = 'none';
        
        if (todos.length === 0) {
            console.log('没有待办事项，显示空状态');
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        console.log('开始渲染待办列表...');
        renderTodos(todos);
        console.log('待办列表渲染完成');
    } catch (error) {
        console.error('加载待办失败:', error);
        console.error('错误详情:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        if (loading) loading.style.display = 'none';
        if (typeof showMessage === 'function') {
            showMessage('加载待办失败: ' + error.message, 'error');
        } else {
            alert('加载待办失败: ' + error.message);
        }
    }
}

/**
 * 渲染待办列表
 */
function renderTodos(todosList) {
    const todosListContainer = document.getElementById('todos-list');
    if (!todosListContainer) return;
    
    todosListContainer.innerHTML = '';
    
    // 按分类分组
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
    
    // 计算最大分组大小，用于计算相对块大小
    const maxCount = groupNames.reduce((max, name) => {
        return Math.max(max, groupedTodos[name].length);
    }, 1);
    
    // 渲染每个分组
    groupNames.forEach(categoryName => {
        const count = groupedTodos[categoryName].length;
        const ratio = count / maxCount; // 0-1
        const sizeFactor = 0.7 + 0.3 * ratio; // 0.7 - 1.0 之间
        
        const groupContainer = document.createElement('div');
        groupContainer.className = 'todo-group';
        groupContainer.style.setProperty('--group-size', sizeFactor.toString());
        
        // 初始为折叠状态
        groupContainer.classList.add('collapsed');
        
        // 创建分组标题
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
        groupContainer.appendChild(groupHeader);
        
        // 创建分组内容容器
        const groupContent = document.createElement('div');
        groupContent.className = 'todo-group-content';
        
        // 创建内容包装器（用于 grid 动画）
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'todo-group-content-wrapper';
        
        // 渲染该分组下的所有待办
        groupedTodos[categoryName].forEach(todo => {
            const todoItem = createTodoItem(todo);
            contentWrapper.appendChild(todoItem);
        });
        
        groupContent.appendChild(contentWrapper);
        groupContainer.appendChild(groupContent);
        
        // 点击标题展开/收起分组
        groupHeader.addEventListener('click', () => {
            const isOpen = groupContainer.classList.toggle('open');
            if (!isOpen) {
                groupContainer.classList.add('collapsed');
            } else {
                groupContainer.classList.remove('collapsed');
            }
        });
        
        todosListContainer.appendChild(groupContainer);
    });
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
    if (!checkbox.checked) {
        return; // 如果取消勾选，不做任何操作
    }
    
    try {
        // 触发酷炫纸屑动画
        if (typeof confetti !== 'undefined') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
        
        // 调用完成接口
        await ItemsAPI.completeTodo(itemId);
        
        // 显示成功消息
        if (typeof showMessage === 'function') {
            showMessage('🎉 恭喜完成一项任务！', 'success');
        }
        
        // 添加完成动画效果
        const todoItem = checkbox.closest('.todo-item');
        if (todoItem) {
            todoItem.style.transition = 'all 0.5s ease';
            todoItem.style.transform = 'scale(0.8)';
            todoItem.style.opacity = '0';
            
            setTimeout(() => {
                // 重新加载待办列表
                loadTodos();
            }, 500);
        }
    } catch (error) {
        console.error('完成待办失败:', error);
        checkbox.checked = false; // 恢复未选中状态
        if (typeof showMessage === 'function') {
            showMessage('完成待办失败: ' + error.message, 'error');
        }
    }
}

/**
 * 删除待办
 */
async function deleteTodo(itemId) {
    if (typeof showConfirmDialog === 'function') {
        showConfirmDialog('确定要删除这个待办吗？', async () => {
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
        
        const formData = new FormData(form);
        const categoryId = document.getElementById('todo-category-id').value;
        
        if (!categoryId) {
            if (typeof showMessage === 'function') {
                showMessage('请选择分类', 'error');
            }
            return;
        }
        
        // 构建 FormData
        const submitData = new FormData();
        submitData.append('title', formData.get('title'));
        submitData.append('category_id', categoryId);
        submitData.append('is_completed', 'false'); // 标记为待办
        
        const dueTime = formData.get('due_time');
        if (dueTime) {
            submitData.append('due_time', dueTime);
        }
        
        const notes = formData.get('notes');
        if (notes) {
            submitData.append('notes', notes);
        }
        
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
    });
    
    // 点击模态框背景关闭
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
        
        const formData = new FormData(form);
        const itemId = parseInt(document.getElementById('edit-todo-id').value);
        const categoryId = document.getElementById('edit-todo-category-id').value;
        
        if (!categoryId) {
            if (typeof showMessage === 'function') {
                showMessage('请选择分类', 'error');
            }
            return;
        }
        
        // 构建 FormData
        const submitData = new FormData();
        submitData.append('title', formData.get('title'));
        submitData.append('category_id', categoryId);
        
        const dueTime = formData.get('due_time');
        console.log('编辑待办 - 截止时间:', dueTime);
        if (dueTime) {
            submitData.append('due_time', dueTime);
        } else {
            // 如果清空了截止时间，需要传递空字符串来清除
            submitData.append('due_time', '');
        }
        
        const notes = formData.get('notes');
        submitData.append('notes', notes || '');
        
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
    });
    
    // 点击模态框背景关闭
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

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', initTodos);
