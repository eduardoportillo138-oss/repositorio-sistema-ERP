import { Model, Document, FilterQuery } from 'mongoose';
import { BaseDocument, PaginationQuery } from '../../../packages/types/dist';
import { ValidationError } from '../errors/AppError';
import { isValidObjectId, pagination } from '../utils/validation';

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Company context must come from the authenticated actor, never request input. */
export class BaseRepository<T extends BaseDocument & Document> {
  constructor(
    protected model: Model<T>,
    private companyId: string,
  ) {
    if (!isValidObjectId(companyId) || !model.schema.path('companyId'))
      throw new ValidationError('Repositorio empresarial sin contexto');
  }
  private scoped(filter: FilterQuery<T> = {}): FilterQuery<T> {
    return { ...filter, companyId: this.companyId } as FilterQuery<T>;
  }
  findById(id: string): Promise<T | null> {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    return this.model.findOne(this.scoped({ _id: id } as FilterQuery<T>)).exec();
  }
  async findMany(
    filter: FilterQuery<T> = {},
    query: PaginationQuery = {},
  ): Promise<PaginationResult<T>> {
    const { page, limit, skip } = pagination(query as Record<string, unknown>);
    const scope = this.scoped(filter);
    const sort = ['createdAt', 'updatedAt', 'name'].includes(query.sort || '')
      ? query.sort!
      : 'createdAt';
    const [total, data] = await Promise.all([
      this.model.countDocuments(scope).exec(),
      this.model
        .find(scope)
        .sort({ [sort]: query.order === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
  create(data: Partial<T>): Promise<T> {
    return new this.model({ ...data, companyId: this.companyId }).save();
  }
  update(id: string, data: Partial<T>): Promise<T | null> {
    if (
      Object.keys(data).some(
        (key) => key.startsWith('$') || key.includes('.') || ['companyId', '_id'].includes(key),
      )
    ) {
      throw new ValidationError('Campos de actualización inválidos');
    }
    return this.model
      .findOneAndUpdate(
        this.scoped({ _id: id } as FilterQuery<T>),
        { $set: data },
        { new: true, runValidators: true },
      )
      .exec();
  }
  softDelete(id: string): Promise<T | null> {
    return this.model
      .findOneAndUpdate(
        this.scoped({ _id: id } as FilterQuery<T>),
        { $set: { status: 'cancelled' } },
        { new: true },
      )
      .exec();
  }
  count(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(this.scoped(filter)).exec();
  }
  async exists(filter: FilterQuery<T>): Promise<boolean> {
    return !!(await this.model.exists(this.scoped(filter)));
  }
}
