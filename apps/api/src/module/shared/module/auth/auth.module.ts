import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ClsModule } from 'nestjs-cls';
import { ConfigModule } from '@sharedModules/config/config.module';
import { ConfigService } from '@sharedModules/config/service/config.service';

@Module({
  imports: [
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule.forRoot()],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // No default `expiresIn`: every access token this feature signs
        // carries its own explicit `exp` (capped at the session's
        // `expiresAt`), computed from the caller's `now`, never from the
        // jsonwebtoken library's own clock.
        secret: configService.get('auth.jwtSecret'),
      }),
    }),
  ],
})
export class AuthModule {}
