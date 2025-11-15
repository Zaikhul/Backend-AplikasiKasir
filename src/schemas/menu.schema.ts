import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type MenuDocument = mongoose.HydratedDocument<Menu>;

@Schema()
export class Image {
  @Prop()
  url: string;

  @Prop()
  publicId: string;
}
const ImageSchema = SchemaFactory.createForClass(Image);

@Schema({ timestamps: true })
export class Menu {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: mongoose.Schema.Types.ObjectId;

  @Prop({
    required: [true, 'Menu name is required'],
  })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({
    required: [true, 'Price is required'],
    min: 0,
  })
  price: number;

  @Prop({
    required: [true, 'Category is required'],
    index: true,
  })
  category: string;

  @Prop({ type: ImageSchema })
  image: Image;

  @Prop({ default: 0 })
  stock: number;

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop({
    unique: true,
    sparse: true,
  })
  sku: string;
}

export const MenuSchema = SchemaFactory.createForClass(Menu);

MenuSchema.index({ name: 'text', description: 'text' });
