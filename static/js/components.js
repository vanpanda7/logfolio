/**
 * 公共组件和工具函数
 */

/**
 * 渲染公共头部导航
 */
function renderHeader(activePage = '') {
    const headerHTML = `
        <header class="header">
            <div class="container">
                <div class="brand">
                    <span>📒</span>
                    <h1>Logfolio</h1>
                </div>
                <nav class="nav">
                    <a href="/" class="nav-link ${activePage === 'index' ? 'active' : ''}">时间线</a>
                    <a href="/add" class="nav-link ${activePage === 'add' ? 'active' : ''}">记录</a>
                    <a href="/manage-categories" class="nav-link ${activePage === 'manage-categories' ? 'active' : ''}">分类</a>
                </nav>
            </div>
        </header>
    `;
    
    const headerContainer = document.querySelector('.header-container');
    if (headerContainer) {
        headerContainer.innerHTML = headerHTML;
    } else {
        // 如果没有容器，插入到body开头
        document.body.insertAdjacentHTML('afterbegin', headerHTML);
    }
}

/**
 * 创建统计信息卡片（整合筛选器）
 */
function createStatisticsCard(stats, selectedCategoryId = '', selectedYear = '', availableYears = []) {
    // 获取所有分类（用于显示"全部"选项）
    const categoryTabs = document.getElementById('category-filter-tabs');
    const allCategories = [];
    if (categoryTabs) {
        categoryTabs.querySelectorAll('.category-filter-tab').forEach(tab => {
            allCategories.push({
                id: tab.dataset.categoryId || '',
                name: tab.textContent.trim()
            });
        });
    }
    
    // 使用传入的有记录的年份列表
    const years = availableYears.length > 0 
        ? availableYears.map(y => y.toString())
        : [];
    
    // 构建分类分布（可点击筛选）
    let categoriesHTML = '';
    if (Object.keys(stats.by_category || {}).length > 0) {
        // 添加"全部"选项
        const totalCount = stats.total || 0;
        const isAllSelected = !selectedCategoryId;
        categoriesHTML = `
            <span class="stat-category-item ${isAllSelected ? 'active' : ''}" 
                  data-category-id="" 
                  onclick="filterByCategory('')">
                <span class="stat-category-name">全部</span>
                <span class="stat-category-count">${totalCount}</span>
            </span>
        `;
        
        // 添加各个分类
        Object.entries(stats.by_category).forEach(([name, count]) => {
            // 找到对应的分类ID
            const category = allCategories.find(cat => cat.name === name);
            const categoryId = category ? category.id : '';
            const isSelected = selectedCategoryId && categoryId === selectedCategoryId;
            
            categoriesHTML += `
                <span class="stat-category-item ${isSelected ? 'active' : ''}" 
                      data-category-id="${categoryId}" 
                      onclick="filterByCategory('${categoryId}')">
                    <span class="stat-category-name">${name}</span>
                    <span class="stat-category-count">${count}</span>
                </span>
            `;
        });
    }
    
    // 构建年份选择（可点击筛选）
    let yearsHTML = '';
    if (years.length > 0) {
        const currentYear = new Date().getFullYear();
        const defaultYear = selectedYear || currentYear.toString();
        
        // 添加"全部年份"选项
        const isAllYearSelected = !selectedYear;
        yearsHTML = `
            <span class="stat-year-item ${isAllYearSelected ? 'active' : ''}" 
                  data-year="" 
                  onclick="filterByYear('')">
                全部
            </span>
        `;
        
        // 添加各个年份
        years.forEach(year => {
            const isSelected = selectedYear && year === selectedYear;
            yearsHTML += `
                <span class="stat-year-item ${isSelected ? 'active' : ''}" 
                      data-year="${year}" 
                      onclick="filterByYear('${year}')">
                    ${year}
                </span>
            `;
        });
    }
    
    const statsHTML = `
        <div class="statistics-card">
            <div class="statistics-content">
                <div class="stat-item">
                    <div class="stat-label">总记录数</div>
                    <div class="stat-value">${stats.total}</div>
                </div>
                ${Object.keys(stats.by_category || {}).length > 0 ? `
                    <div class="stat-item">
                        <div class="stat-label">分类分布 <span class="stat-hint">（点击筛选）</span></div>
                        <div class="stat-categories">
                            ${categoriesHTML}
                        </div>
                    </div>
                ` : ''}
                ${years.length > 0 ? `
                    <div class="stat-item">
                        <div class="stat-label">年份 <span class="stat-hint">（点击筛选）</span></div>
                        <div class="stat-years">
                            ${yearsHTML}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    return statsHTML;
}

/**
 * 显示统计信息（整合筛选器）
 */
async function showStatistics(year = null, categoryId = '') {
    const statsContainer = document.getElementById('statistics');
    if (!statsContainer) return;
    
    try {
        let stats;
        if (year) {
            stats = await ItemsAPI.getStatistics(year);
        } else {
            // 获取当前年份的统计
            const currentYear = new Date().getFullYear();
            stats = await ItemsAPI.getStatistics(currentYear);
            year = currentYear.toString();
        }
        
        // 获取有记录的年份列表
        let availableYears = [];
        try {
            const yearsResponse = await ItemsAPI.getAvailableYears();
            availableYears = yearsResponse.years || [];
        } catch (error) {
            console.error('获取年份列表失败:', error);
        }
        
        statsContainer.innerHTML = createStatisticsCard(stats, categoryId, year, availableYears);
        statsContainer.classList.add('show');
        
        // 重新绑定筛选器事件（因为HTML被重新生成了）
        if (typeof window.setupFilterEvents === 'function') {
            window.setupFilterEvents();
        }
    } catch (error) {
        console.error('加载统计信息失败:', error);
    }
}

/**
 * 创建图片查看器模态框
 */
function createImageViewer(images, currentIndex = 0) {
    if (!images || images.length === 0) return;
    
    const modal = document.createElement('div');
    modal.className = 'image-viewer-modal';
    modal.innerHTML = `
        <div class="image-viewer-overlay"></div>
        <div class="image-viewer-container">
            <button class="image-viewer-close" onclick="closeImageViewer()">&times;</button>
            <button class="image-viewer-nav image-viewer-prev" onclick="navigateImage(-1)">‹</button>
            <button class="image-viewer-nav image-viewer-next" onclick="navigateImage(1)">›</button>
            <div class="image-viewer-content">
                <img src="${images[currentIndex].image_url}" alt="图片 ${currentIndex + 1}" id="viewer-image">
                <div class="image-viewer-info">
                    <span class="image-viewer-counter">${currentIndex + 1} / ${images.length}</span>
                </div>
            </div>
            ${images.length > 1 ? `
                <div class="image-viewer-thumbnails">
                    ${images.map((img, idx) => `
                        <img src="${img.image_url}" 
                             alt="缩略图 ${idx + 1}" 
                             class="thumbnail ${idx === currentIndex ? 'active' : ''}"
                             onclick="switchImage(${idx})">
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // 存储当前索引
    window.currentImageIndex = currentIndex;
    window.imageViewerImages = images;
    
    // 键盘导航
    document.addEventListener('keydown', handleImageViewerKeyboard);
}

/**
 * 关闭图片查看器
 */
function closeImageViewer() {
    const modal = document.querySelector('.image-viewer-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleImageViewerKeyboard);
        window.currentImageIndex = null;
        window.imageViewerImages = null;
    }
}

/**
 * 切换图片
 */
function switchImage(index) {
    if (!window.imageViewerImages || index < 0 || index >= window.imageViewerImages.length) return;
    
    const img = document.getElementById('viewer-image');
    const counter = document.querySelector('.image-viewer-counter');
    const thumbnails = document.querySelectorAll('.thumbnail');
    
    if (img) img.src = window.imageViewerImages[index].image_url;
    if (counter) counter.textContent = `${index + 1} / ${window.imageViewerImages.length}`;
    
    thumbnails.forEach((thumb, idx) => {
        thumb.classList.toggle('active', idx === index);
    });
    
    window.currentImageIndex = index;
}

/**
 * 导航图片
 */
function navigateImage(direction) {
    if (!window.imageViewerImages) return;
    
    let newIndex = (window.currentImageIndex || 0) + direction;
    
    if (newIndex < 0) {
        newIndex = window.imageViewerImages.length - 1;
    } else if (newIndex >= window.imageViewerImages.length) {
        newIndex = 0;
    }
    
    switchImage(newIndex);
}

/**
 * 键盘事件处理
 */
function handleImageViewerKeyboard(e) {
    if (e.key === 'Escape') {
        closeImageViewer();
    } else if (e.key === 'ArrowLeft') {
        navigateImage(-1);
    } else if (e.key === 'ArrowRight') {
        navigateImage(1);
    }
}

/**
 * 创建搜索框（已废弃，现在在 HTML 中直接写结构）
 * 保留此函数以防其他地方调用
 */
function createSearchBox(containerId = 'search-container') {
    // 此函数已废弃，搜索框现在直接在 HTML 中定义
    console.warn('createSearchBox 已废弃，搜索框现在直接在 HTML 中定义');
}

/**
 * 防抖函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 自定义确认对话框
 */
function showConfirmDialog(message, onConfirm, onCancel) {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    
    // 创建对话框
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `
        <div class="confirm-content">
            <div class="confirm-icon">⚠️</div>
            <div class="confirm-message">${message}</div>
            <div class="confirm-actions">
                <button class="btn btn-secondary confirm-cancel">取消</button>
                <button class="btn btn-danger confirm-ok">确认</button>
            </div>
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // 添加动画
    setTimeout(() => {
        overlay.classList.add('show');
    }, 10);
    
    // 确认按钮
    const okBtn = dialog.querySelector('.confirm-ok');
    okBtn.addEventListener('click', () => {
        closeDialog();
        if (onConfirm) onConfirm();
    });
    
    // 取消按钮
    const cancelBtn = dialog.querySelector('.confirm-cancel');
    cancelBtn.addEventListener('click', () => {
        closeDialog();
        if (onCancel) onCancel();
    });
    
    // 点击遮罩层关闭
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeDialog();
            if (onCancel) onCancel();
        }
    });
    
    // ESC 键关闭
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeDialog();
            if (onCancel) onCancel();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    function closeDialog() {
        overlay.classList.remove('show');
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
}

/**
 * 导出全局函数
 */
window.renderHeader = renderHeader;
window.createStatisticsCard = createStatisticsCard;
window.showStatistics = showStatistics;
window.createImageViewer = createImageViewer;
window.closeImageViewer = closeImageViewer;
window.switchImage = switchImage;
window.navigateImage = navigateImage;
window.createSearchBox = createSearchBox;
window.debounce = debounce;
window.showConfirmDialog = showConfirmDialog;
