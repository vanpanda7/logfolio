/**
 * 年度墙功能模块
 */

// 全局变量
let currentGalleryYear = null;
let currentGalleryData = [];
let fullscreenViewer = null;

/**
 * 初始化年度墙
 */
async function initCoolGallery() {
    // 渲染头部导航（年度墙页面）
    // 确保 renderHeader 已加载
    if (typeof window.renderHeader === 'function') {
        window.renderHeader('gallery');
    } else {
        console.error('renderHeader 函数未找到！请检查 components.js 是否已正确加载。');
    }
    
    // 获取年份列表，构建隐藏的年份下拉
    try {
        const response = await ItemsAPI.getAvailableYears();
        const years = response.years || [];
        const currentYear = new Date().getFullYear();
        
        const titleBtn = document.getElementById('gallery-title-btn');
        const titleSpan = document.getElementById('gallery-title');
        const dropdown = document.getElementById('gallery-year-dropdown');
        
        if (dropdown) {
            dropdown.innerHTML = '';
            years.forEach(year => {
                const opt = document.createElement('button');
                opt.type = 'button';
                opt.role = 'option';
                opt.className = 'gallery-year-option';
                opt.dataset.year = year;
                opt.textContent = year;
                opt.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const y = parseInt(this.dataset.year, 10);
                    if (titleSpan) titleSpan.textContent = `${y} RECAP`;
                    dropdown.style.display = 'none';
                    if (titleBtn) {
                        titleBtn.setAttribute('aria-expanded', 'false');
                        titleBtn.setAttribute('aria-label', '选择年份');
                    }
                    if (dropdown) dropdown.setAttribute('aria-hidden', 'true');
                    loadGalleryYear(y);
                });
                dropdown.appendChild(opt);
            });
        }
        
        if (titleBtn) {
            titleBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const isOpen = dropdown && dropdown.style.display === 'block';
                if (dropdown) {
                    dropdown.style.display = isOpen ? 'none' : 'block';
                    dropdown.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
                }
                titleBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
            });
        }
        
        document.addEventListener('click', function() {
            if (dropdown) {
                dropdown.style.display = 'none';
                dropdown.setAttribute('aria-hidden', 'true');
            }
            if (titleBtn) titleBtn.setAttribute('aria-expanded', 'false');
        });
        
        // 默认加载当前年或第一个年份
        const yearToLoad = years.indexOf(currentYear) >= 0 ? currentYear : (years[0] ? parseInt(years[0]) : null);
        if (yearToLoad) {
            if (titleSpan) titleSpan.textContent = `${yearToLoad} RECAP`;
            await loadGalleryYear(yearToLoad);
        }
    } catch (error) {
        console.error('获取年份列表失败:', error);
        if (typeof showMessage === 'function') {
            showMessage('加载年份列表失败: ' + error.message, 'error');
        }
    }
    
    // 初始化全屏查看器
    fullscreenViewer = document.getElementById('fullscreen-viewer');
}

/**
 * 加载指定年份的年度墙数据
 */
let _galleryLoading = false;
async function loadGalleryYear(year) {
    if (_galleryLoading) return;
    _galleryLoading = true;
    
    const photoWall = document.getElementById('photo-wall');
    const galleryTitle = document.getElementById('gallery-title');
    
    if (!photoWall) {
        _galleryLoading = false;
        return;
    }
    
    if (galleryTitle) {
        galleryTitle.textContent = `${year} RECAP`;
    }
    
    photoWall.innerHTML = '';
    
    try {
        const photos = await ItemsAPI.getAnnualGallery(year);
        currentGalleryData = photos;
        currentGalleryYear = year;
        
        if (photos.length === 0) {
            photoWall.innerHTML = '<div class="empty-state" style="color: rgba(255,255,255,0.7); padding: 3rem;"><div class="empty-icon">📷</div><p>这一年还没有带图片的记录</p></div>';
            _galleryLoading = false;
            return;
        }
        
        const fragment = document.createDocumentFragment();
        photos.forEach((photo, index) => {
            const card = createPhotoCard(photo, index);
            fragment.appendChild(card);
        });
        photoWall.appendChild(fragment);
        
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1, rootMargin: '50px' }
        );
        
        photoWall.querySelectorAll('.photo-card').forEach(card => {
            observer.observe(card);
        });
        
    } catch (error) {
        console.error('加载年度墙失败:', error);
        if (typeof showMessage === 'function') {
            showMessage('加载年度墙失败: ' + error.message, 'error');
        }
    }
    _galleryLoading = false;
}

/**
 * 创建照片卡片
 */
function createPhotoCard(photo, index) {
    const card = document.createElement('div');
    card.className = 'photo-card';
    
    // 延迟显示，实现错落有致的入场效果
    card.style.transitionDelay = `${index * 0.05}s`;
    
    card.innerHTML = `
        <img src="${photo.image}" loading="lazy" alt="${photo.title}" onerror="this.src='/static/images/placeholder.svg'">
        <div class="card-overlay">
            <strong>${photo.date}</strong>
            <span>${photo.title}</span>
            <span class="card-category">${photo.category}</span>
        </div>
    `;
    
    // 点击卡片显示全屏
    card.addEventListener('click', () => {
        showFullscreenViewer(photo);
    });
    
    return card;
}

/**
 * 显示全屏影院模式
 */
function showFullscreenViewer(photo) {
    if (!fullscreenViewer) {
        fullscreenViewer = document.getElementById('fullscreen-viewer');
    }
    
    if (!fullscreenViewer) return;
    
    const fullscreenImage = document.getElementById('fullscreen-image');
    const fullscreenTitle = document.getElementById('fullscreen-title');
    const fullscreenDate = document.getElementById('fullscreen-date');
    const fullscreenCategory = document.getElementById('fullscreen-category');
    const fullscreenNotes = document.getElementById('fullscreen-notes');
    
    if (fullscreenImage) fullscreenImage.src = photo.image;
    if (fullscreenTitle) fullscreenTitle.textContent = photo.title;
    if (fullscreenDate) fullscreenDate.textContent = `📅 ${photo.date}`;
    if (fullscreenCategory) fullscreenCategory.textContent = `🏷️ ${photo.category}`;
    
    if (fullscreenNotes) {
        if (photo.notes) {
            fullscreenNotes.textContent = photo.notes;
            fullscreenNotes.style.display = 'block';
        } else {
            fullscreenNotes.style.display = 'none';
        }
    }
    
    // 显示全屏查看器
    fullscreenViewer.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // ESC 键关闭
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeFullscreenViewer();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    // 点击背景关闭
    fullscreenViewer.addEventListener('click', (e) => {
        if (e.target === fullscreenViewer) {
            closeFullscreenViewer();
        }
    });
}

/**
 * 关闭全屏影院模式
 */
function closeFullscreenViewer() {
    if (!fullscreenViewer) {
        fullscreenViewer = document.getElementById('fullscreen-viewer');
    }
    
    if (fullscreenViewer) {
        fullscreenViewer.classList.remove('show');
        document.body.style.overflow = '';
    }
}

/**
 * 清空年度墙
 */
function clearGallery() {
    const photoWall = document.getElementById('photo-wall');
    const galleryTitle = document.getElementById('gallery-title');
    const dropdown = document.getElementById('gallery-year-dropdown');
    
    if (photoWall) photoWall.innerHTML = '';
    if (galleryTitle) galleryTitle.textContent = '年度墙';
    if (dropdown) dropdown.style.display = 'none';
    currentGalleryData = [];
    currentGalleryYear = null;
}

// 导出全局函数
window.closeFullscreenViewer = closeFullscreenViewer;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', initCoolGallery);
