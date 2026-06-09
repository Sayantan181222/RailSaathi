import apiClient from '../../../services/apiClient';

export const submitPrefill = (data) => apiClient.post('/tatkal/prefill', data);

export const getMyRequests = () => apiClient.get('/tatkal/my-requests');

export const getRequest = (id) => apiClient.get('/tatkal/' + id);

export const fireRequest = (id) => apiClient.post('/tatkal/fire/' + id);

export const cancelRequest = (id) => apiClient.post('/tatkal/cancel/' + id);

export const getSurrenders = (params) => apiClient.get('/tatkal/surrenders', { params });

export const listSurrender = (data) => apiClient.post('/tatkal/surrender', data);

export const requestSurrender = (id) => apiClient.post('/tatkal/surrenders/' + id + '/request');
