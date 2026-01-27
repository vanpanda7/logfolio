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
    
    // 获取年份列表
    try {
        const response = await ItemsAPI.getAvailableYears();
        const years = response.years || [];
        const currentYear = new Date().getFullYear();
        
        const yearSelect = document.getElementById('gallery-year-select');
        if (yearSelect) {
            // 清空现有选项（除了第一个）
            while (yearSelect.children.length > 1) {
                yearSelect.removeChild(yearSelect.lastChild);
            }
            
            // 添加年份选项
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                if (year === currentYear) {
                    option.selected = true;
                    currentGalleryYear = currentYear;
                }
                yearSelect.appendChild(option);
            });
            
            // 如果没有当前年，默认选中第一个
            if (!yearSelect.value && years.length > 0) {
                yearSelect.value = years[0];
                currentGalleryYear = parseInt(years[0]);
            }
            
            // 绑定年份选择事件
            yearSelect.addEventListener('change', async function() {
                const selectedYear = parseInt(this.value);
                if (selectedYear) {
                    await loadGalleryYear(selectedYear);
                } else {
                    clearGallery();
                }
            });
            
            // 如果已选中年份，自动加载
            if (yearSelect.value) {
                await loadGalleryYear(parseInt(yearSelect.value));
            }
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
async function loadGalleryYear(year) {
    const photoWall = document.getElementById('photo-wall');
    const galleryTitle = document.getElementById('gallery-title');
    const galleryStat = document.getElementById('gallery-stat');
    
    if (!photoWall) return;
    
    // 更新标题和统计
    if (galleryTitle) {
        galleryTitle.textContent = `${year} RECAP`;
    }
    
    if (galleryStat) {
        galleryStat.textContent = '加载中...';
    }
    
    // 清空现有内容
    photoWall.innerHTML = '';
    
    try {
        const photos = await ItemsAPI.getAnnualGallery(year);
        currentGalleryData = photos;
        currentGalleryYear = year;
        
        if (photos.length === 0) {
            if (galleryStat) {
                galleryStat.textContent = `这一年还没有带图片的记录`;
            }
            photoWall.innerHTML = '<div class="empty-state" style="color: rgba(255,255,255,0.7); padding: 3rem;"><div class="empty-icon">📷</div><p>这一年还没有带图片的记录</p></div>';
            return;
        }
        
        // 更新统计信息
        if (galleryStat) {
            galleryStat.textContent = `共 ${photos.length} 个精彩瞬间`;
        }
        
        // 渲染照片墙
        photos.forEach((photo, index) => {
            const card = createPhotoCard(photo, index);
            photoWall.appendChild(card);
            
            // 使用 IntersectionObserver 实现滚动入场动画
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('visible');
                            observer.unobserve(entry.target);
                        }
                    });
                },
                {
                    threshold: 0.1,
                    rootMargin: '50px'
                }
            );
            
            observer.observe(card);
        });
        
    } catch (error) {
        console.error('加载年度墙失败:', error);
        if (typeof showMessage === 'function') {
            showMessage('加载年度墙失败: ' + error.message, 'error');
        }
        if (galleryStat) {
            galleryStat.textContent = '加载失败，请重试';
        }
    }
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
    const galleryStat = document.getElementById('gallery-stat');
    
    if (photoWall) photoWall.innerHTML = '';
    if (galleryTitle) galleryTitle.textContent = '年度墙';
    if (galleryStat) galleryStat.textContent = '选择年份查看...';
    currentGalleryData = [];
    currentGalleryYear = null;
}

// 导出全局函数
window.closeFullscreenViewer = closeFullscreenViewer;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', initCoolGallery);
