import { SubscribeMessage, WebSocketGateway, WebSocketServer, MessageBody, ConnectedSocket, WsException } from '@nestjs/websockets';
import { InventoryService } from './inventory.service';
import { AddToInventory } from './schemas/inventory.schema';
import { UseGuards, Request, UsePipes, ValidationPipe } from '@nestjs/common';
import { InventoryGuard } from './inventory.guard';
import { AuthService } from 'src/auth/auth.service';
import { User } from 'src/auth/schemas/auth.schema';
// import { Cart, AddToCart, CreateCart } from './schemas/inventory.schema';

@WebSocketGateway({
  // namespace: 'inventory',
  cors: {
    origin: "*",
  }
})
export class InventoryGateway {

  constructor(
    private readonly service: InventoryService,
    private authService: AuthService
  ) {}


  async handleConnection(socket) {
    try {
      await this.authService.getUserFromSocket(socket)
    } catch (error) {
      socket.disconnect()
    }
  }

  @WebSocketServer()
  server;

  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage('add_to_inventory')
  async addToCart(@Request() req, @MessageBody() body: AddToInventory, @ConnectedSocket() socket) {
    try {
      const user: User = await this.authService.getUserFromSocket(socket)

      const response = await this.service.addOrRemove(body.id, 'plus', user)

      this.server.emit(`INVENTORY-${user.warehouse[0]}`, response)

    } catch (error) {
      console.log(error)
      // throw new WsException(error)
    }
  }

}
