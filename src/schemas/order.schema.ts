import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type OrderDocument = mongoose.HydratedDocument<Order>;

@Schema()
export class OrderItem {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  })
  productId: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop()
  imageUrl?: string;
}
const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: mongoose.Schema.Types.ObjectId;

  @Prop({
    required: false, // Made optional - will be auto-generated in pre-save hook
    unique: true,
    index: true,
  })
  orderNumber?: string;

  @Prop({
    type: [OrderItemSchema],
    required: true,
  })
  items: OrderItem[];

  @Prop({
    required: true,
    min: 0,
  })
  subtotal: number;

  @Prop({
    required: true,
    min: 0,
    default: 0,
  })
  tax: number;

  @Prop({
    required: true,
    min: 0,
  })
  total: number;

  @Prop({
    min: 0,
  })
  cashReceived?: number;

  @Prop({
    min: 0,
  })
  changeGiven?: number;

  @Prop({
    type: String,
    enum: ['cash', 'card', 'digital'],
    required: true,
  })
  paymentMethod: string;

  @Prop({
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'refunded'],
    default: 'pending',
    index: true,
  })
  status: string;

  @Prop()
  notes?: string;

  @Prop({ type: mongoose.Schema.Types.Mixed }) // Flexible field for additional data
  meta?: Record<string, any>;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  })
  cashierId?: mongoose.Schema.Types.ObjectId;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Index for date range queries
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });

// Generate order number before save
OrderSchema.pre('save', function (next) {
  // Always generate orderNumber for new documents if not already set
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const timestamp = date.getTime().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    this.orderNumber = `ORD-${timestamp}-${random}`;
  }
  // Validate that orderNumber exists before save
  if (!this.orderNumber) {
    return next(new Error('Order number is required but was not generated'));
  }
  next();
});
