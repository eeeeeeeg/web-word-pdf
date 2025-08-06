import axios from "axios";
import { saveAs } from "file-saver";

function tansParams(params) {
  let result = "";
  for (const propName of Object.keys(params)) {
    const value = params[propName];
    var part = encodeURIComponent(propName) + "=";
    if (value !== null && value !== "" && typeof value !== "undefined") {
      if (typeof value === "object") {
        for (const key of Object.keys(value)) {
          if (
            value[key] !== null &&
            value[key] !== "" &&
            typeof value[key] !== "undefined"
          ) {
            let params = propName + "[" + key + "]";
            var subPart = encodeURIComponent(params) + "=";
            result += subPart + encodeURIComponent(value[key]) + "&";
          }
        }
      } else {
        result += part + encodeURIComponent(value) + "&";
      }
    }
  }
  return result;
}
// 验证是否为blob格式
function blobValidate(data) {
  return data.type !== "application/json";
}
// 创建 axios 实例
const apiClient = axios.create({
  timeout: 10000, // 请求超时时间
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 在发送请求之前做些什么
    console.log("发送请求:", config);

    // // 添加认证 token
    // const token = localStorage.getItem("token");
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }

    // 添加时间戳防止缓存
    if (config.method === "get") {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }

    // 显示加载状态（可选）
    showLoading();

    return config;
  },
  (error) => {
    // 请求错误处理
    console.error("请求错误:", error);
    hideLoading();
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    // 隐藏加载状态
    hideLoading();
    console.log("收到响应:", response);

    if (
      response.request.responseType === "blob" ||
      response.request.responseType === "arraybuffer"
    ) {
      return response;
    }
    // 统一处理响应数据格式
    const { data } = response;

    // 根据业务需要处理响应数据
    if (data.code === 200 || data.success) {
      return data.data || data;
    } else {
      // 业务错误处理
      const message = data.message || "请求失败";
      showError(message);
      return Promise.reject(new Error(message));
    }
  },
  (error) => {
    // 隐藏加载状态
    hideLoading();
    console.error("响应错误:", error);

    // HTTP 状态码错误处理
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // 未授权，清除token并跳转到登录页
          handleUnauthorized();
          break;
        case 403:
          showError("没有权限访问");
          break;
        case 404:
          showError("请求的资源不存在");
          break;
        case 500:
          showError("服务器内部错误");
          break;
        default:
          showError(data?.message || `请求错误 (${status})`);
      }
    } else if (error.request) {
      // 网络错误
      showError("网络连接失败，请检查网络设置");
    } else {
      // 其他错误
      showError(error.message || "未知错误");
    }

    return Promise.reject(error);
  }
);

// 工具函数
let loadingCount = 0;

function showLoading() {
  loadingCount++;
  // 这里可以显示全局loading组件
  console.log("显示加载中...");
}

function hideLoading() {
  loadingCount--;
  if (loadingCount <= 0) {
    loadingCount = 0;
    // 这里可以隐藏全局loading组件
    console.log("隐藏加载中...");
  }
}

function showError(message) {
  // 这里可以显示全局错误提示
  console.error("错误提示:", message);
  // 例如: Toast.error(message) 或 alert(message)
}

function handleUnauthorized() {
  // 清除本地token
  localStorage.removeItem("token");
  // 跳转到登录页
  // 例如: window.location.href = '/login'
  console.log("用户未授权，跳转到登录页");
}

// 封装常用的请求方法
const api = {
  // GET 请求
  get(url, params = {}, config = {}) {
    return apiClient.get(url, { params, ...config });
  },

  // POST 请求
  post(url, data = {}, config = {}) {
    return apiClient.post(url, data, config);
  },

  // PUT 请求
  put(url, data = {}, config = {}) {
    return apiClient.put(url, data, config);
  },

  // DELETE 请求
  delete(url, config = {}) {
    return apiClient.delete(url, config);
  },

  // PATCH 请求
  patch(url, data = {}, config = {}) {
    return apiClient.patch(url, data, config);
  },

  // 文件上传
  upload(url, file, config = {}) {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      ...config,
    });
  },

  // 下载文件
  download(url, params = {}, filename = "download") {
    return apiClient
      .post(url, params, {
        transformRequest: [
          (params) => {
            return tansParams(params);
          },
        ],
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        responseType: "blob",
      })
      .then(async (response) => {
        const isBlob = blobValidate(response.data);
        if (isBlob) {
          // 从响应头获取文件类型和文件名
          const contentType =
            response.headers["content-type"] || "application/octet-stream";
          const contentDisposition = response.headers["content-disposition"];

          // 尝试从 Content-Disposition 头部获取文件名
          let downloadFilename = filename;
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(
              /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
            );
            if (filenameMatch && filenameMatch[1]) {
              downloadFilename = filenameMatch[1].replace(/['"]/g, "");
            }
          }

          // 创建带有正确 MIME 类型的 Blob
          const blob = new Blob([response.data], { type: contentType });

          // 使用 file-saver 库保存文件
          if (typeof saveAs !== "undefined") {
            saveAs(blob, downloadFilename);
          } else {
            // 如果没有 file-saver，使用原生方法
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", downloadFilename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }
        }
      })
      .catch((error) => {
        console.error("文件下载失败:", error);
        throw error;
      });
  },
};

// 取消请求的功能
export const createCancelToken = () => {
  return axios.CancelToken.source();
};

// 检查是否为取消的请求
export const isCancel = axios.isCancel;

// 导出 api 实例和原始 apiClient
export { api as default, apiClient };

// 使用示例：
/*
// 导入
import api from './api';

// GET 请求
api.get('/users', { page: 1, limit: 10 })
  .then(data => console.log(data))
  .catch(error => console.error(error));

// POST 请求
api.post('/users', { name: 'John', email: 'john@example.com' })
  .then(data => console.log(data))
  .catch(error => console.error(error));

// 文件上传
const file = document.getElementById('fileInput').files[0];
api.upload('/upload', file)
  .then(data => console.log(data))
  .catch(error => console.error(error));

// 取消请求
const cancelToken = createCancelToken();
api.get('/users', {}, { cancelToken: cancelToken.token })
  .catch(error => {
    if (isCancel(error)) {
      console.log('请求被取消');
    }
  });
// 取消请求
cancelToken.cancel('请求被用户取消');
*/
