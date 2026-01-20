/**
 * API 调用封装模块
 * 统一处理所有对后端API的Fetch请求
 */

const API_BASE = '/api';

/**
 * 通用请求函数
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    const config = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(error.detail || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API请求失败:', error);
        throw error;
    }
}

/**
 * 分类相关API
 */
const CategoriesAPI = {
    // 获取所有分类
    getAll: () => apiRequest('/categories/'),
    
    // 创建分类
    create: (name) => apiRequest('/categories/', {
        method: 'POST',
        body: JSON.stringify({ name }),
    }),
    
    // 删除分类
    delete: (id) => apiRequest(`/categories/${id}`, {
        method: 'DELETE',
    }),
};

/**
 * 记录相关API
 */
const ItemsAPI = {
    // 获取所有记录
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
            body: formData, // FormData 不需要设置 Content-Type
        });
        
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
};

// 导出API对象
window.CategoriesAPI = CategoriesAPI;
window.ItemsAPI = ItemsAPI;
