export const API_URL = 'http://localhost:3001/api';

export const secureFetch = (url, options = {}) => {
    return fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            ...options.headers,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }
    });
};
