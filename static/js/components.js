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
                <h1>📚 个人年度文化成就墙</h1>
                <nav class="nav">
                    <a href="/" class="nav-link ${activePage === 'index' ? 'active' : ''}">时间线</a>
                    <a href="/add" class="nav-link ${activePage === 'add' ? 'active' : ''}">添加记录</a>
                    <a href="/manage-categories" class="nav-link ${activePage === 'manage-categories' ? 'active' : ''}">管理分类</a>
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
 * 创建统计信息卡片
 */
function createStatisticsCard(stats) {
    if (!stats || stats.total === 0) {
        return '';
    }
    
    const statsHTML = `
        <div class="statistics-card">
            <div class="stat-item">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">总记录数</div>
            </div>
            ${Object.keys(stats.by_category || {}).length > 0 ? `
                <div class="stat-item">
                    <div class="stat-label">分类分布</div>
                    <div class="stat-categories">
                        ${Object.entries(stats.by_category).map(([name, count]) => `
                            <span class="stat-category-item">
                                <span class="stat-category-name">${name}</span>
                                <span class="stat-category-count">${count}</span>
                            </span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    return statsHTML;
}

/**
 * 显示统计信息
 */
async function showStatistics(year = null) {
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
        }
        
        statsContainer.innerHTML = createStatisticsCard(stats);
        statsContainer.classList.add('show');
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
 * 创建搜索框
 */
function createSearchBox(containerId = 'search-container') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="search-box">
            <input type="text" 
                   id="search-input" 
                   class="search-input" 
                   placeholder="搜索记录标题或备注...">
            <button class="search-clear" id="search-clear" style="display: none;">✕</button>
        </div>
    `;
    
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const value = e.target.value.trim();
            searchClear.style.display = value ? 'block' : 'none';
            
            if (typeof window.handleSearch === 'function') {
                window.handleSearch(value);
            }
        });
    }
    
    if (searchClear) {
        searchClear.addEventListener('click', function() {
            searchInput.value = '';
            searchClear.style.display = 'none';
            if (typeof window.handleSearch === 'function') {
                window.handleSearch('');
            }
        });
    }
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
