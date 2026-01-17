import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SavedFilter, SavedFilterSchema } from '../schemas/saved-filter.schema';
import { SavedFilterService } from '../services/saved-filter.service';
import { SavedFilterController } from '../controllers/saved-filter.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SavedFilter.name, schema: SavedFilterSchema },
    ]),
  ],
  controllers: [SavedFilterController],
  providers: [SavedFilterService],
  exports: [SavedFilterService],
})
export class SavedFilterModule {}
