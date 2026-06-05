// Export một socket instance dùng chung cho toàn bộ frontend
import { io } from 'socket.io-client';

export const socket = io();
