import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';

export type UserDocument = mongoose.HydratedDocument<User>;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({
    type: String,
    enum: ['free', 'basic', 'premium'],
    default: 'free',
  })
  plan: string;

  @Prop({
    type: String,
    enum: ['active', 'inactive', 'canceled', 'expired'],
    default: 'inactive',
  })
  status: string;

  @Prop()
  stripeCustomerId: string;

  @Prop()
  stripeSubscriptionId: string;

  @Prop()
  currentPeriodEnd: Date;
}
const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

@Schema({ timestamps: true })
export class BusinessInfo {
  @Prop({ trim: true })
  businessName: string;

  @Prop({ trim: true })
  address: string;

  @Prop({ trim: true })
  phone: string;

  @Prop({ trim: true })
  taxId: string;
}
const BusinessInfoSchema = SchemaFactory.createForClass(BusinessInfo);

@Schema({ timestamps: true })
export class User {
  @Prop({
    required: [true, 'Name is required'],
    maxlength: [100, 'Name must be at most 100 characters'],
    trim: true,
  })
  name: string;

  @Prop({
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [emailRegex, 'Please provide a valid email address'],
    index: true,
  })
  email: string;

  @Prop({
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
  })
  password: string;

  @Prop({
    type: String,
    enum: ['admin', 'user', 'developer'],
    default: 'user',
  })
  role: string;

  @Prop({ type: SubscriptionSchema, default: () => ({}) })
  subscription: Subscription;

  @Prop({ type: BusinessInfoSchema, default: () => ({}) })
  businessInfo: BusinessInfo;

  comparePassword: (candidatePassword: string) => Promise<boolean>;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', async function (next) {
  try {
    if (this.isModified('password')) {
      this.password = await bcrypt.hash(this.password, 12);
    }
    return next();
  } catch (err) {
    return next(err as Error);
  }
});

UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};
