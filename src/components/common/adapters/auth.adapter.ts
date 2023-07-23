import { IoAdapter } from '@nestjs/platform-socket.io';
import { Socket } from 'socket.io';
import { verifyAuthToken } from 'src/components/utils/auth-util';

export class WildcardsIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, options);
    server.use(async (socket: Socket, next) => {
      const userToken = socket.handshake.headers.authorization;

      if (userToken) {
        const { user } = await verifyAuthToken(userToken as string);

        console.log('Socket connected', user._id);

        socket.join(user._id);
      }

      return next();
    });
    return server;
  }
}
