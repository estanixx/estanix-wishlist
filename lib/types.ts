// lib/types.ts — domain types shared by lib/wish-repository.ts,
// lib/wish-state.ts, and every app/api/** route. Mirrors design.md's
// Interfaces/Contracts section exactly.

export type Wish = {
  id: string;
  title: string;
  description: string;
  oneIsEnough: boolean;
  reservable: boolean;
  order: number;
  reservedCount: number;
  optionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Option = {
  id: string;
  wishId: string;
  title: string;
  description: string;
  imageUrl: string;
  link: string;
  reserved: boolean;
  reservedAt: string | null;
};

export type WishWithOptions = Wish & { options: Option[] };

export type CreateWishOptionInput = Pick<Option, 'title' | 'description' | 'imageUrl' | 'link'>;

export type CreateWishInput = {
  title: string;
  description: string;
  oneIsEnough: boolean;
  reservable: boolean;
  order: number;
  options: CreateWishOptionInput[];
};

export type UpdateWishInput = Partial<Pick<Wish, 'title' | 'description' | 'oneIsEnough' | 'reservable' | 'order'>>;

export type CreateOptionInput = Pick<Option, 'title' | 'description' | 'imageUrl' | 'link'>;

export type UpdateOptionInput = Partial<Pick<Option, 'title' | 'description' | 'imageUrl' | 'link'>>;
