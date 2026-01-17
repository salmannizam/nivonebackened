import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Global()
@Module({
  imports: [MongooseModule],
  exports: [MongooseModule],
})
export class DatabaseModule {}
