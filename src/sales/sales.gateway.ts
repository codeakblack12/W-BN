import { SubscribeMessage, WebSocketGateway, WebSocketServer, MessageBody, WsException, ConnectedSocket } from '@nestjs/websockets';
import { SalesService } from './sales.service';
import { Cart, AddToCart, CreateCart, CreateDockyardCart, AddToDockyardCart } from './schemas/sales.schema';
import { BadRequestException, UnauthorizedException, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { WsResponse } from '@nestjs/websockets';
import { SalesGuard } from './sales.guard';
import { AuthService } from 'src/auth/auth.service';
import { User } from 'src/auth/schemas/auth.schema';

@WebSocketGateway({
  // namespace: 'sales',
  cors: {
    origin: "*",
  }
})
export class SalesGateway {

  constructor(
    private readonly service: SalesService,
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
  @SubscribeMessage('create_cart')
  async createCart(@MessageBody() body: CreateCart, @ConnectedSocket() socket) {
    let auth_1 = socket.handshake.auth.authorization
    let auth_2 = socket.handshake.headers.authorization
    const auth_token = auth_1 || auth_2

    if(auth_token){
      try {
        const user: User = await this.authService.getUserFromSocket(socket)

        const response = await this.service.createCart(user, body)

        // Send Data to Desktop Handler
        this.server.emit(user._id, response)

        // Send Data to Mobile app scanners
        this.server.emit(`SALES-${response.warehouse}`, response)
      } catch (error) {
        console.log(error)
        // throw new WsException(error);
      }
    }

  }


  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage('create_dockyard_cart')
  async createDockyardCart(@MessageBody() body: CreateDockyardCart, @ConnectedSocket() socket) {
    let auth_1 = socket.handshake.auth.authorization
    let auth_2 = socket.handshake.headers.authorization
    const auth_token = auth_1 || auth_2

    if(auth_token){
      try {
        const user: User = await this.authService.getUserFromSocket(socket)

        const response = await this.service.createDockyardCart(user, body)

        // Send Data to Mobile app scanners
        this.server.emit(`DOCKYARD-${response.warehouse}`, response)

      } catch (error) {
        console.log(error)
        // throw new WsException(error);
      }
    }

  }

  @UsePipes(new ValidationPipe())
  @SubscribeMessage('add_to_cart')
  async addToCart(@MessageBody(new ValidationPipe({ transform: true })) body: AddToCart, @ConnectedSocket() socket) {
    try {

      const user: User = await this.authService.getUserFromSocket(socket)
      const response = await this.service.addToCart(user, body)

      this.server.emit(body.cart, response.new_payload)
      this.server.emit(`CHECKOUT-${body.cart}`, response.summary)

    } catch (error) {
      console.log(error)
      // throw new WsException(error);
    }
  }

  @UsePipes(new ValidationPipe())
  @SubscribeMessage('add_to_dockyard_cart')
  async addToDockyardCart(@MessageBody(new ValidationPipe({ transform: true })) body: AddToDockyardCart, @ConnectedSocket() socket) {
    try {

      const user: User = await this.authService.getUserFromSocket(socket)
      const response = await this.service.addToDockyardCart(user, body)

      this.server.emit(body.cart, response)
      this.server.emit(`DOCKYARD-${user.warehouse[0]}`, response)

    } catch (error) {
      console.log(error)

      // throw new WsException(error);
    }
  }

  @UsePipes(new ValidationPipe())
  @SubscribeMessage('delete_from_dockyard_cart')
  async deleteFromDockyardCart(@MessageBody(new ValidationPipe({ transform: true })) body: AddToDockyardCart, @ConnectedSocket() socket) {
    try {
      const user: User = await this.authService.getUserFromSocket(socket)
      const response = await this.service.deleteFromDockyardCart(user, body)

      this.server.emit(body.cart, response)
      this.server.emit(`DOCKYARD-${user.warehouse[0]}`, response)

    } catch (error) {
      console.log(error)
      // throw new WsException(error);
    }
  }

}
