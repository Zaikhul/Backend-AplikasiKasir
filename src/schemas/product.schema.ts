import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type ProductDocument = mongoose.HydratedDocument<Product>;

@Schema()
export class ProductImage {
  @Prop({ required: true })
  url: string;

  @Prop()
  publicId?: string;
}
const ProductImageSchema = SchemaFactory.createForClass(ProductImage);

@Schema({ timestamps: true })
export class Product {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: mongoose.Schema.Types.ObjectId;

  @Prop({
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name must be at most 200 characters'],
  })
  name: string;

  @Prop({
    required: [true, 'Description is required'],
    trim: true,
  })
  description: string;

  @Prop({
    required: [true, 'Price is required'],
    min: [0, 'Price must be greater than or equal to 0'],
  })
  price: number;

  @Prop({
    required: [true, 'Category is required'],
    enum: ['Mains', 'Desserts', 'Drinks', 'Appetizers'],
    index: true,
  })
  category: string;

  @Prop({
    required: [true, 'Inventory is required'],
    min: [0, 'Inventory cannot be negative'],
    default: 0,
  })
  inventory: number;

  @Prop({
    required: [true, 'SKU is required'],
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
  })
  sku: string;

  @Prop({
    required: [true, 'Image URL is required'],
    trim: true,
  })
  imageUrl: string;

  @Prop({
    type: [ProductImageSchema],
    default: [],
  })
  detailedImages: ProductImage[];

  @Prop({
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out of Stock'],
    default: 'Out of Stock',
    index: true,
  })
  status: string;

  @Prop({
    min: [0, 'Rating must be at least 0'],
    max: [5, 'Rating must be at most 5'],
    default: 0,
  })
  rating: number;

  @Prop({ default: true })
  isAvailable: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Index for text search
ProductSchema.index({ name: 'text', description: 'text' });

// Compound index for user and category
ProductSchema.index({ userId: 1, category: 1 });

// Auto-update status based on inventory
ProductSchema.pre('save', function (next) {
  if (this.isModified('inventory')) {
    if (this.inventory === 0) {
      this.status = 'Out of Stock';
      this.isAvailable = false;
    } else if (this.inventory < 10) {
      this.status = 'Low Stock';
    } else {
      this.status = 'In Stock';
    }
  }
  next();
});
