// ============================================
// Repositorio Base
// ============================================

import mongoose, { Model, Document, FilterQuery, UpdateQuery } from 'mongoose';
import { BaseDocument } from '../../packages/types/src';
import { PaginationQuery } from '../../packages/types/src';

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class BaseRepository<T extends BaseDocument & Document> {
  protected model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findById(id).exec();
  }

  async findByIdWithCompany(id: string, companyId: string): Promise<T | null> {
    return this.model.findOne({ _id: id, companyId }).exec();
  }

  async findMany(filter: FilterQuery<T> = {}, pagination?: PaginationQuery): Promise<PaginationResult<T>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const sort = pagination?.sort || 'createdAt';
    const order = pagination?.order === 'asc' ? 1 : -1;

    const total = await this.model.countDocuments(filter).exec();
    const data = await this.model
      .find(filter)
      .sort({ [sort]: order })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: Partial<T>): Promise<T> {
    const document = new this.model(data);
    return document.save();
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec();
  }

  async updateByCompany(id: string, companyId: string, data: Partial<T>): Promise<T | null> {
    return this.model.findOneAndUpdate({ _id: id, companyId }, data, { new: true, runValidators: true }).exec();
  }

  async softDelete(id: string): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, { status: 'cancelled' }, { new: true }).exec();
  }

  async softDeleteByCompany(id: string, companyId: string): Promise<T | null> {
    return this.model.findOneAndUpdate({ _id: id, companyId }, { status: 'cancelled' }, { new: true }).exec();
  }

  async count(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    const count = await this.model.countDocuments(filter).exec();
    return count > 0;
  }
}
