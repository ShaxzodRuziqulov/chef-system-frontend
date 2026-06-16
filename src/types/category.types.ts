export interface CategoryDto {
  id:           number
  nameUz:       string
  nameRu?:      string
  nameEng?:     string
  description?: string
  colorCode?:   string
}

export interface CategoryRequest {
  nameUz:       string
  nameRu?:      string
  nameEng?:     string
  description?: string
  colorCode?:   string
}

export type IngredientCategory = 'MEAT' | 'VEGETABLE' | 'FRUIT' | 'GRAIN' | 'DAIRY' | 'SPICE' | 'OIL' | 'OTHER'

export interface IngredientDto {
  id:              number
  nameUz:          string
  nameRu?:         string
  nameEng?:        string
  description?:    string
  imageUrl?:       string
  defaultUnit?:    string
  caloriesPer100g?: number
  allergen:        boolean
  category?:       IngredientCategory
}
