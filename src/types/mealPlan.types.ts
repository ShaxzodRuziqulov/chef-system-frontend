export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED'
export type MealType  = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'

export interface MealPlanEntryDto {
  id:              number
  recipeId:        number
  recipeTitleUz?:  string
  recipeTitleRu?:  string
  recipeImageUrl?: string
  dayOfWeek:       number   // 1=Dushanba ... 7=Yakshanba
  mealType:        MealType
  servings:        number
  notes?:          string
}

export interface MealPlanResponse {
  id:            number
  userId:        string
  userFullName?: string
  name:          string
  weekStartDate: string   // 'YYYY-MM-DD'
  weekEndDate:   string
  status:        PlanStatus
  notes?:        string
  entries:       MealPlanEntryDto[]
  createdAt:     string
  updatedAt:     string
}

export interface MealPlanCreateRequest {
  name:          string
  weekStartDate: string
  notes?:        string
}

export interface MealPlanEntryRequest {
  recipeId:  number
  dayOfWeek: number
  mealType:  MealType
  servings:  number
  notes?:    string
}
