export type ShoppingItemStatus = 'PENDING' | 'PURCHASED' | 'SKIPPED'

export interface ShoppingListItemDto {
  id:                  number
  ingredientId:        number
  ingredientNameUz?:   string
  ingredientNameRu?:   string
  ingredientNameEng?:  string
  amount:              number
  unit:                string
  status:              ShoppingItemStatus
  estimatedPrice?:     number
  notes?:              string
  grocerySection?:     string
}

export interface ShoppingListDto {
  id:           number
  userId:       string
  mealPlanId?:  number
  mealPlanName?: string
  name:         string
  completed:    boolean
  items:        ShoppingListItemDto[]
  createdAt:    string
  updatedAt?:    string
}

export interface ShoppingListItemStatusRequest {
  status: ShoppingItemStatus
}
