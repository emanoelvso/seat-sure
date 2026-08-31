import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ClsModule } from 'nestjs-cls';

// TODO: move this to a .env file and config
export const jwtConstants = {
  secret: 'secret',
};

@Module({
  imports: [
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    JwtModule.register({
      secret: jwtConstants.secret,
      global: true,
      signOptions: { expiresIn: '60m' },
    }),
  ],
})
export class AuthModule {}
