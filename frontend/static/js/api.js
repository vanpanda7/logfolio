/**
 * API 调用封装模块
 * 统一处理所有对后端API的Fetch请求
 */

const API_BASE = window.API_BASE_URL || '/api';

let categoryCache = { data: null, timestamp: 0 };
const CATEGORY_CACHE_TTL = 5 * 60 * 1000;

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
    };
    
    const config = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(url, config);
        
        if (response.status === 401) {
            const error = new Error('认证失败，请检查用户名和密码。如果已登录，请刷新页面重试。');
            error.status = 401;
            throw error;
        }
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { detail: response.statusText };
            }
            const error = new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            error.status = response.status;
            throw error;
        }
        
        return await response.json();
    } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('网络请求失败，请检查网络连接或服务器状态');
        }
        throw error;
    }
}

/**
 * 分类相关API
 */
const CategoriesAPI = {
    getAll: (useCache = true) => {
        const now = Date.now();
        if (useCache && categoryCache.data && (now - categoryCache.timestamp) < CATEGORY_CACHE_TTL) {
            return Promise.resolve(categoryCache.data);
        }
        return apiRequest('/categories/').then(data => {
            categoryCache.data = data;
            categoryCache.timestamp = now;
            return data;
        });
    },
    
    create: (name) => apiRequest('/categories/', {
        method: 'POST',
        body: JSON.stringify({ name }),
    }).then(data => {
        categoryCache.data = null;
        return data;
    }),
    
    delete: (id) => apiRequest(`/categories/${id}`, {
        method: 'DELETE',
    }).then(data => {
        categoryCache.data = null;
        return data;
    }),
};

/**
 * 封面搜索（Bangumi/动漫/游戏），用于批量添加时拉取封面
 */
const CoverSearchAPI = {
    search: (q, type = 'all', source = 'bangumi') => {
        const params = new URLSearchParams({ q, type, page: 1, source });
        return apiRequest(`/anime-search?${params.toString()}`);
    },
};

/**
 * 记录相关API
 */
const ItemsAPI = {
    // 获取记录。若 params 含 limit/offset 则返回 { items, total }；否则返回列表（兼容旧用法）
    getAll: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/items/${queryString ? '?' + queryString : ''}`);
    },
    
    // 获取单条记录
    getById: (id) => apiRequest(`/items/${id}`),
    
    // 创建记录（含文件上传）
    create: async (formData) => {
        const url = `${API_BASE}/items/`;
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });
        
        if (response.status === 401) {
            const error = new Error('认证失败，请检查用户名和密码。如果已登录，请刷新页面重试。');
            error.status = 401;
            throw error;
        }
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(error.detail || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    },
    
    // 删除记录
    delete: (id) => apiRequest(`/items/${id}`, {
        method: 'DELETE',
    }),
    
    // 获取年度统计
    getYearStatistics: (year) => apiRequest(`/items/statistics/year/${year}`),
    
    // 获取统计（别名，便于使用）
    getStatistics: (year) => apiRequest(`/items/statistics/year/${year}`),
    
    // 获取有记录的年份列表
    getAvailableYears: () => apiRequest('/items/years'),

    // 按年份获取各分类数量（不传 year 为全部年份），用于首页分类胶囊数字
    getCategoryCounts: (year) => {
        const params = year != null && year !== '' ? new URLSearchParams({ year }) : '';
        return apiRequest(`/items/category-counts${params ? '?' + params : ''}`);
    },
    
    // 添加图片
    addImages: async (itemId, formData) => {
        const url = `${API_BASE}/items/${itemId}/images`;
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(error.detail || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    },

    // 从封面 URL 添加一张图片（动漫/漫画封面，后端会拉取并保存）
    addCoverFromUrl: async (itemId, coverImageUrl) => {
        const url = `${API_BASE}/items/${itemId}/cover-from-url`;
        const formData = new FormData();
        formData.append('cover_image_url', coverImageUrl);
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(error.detail || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    },
    
    // 删除图片
    deleteImage: (imageId) => apiRequest(`/items/images/${imageId}`, {
        method: 'DELETE',
    }),
    
    // 获取年度墙数据
    getAnnualGallery: (year) => apiRequest(`/items/annual-gallery/${year}`),
    getAchievementWall: (categoryId) => apiRequest(`/items/achievement-wall${categoryId != null ? '?category_id=' + encodeURIComponent(categoryId) : ''}`),
    
    // 获取待办列表
    getTodos: () => apiRequest('/items/todos'),
    
    // 完成待办
    completeTodo: (itemId) => apiRequest(`/items/${itemId}/complete`, {
        method: 'PUT',
    }),
    
    // 更新记录（支持待办和已完成记录）
    update: async (itemId, formData) => {
        const url = `${API_BASE}/items/${itemId}`;
        const response = await fetch(url, {
            method: 'PUT',
            body: formData,
        });
        
        if (response.status === 401) {
            const error = new Error('认证失败，请检查用户名和密码。如果已登录，请刷新页面重试。');
            error.status = 401;
            throw error;
        }
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(error.detail || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    },
};

// 导出API对象
window.CategoriesAPI = CategoriesAPI;
window.CoverSearchAPI = CoverSearchAPI;
window.ItemsAPI = ItemsAPI;
