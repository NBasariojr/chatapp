import { Server as SocketServer } from 'socket.io';

let _io: SocketServer;

export const setIO = (io: SocketServer): void => { _io = io; };
export const getIO = (): SocketServer => _io;