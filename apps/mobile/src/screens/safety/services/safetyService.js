import apiClient from '../../../services/apiClient';
import { API_BASE_URL } from '../../../constants';

export const postSOS = (data) => 
  apiClient.post('/safety/sos', data);

export const updateSOSAudio = (id, audioUrl) => 
  apiClient.patch(`/safety/sos/${id}/audio`, { audio_url: audioUrl });

export const postCompartmentAlert = (data) => 
  apiClient.post('/safety/compartment-alert', data);

export const postHazardReport = (data) => 
  apiClient.post('/safety/hazard-report', data);

export const getMyEvents = () => 
  apiClient.get('/safety/my-events');

export const resolveEvent = (id, data) => 
  apiClient.patch(`/safety/events/${id}/resolve`, data);

export const getPublicMap = () => 
  fetch(`${API_BASE_URL}/safety/public/map`).then(r => r.json());
