import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Menu, MenuDocument } from '@/schemas/menu.schema';
import { CreateMenuDto } from '@/dto/validate-menu';
import { UpdateMenuDto } from '@/dto/update-menu';

@Injectable()
export class MenuService {
  constructor(
    @InjectModel(Menu.name) private readonly menuModel: Model<MenuDocument>,
  ) {}

  async create(createMenuDto: CreateMenuDto, userId: string): Promise<Menu> {
    const createMenu = new this.menuModel({
      ...createMenuDto,
      userId: new Types.ObjectId(userId),
    });
    return createMenu.save();
  }

  async findAll(
    userId: string,
    category?: string,
    search?: string,
  ): Promise<Menu[]> {
    const query: FilterQuery<MenuDocument> = {
      userId: new Types.ObjectId(userId),
    };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search && search.trim()) {
      // Use regex for case-insensitive search instead of $text which requires text index
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    return this.menuModel.find(query).sort({ createdAt: -1 }).lean();
  }

  async findOne(id: string, userId: string): Promise<Menu | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.menuModel
      .findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .lean();
  }

  async update(
    id: string,
    updateMenuDto: UpdateMenuDto,
    userId: string,
  ): Promise<Menu | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.menuModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        updateMenuDto,
        { new: true },
      )
      .lean();
  }

  async remove(id: string, userId: string): Promise<Menu | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.menuModel
      .findOneAndDelete({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .lean();
  }
}
