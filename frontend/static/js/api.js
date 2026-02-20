/**
 * API 调用封装模块
 * 统一处理所有对后端API的Fetch请求
 */

// API 基础地址 - 可以根据环境配置
// 默认使用相对路径 '/api'（适用于前后端同域名部署）
// 开发环境：如果前后端分离，可以设置 window.API_BASE_URL = 'http://localhost:8000/api'
// 生产环境：如果前后端分离，可以设置 window.API_BASE_URL = 'http://your-api-domain.com/api'
const API_BASE = window.API_BASE_URL || '/api';

/**
 * 通用请求函数
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
        // 同源请求时，浏览器会自动携带 Basic Auth 认证信息
        credentials: 'same-origin',  // 同源请求，浏览器会自动传递认证信息
    };
    
    const config = { ...defaultOptions, ...options };
    
    console.log('API 请求:', url, options.method || 'GET');
    console.log('API_BASE:', API_BASE);
    console.log('完整 URL:', url);
    
    try {
        const response = await fetch(url, config);
        
        console.log('API 响应:', response.status, response.statusText, url);
        console.log('响应头:', Object.fromEntries(response.headers.entries()));
        
        // 如果是 401 未授权，可能是认证问题
        if (response.status === 401) {
            console.error('API 认证失败: 401 Unauthorized - 请检查 Basic Auth 配置');
            console.error('提示: 请确保已登录并输入了正确的用户名和密码');
            // 可以尝试重新触发认证（但这通常由浏览器自动处理）
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
            console.error('API 错误:', response.status, errorData);
            const error = new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            error.status = response.status;
            throw error;
        }
        
        const data = await response.json();
        console.log('API 成功:', url, '返回数据长度:', JSON.stringify(data).length);
        return data;
    } catch (error) {
        console.error('API请求失败:', url, error);
        console.error('错误详情:', {
            message: error.message,
            status: error.status,
            stack: error.stack
        });
        
        // 如果是网络错误，提供更友好的提示
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
    
    // 获取有记录的年份列表
    getAvailableYears: () => apiRequest('/items/years'),
    
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
            body: formData, // FormData 不需要设置 Content-Type
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(error.detail || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    },
};

// 导出API对象
window.CategoriesAPI = CategoriesAPI;
window.ItemsAPI = ItemsAPI;
