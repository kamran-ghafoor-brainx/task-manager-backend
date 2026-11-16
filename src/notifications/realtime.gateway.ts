import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  AuthEvents,
  type JwtPayload,
  type SessionsRevokedEvent,
} from '../auth/auth.types';
import { isAllowedOrigin, parseCorsOrigins } from '../common/cors/cors-origins';
import { UsersService } from '../users/user.service';

const userRoom = (userId: number): string => `user:${userId}`;

const MAX_TIMER_MS = 2_147_483_647;

type AuthenticatedSocket = {
  userId: number;
  expiresAtMs: number;
};

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) =>
      callback(
        null,
        isAllowedOrigin(origin, parseCorsOrigins(process.env.CORS_ORIGINS)),
      ),
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const session = await this.authenticate(client);

    if (session === null) {
      client.disconnect(true);
      return;
    }

    client.data.userId = session.userId;
    client.data.expiryTimer = setTimeout(
      () => {
        this.logger.log(`Socket ${client.id} disconnected: token expired`);
        client.disconnect(true);
      },
      Math.min(Math.max(session.expiresAtMs - Date.now(), 0), MAX_TIMER_MS),
    );

    await client.join(userRoom(session.userId));
    this.logger.log(`Socket ${client.id} joined ${userRoom(session.userId)}`);
  }

  handleDisconnect(client: Socket): void {
    clearTimeout(client.data.expiryTimer as NodeJS.Timeout | undefined);
    this.logger.log(`Socket ${client.id} disconnected`);
  }

  @OnEvent(AuthEvents.SessionsRevoked)
  onSessionsRevoked(event: SessionsRevokedEvent): void {
    this.server.in(userRoom(event.userId)).disconnectSockets(true);
    this.logger.log(`Disconnected all sockets of user ${event.userId}`);
  }

  emitToUser(userId: number, event: string, payload: unknown): void {
    this.server.to(userRoom(userId)).emit(event, payload);
  }

  private async authenticate(
    client: Socket,
  ): Promise<AuthenticatedSocket | null> {
    const token: unknown = client.handshake.auth?.token;
    if (typeof token !== 'string' || token === '') {
      this.logger.warn(`Socket ${client.id} rejected: no token`);
      return null;
    }

    let payload: JwtPayload & { exp: number };
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload & { exp: number }>(
        token,
      );
    } catch {
      this.logger.warn(
        `Socket ${client.id} rejected: invalid or expired token`,
      );
      return null;
    }

    const user = await this.usersService.findById(Number(payload.sub));
    if (!user || payload.ver !== user.tokenVersion) {
      this.logger.warn(
        `Socket ${client.id} rejected: user gone or token revoked`,
      );
      return null;
    }

    if (user.emailVerifiedAt === null) {
      this.logger.warn(`Socket ${client.id} rejected: email not verified`);
      return null;
    }

    return { userId: user.id, expiresAtMs: payload.exp * 1000 };
  }
}
