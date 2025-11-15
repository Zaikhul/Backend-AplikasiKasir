import { PartialType } from '@nestjs/mapped-types';
import { CreateMenuDto } from './validate-menu';

export class UpdateMenuDto extends PartialType(CreateMenuDto) {}
