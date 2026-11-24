export interface IQueryParams {
  page?: string | number;
  limit?: string | number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  searchTerm?: string;
  [key: string]: any;
}

export class QueryBuilder {
  public query: Record<string, any>;
  public searchableFields: string[];

  constructor(query: Record<string, any>, searchableFields: string[] = []) {
    this.query = query;
    this.searchableFields = searchableFields;
  }

  public getPagination(): { skip: number; take: number; page: number; limit: number } {
    const page = Math.max(1, Number(this.query.page) || 1);
    const limit = Math.max(1, Number(this.query.limit) || 10);
    const skip = (page - 1) * limit;

    return { skip, take: limit, page, limit };
  }

  public getSort(): Record<string, 'asc' | 'desc'> {
    const sortBy = (this.query.sortBy as string) || 'createdAt';
    const sortOrder = (this.query.sortOrder as 'asc' | 'desc') || 'desc';

    return { [sortBy]: sortOrder };
  }

  public getWhere(): Record<string, any> {
    const queryObj = { ...this.query };
    const excludeFields = ['page', 'limit', 'sortBy', 'sortOrder', 'searchTerm'];
    excludeFields.forEach((field) => delete queryObj[field]);

    const where: Record<string, any> = {};

    // Search filter
    if (this.query.searchTerm && this.searchableFields.length > 0) {
      where.OR = this.searchableFields.map((field) => ({
        [field]: {
          contains: this.query.searchTerm,
          mode: 'insensitive',
        },
      }));
    }

    // Exact matches
    for (const [key, value] of Object.entries(queryObj)) {
      if (value !== undefined && value !== null && value !== '') {
        if (value === 'true') where[key] = true;
        else if (value === 'false') where[key] = false;
        else where[key] = value;
      }
    }

    return where;
  }
}
