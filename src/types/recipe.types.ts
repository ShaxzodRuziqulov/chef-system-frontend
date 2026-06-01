// ─────────────────────────────────────────────────────────────────
// Recipe
// ─────────────────────────────────────────────────────────────────

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD'
export type MeasurementUnit =
  | 'GRAM' | 'KG' | 'ML' | 'LITER'
  | 'CUP' | 'TABLESPOON' | 'TEASPOON'
  | 'PIECE' | 'PINCH' | 'TO_TASTE'

export interface TagDto {
  id:          number
  nameUz:      string
  nameRu?:     string
  nameEng?:    string
  description?: string
}

export interface RecipeIngredientDto {
  id:                 number
  ingredientId:       number
  ingredientNameUz:   string
  ingredientNameRu?:  string
  ingredientNameEng?: string
  amount:             number
  unit:               MeasurementUnit
  notes?:             string
  orderIndex:         number
}

export interface RecipeStepDto {
  id:              number
  stepNumber:      number
  instruction:     string
  imageUrl?:       string
  durationMinutes?: number
}

export interface RecipeImageDto {
  id:        number
  imageUrl:  string
  isPrimary: boolean
  caption?:  string
}

export interface NutritionalInfoDto {
  id:                  number
  caloriesPerServing?: number
  proteinGrams?:       number
  fatGrams?:           number
  carbohydrateGrams?:  number
  fiberGrams?:         number
  sugarGrams?:         number
  sodiumMg?:           number
}

export interface RecipeDto {
  id:              number
  titleUz:         string
  titleRu?:        string
  titleEng?:       string
  description?:    string

  categoryId?:     number
  categoryNameUz?: string

  prepTimeMinutes: number
  cookTimeMinutes: number
  totalTimeMinutes: number
  servings:        number
  difficultyLevel: DifficultyLevel

  imageUrl?:       string
  videoUrl?:       string
  visible:         boolean

  averageRating?:  number
  ratingCount?:    number
  viewCount?:      number

  authorId?:       string
  authorFullName?: string

  tags:            TagDto[]
  ingredients:     RecipeIngredientDto[]
  steps:           RecipeStepDto[]
  images?:         RecipeImageDto[]
  nutritionalInfo?: NutritionalInfoDto

  createdAt: string
  updatedAt: string
}

// ── Request DTOlar ────────────────────────────────────────────────

export interface RecipeIngredientRequest {
  ingredientId: number
  amount:       number
  unit:         MeasurementUnit
  notes?:       string
  orderIndex?:  number
}

export interface RecipeStepRequest {
  stepNumber:      number
  instruction:     string
  imageUrl?:       string
  durationMinutes?: number
}

export interface NutritionalInfoRequest {
  caloriesPerServing?: number
  proteinGrams?:       number
  fatGrams?:           number
  carbohydrateGrams?:  number
  fiberGrams?:         number
  sugarGrams?:         number
  sodiumMg?:           number
}

export interface RecipeCreateRequest {
  titleUz:         string
  titleRu?:        string
  titleEng?:       string
  description?:    string
  categoryId?:     number
  tagIds?:         number[]
  prepTimeMinutes?: number
  cookTimeMinutes?: number
  servings?:       number
  difficultyLevel?: DifficultyLevel
  imageUrl?:       string
  imageUrls?:      string[]   // gallery rasmlari (max 10)
  videoUrl?:       string
  visible?:        boolean
  ingredients?:    RecipeIngredientRequest[]
  steps?:          RecipeStepRequest[]
  nutritionalInfo?: NutritionalInfoRequest
}

export interface RecipeUpdateRequest extends Partial<RecipeCreateRequest> {}
