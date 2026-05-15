<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { recipesApi }     from '@/api/recipes'
import { categoriesApi }  from '@/api/categories'
import { ingredientsApi } from '@/api/ingredients'
import { uploadApi }      from '@/api/upload'
import { useLangStore }   from '@/stores/langStore'

const lang = useLangStore()

// ── Props & Emits ─────────────────────────────────────────────────
const props = defineProps({
  /** null = create mode, object = edit mode */
  recipe:  { type: Object, default: null },
  visible: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'saved'])

// ── State ─────────────────────────────────────────────────────────
const saving     = ref(false)
const activeTab  = ref('basic')   // basic | steps | ingredients | nutrition
const categories = ref([])
const errorMsg   = ref('')

// ── Form ──────────────────────────────────────────────────────────
const form = ref(emptyForm())

function emptyForm() {
  return {
    titleUz:         '',
    titleRu:         '',
    description:     '',
    categoryId:      '',
    difficultyLevel: 'MEDIUM',
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    servings:        4,
    imageUrl:        '',
    visible:         true,
  }
}

// ── Steps ─────────────────────────────────────────────────────────
const steps = ref([])

function addStep() {
  steps.value.push({
    stepNumber:      steps.value.length + 1,
    instruction:     '',
    durationMinutes: null,
    imageUrl:        '',
  })
}
function removeStep(i) {
  steps.value.splice(i, 1)
  steps.value.forEach((s, idx) => s.stepNumber = idx + 1)
}

// ── Ingredients ───────────────────────────────────────────────────
const ingredientLines    = ref([])   // { ingredient, amount, unit, notes }
const ingSearch          = ref('')
const ingResults         = ref([])
const ingSearching       = ref(false)
const ingSearchTimer     = ref(null)
const activeIngRow       = ref(-1)   // which row is searching

const UNITS = [
  { value: 'GRAM',       label: 'gram'       },
  { value: 'KILOGRAM',   label: 'kg'         },
  { value: 'MILLILITER', label: 'ml'         },
  { value: 'LITER',      label: 'litr'       },
  { value: 'CUP',        label: 'stakan'     },
  { value: 'TABLESPOON', label: 'osh qoshiq' },
  { value: 'TEASPOON',   label: 'choy qoshiq'},
  { value: 'PIECE',      label: 'dona'       },
  { value: 'BUNCH',      label: 'bog\'lam'   },
  { value: 'PINCH',      label: 'chimdim'    },
  { value: 'SLICE',      label: 'bo\'lak'    },
  { value: 'TO_TASTE',   label: 'ta\'mga qarab'},
]

function addIngredientLine() {
  ingredientLines.value.push({ ingredient: null, amount: '', unit: 'GRAM', notes: '' })
  activeIngRow.value = ingredientLines.value.length - 1
  ingSearch.value = ''
  ingResults.value = []
}
function removeIngredientLine(i) {
  ingredientLines.value.splice(i, 1)
  if (activeIngRow.value === i) activeIngRow.value = -1
}
function openIngSearch(rowIdx) {
  activeIngRow.value = rowIdx
  ingSearch.value = ingredientLines.value[rowIdx]?.ingredient?.nameUz || ''
  ingResults.value = []
}
function doIngSearch() {
  clearTimeout(ingSearchTimer.value)
  if (!ingSearch.value.trim()) { ingResults.value = []; return }
  ingSearchTimer.value = setTimeout(async () => {
    ingSearching.value = true
    try {
      const res = await ingredientsApi.search(ingSearch.value.trim(), { size: 8 })
      ingResults.value = (res.data?.data ?? res.data)?.content ?? []
    } catch { ingResults.value = [] }
    finally { ingSearching.value = false }
  }, 300)
}
function selectIngredient(ing) {
  if (activeIngRow.value >= 0) {
    ingredientLines.value[activeIngRow.value].ingredient = ing
  }
  ingResults.value = []
  ingSearch.value  = ''
}

// ── Nutrition ─────────────────────────────────────────────────────
const nutrition = ref({
  caloriesPerServing: '',
  proteinGrams:       '',
  fatGrams:           '',
  carbohydrateGrams:  '',
  fiberGrams:         '',
  sugarGrams:         '',
})
const hasNutrition = ref(false)

// ── Difficulties ──────────────────────────────────────────────────
const difficulties = computed(() => [
  { value: 'EASY',   label: '🟢 ' + lang.t('common.easy')   },
  { value: 'MEDIUM', label: '🟡 ' + lang.t('common.medium') },
  { value: 'HARD',   label: '🔴 ' + lang.t('common.hard')   },
])

// ── Watch visible → init form ──────────────────────────────────────
watch(() => props.visible, async (val) => {
  if (!val) return
  errorMsg.value = ''
  activeTab.value = 'basic'

  // Load categories
  try {
    const c = await categoriesApi.getAll()
    categories.value = c.data?.data ?? c.data ?? []
  } catch {}

  if (props.recipe) {
    // Edit mode — fill form from recipe
    const r = props.recipe
    form.value = {
      titleUz:         r.titleUz         || '',
      titleRu:         r.titleRu         || '',
      description:     r.description     || '',
      categoryId:      r.categoryId      || '',
      difficultyLevel: r.difficultyLevel || 'MEDIUM',
      prepTimeMinutes: r.prepTimeMinutes || 15,
      cookTimeMinutes: r.cookTimeMinutes || 30,
      servings:        r.servings        || 4,
      imageUrl:        r.imageUrl        || '',
      visible:         r.visible         ?? true,
    }
    steps.value = (r.steps || []).map(s => ({
      stepNumber:      s.stepNumber,
      instruction:     s.instruction,
      durationMinutes: s.durationMinutes || null,
      imageUrl:        s.imageUrl        || '',
    }))
    ingredientLines.value = (r.ingredients || []).map(ri => ({
      ingredient: { id: ri.ingredientId, nameUz: ri.ingredientNameUz || ri.ingredientNameRu || '' },
      amount:     ri.amount,
      unit:       ri.unit,
      notes:      ri.notes || '',
    }))
    if (r.nutritionalInfo) {
      hasNutrition.value = true
      nutrition.value = {
        caloriesPerServing: r.nutritionalInfo.caloriesPerServing || '',
        proteinGrams:       r.nutritionalInfo.proteinGrams       || '',
        fatGrams:           r.nutritionalInfo.fatGrams           || '',
        carbohydrateGrams:  r.nutritionalInfo.carbohydrateGrams  || '',
        fiberGrams:         r.nutritionalInfo.fiberGrams         || '',
        sugarGrams:         r.nutritionalInfo.sugarGrams         || '',
      }
    } else {
      hasNutrition.value = false
      nutrition.value = { caloriesPerServing: '', proteinGrams: '', fatGrams: '', carbohydrateGrams: '', fiberGrams: '', sugarGrams: '' }
    }
  } else {
    // Create mode — reset
    form.value = emptyForm()
    steps.value = []
    ingredientLines.value = []
    hasNutrition.value = false
    nutrition.value = { caloriesPerServing: '', proteinGrams: '', fatGrams: '', carbohydrateGrams: '', fiberGrams: '', sugarGrams: '' }
  }
})

// ── Tabs ──────────────────────────────────────────────────────────
const tabs = computed(() => [
  { key: 'basic',       icon: '📋', label: lang.t('form.basic')           },
  { key: 'steps',       icon: '📝', label: lang.t('form.steps_tab')       },
  { key: 'ingredients', icon: '🧅', label: lang.t('form.ingredients_tab') },
  { key: 'nutrition',   icon: '📊', label: lang.t('form.nutrition_tab')   },
])

// ── Validation ────────────────────────────────────────────────────
function validate() {
  if (!form.value.titleUz.trim()) {
    errorMsg.value = "Retsept nomi (UZ) kiritilishi shart"
    activeTab.value = 'basic'
    return false
  }
  if (!form.value.prepTimeMinutes || form.value.prepTimeMinutes < 1) {
    errorMsg.value = "Tayyorgarlik vaqti 1 dan katta bo'lishi kerak"
    activeTab.value = 'basic'
    return false
  }
  if (form.value.cookTimeMinutes < 0) {
    errorMsg.value = "Pishirish vaqti manfiy bo'lmasligi kerak"
    activeTab.value = 'basic'
    return false
  }
  if (!form.value.servings || form.value.servings < 1) {
    errorMsg.value = "Porsiya soni 1 dan katta bo'lishi kerak"
    activeTab.value = 'basic'
    return false
  }
  // Validate ingredient lines
  for (const line of ingredientLines.value) {
    if (!line.ingredient) {
      errorMsg.value = "Ingredient tanlanmagan satr bor"
      activeTab.value = 'ingredients'
      return false
    }
    if (!line.amount || Number(line.amount) <= 0) {
      errorMsg.value = "Ingredient miqdori noto'g'ri"
      activeTab.value = 'ingredients'
      return false
    }
  }
  return true
}

// ── Save ──────────────────────────────────────────────────────────
async function save() {
  errorMsg.value = ''
  if (!validate()) return

  saving.value = true
  try {
    const payload = {
      ...form.value,
      categoryId:      form.value.categoryId ? Number(form.value.categoryId) : null,
      prepTimeMinutes: Number(form.value.prepTimeMinutes),
      cookTimeMinutes: Number(form.value.cookTimeMinutes),
      servings:        Number(form.value.servings),
      steps: steps.value.map((s, i) => ({
        stepNumber:      i + 1,
        instruction:     s.instruction,
        durationMinutes: s.durationMinutes ? Number(s.durationMinutes) : null,
        imageUrl:        s.imageUrl || null,
      })).filter(s => s.instruction.trim()),
      ingredients: ingredientLines.value
        .filter(l => l.ingredient)
        .map((l, i) => ({
          ingredientId: l.ingredient.id,
          amount:       Number(l.amount),
          unit:         l.unit,
          notes:        l.notes || null,
          orderIndex:   i,
        })),
      nutritionalInfo: hasNutrition.value ? {
        caloriesPerServing: nutrition.value.caloriesPerServing ? Number(nutrition.value.caloriesPerServing) : null,
        proteinGrams:       nutrition.value.proteinGrams       ? Number(nutrition.value.proteinGrams)       : null,
        fatGrams:           nutrition.value.fatGrams           ? Number(nutrition.value.fatGrams)           : null,
        carbohydrateGrams:  nutrition.value.carbohydrateGrams  ? Number(nutrition.value.carbohydrateGrams)  : null,
        fiberGrams:         nutrition.value.fiberGrams         ? Number(nutrition.value.fiberGrams)         : null,
        sugarGrams:         nutrition.value.sugarGrams         ? Number(nutrition.value.sugarGrams)         : null,
      } : null,
    }

    let res
    if (props.recipe) {
      res = await recipesApi.update(props.recipe.id, payload)
    } else {
      res = await recipesApi.create(payload)
    }

    const saved = res.data?.data ?? res.data
    emit('saved', saved)
    emit('close')
  } catch (err) {
    const msg = err?.response?.data?.message || err?.response?.data?.data
    if (typeof msg === 'object') {
      errorMsg.value = Object.values(msg).join(', ')
    } else {
      errorMsg.value = msg || lang.t('common.error_save')
    }
  } finally {
    saving.value = false
  }
}

// ── Image upload ──────────────────────────────────────────────────
const imgError      = ref(false)
const imgUploading  = ref(false)
const fileInputRef  = ref(null)

watch(() => form.value.imageUrl, () => { imgError.value = false })

function triggerFileInput() {
  fileInputRef.value?.click()
}

async function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (!file) return
  imgUploading.value = true
  imgError.value     = false
  try {
    const res = await uploadApi.image(file)
    form.value.imageUrl = res.data?.data?.url ?? res.data?.url ?? ''
  } catch (err) {
    errorMsg.value = err?.response?.data?.message || lang.t('common.error_save')
  } finally {
    imgUploading.value  = false
    e.target.value = '' // reset input
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal">

          <!-- Header -->
          <div class="modal-head">
            <div class="modal-title-row">
              <div class="modal-icon">{{ recipe ? '✏️' : '➕' }}</div>
              <div>
                <h2 class="modal-title">{{ recipe ? lang.t('form.edit_title') : lang.t('form.create_title') }}</h2>
                <p class="modal-sub">{{ recipe ? lang.recipeTitle(recipe) : lang.t('form.title_uz') }}</p>
              </div>
            </div>
            <button class="modal-close" @click="$emit('close')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Tabs -->
          <div class="modal-tabs">
            <button
              v-for="t in tabs"
              :key="t.key"
              @click="activeTab = t.key"
              class="modal-tab"
              :class="{ 'tab-active': activeTab === t.key }"
            >
              <span>{{ t.icon }}</span> {{ t.label }}
              <span v-if="t.key === 'steps' && steps.length" class="tab-badge">{{ steps.length }}</span>
              <span v-if="t.key === 'ingredients' && ingredientLines.length" class="tab-badge">{{ ingredientLines.length }}</span>
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body">

            <!-- Error -->
            <div v-if="errorMsg" class="form-error">⚠️ {{ errorMsg }}</div>

            <!-- ── TAB: BASIC ── -->
            <div v-show="activeTab === 'basic'" class="tab-content">
              <div class="form-grid-2">
                <!-- Title UZ -->
                <div class="form-field span-2">
                  <label class="field-label">{{ lang.t('form.title_uz') }}</label>
                  <input v-model="form.titleUz" class="field-input" placeholder="Masalan: Osh palov" />
                </div>
                <!-- Title RU -->
                <div class="form-field span-2">
                  <label class="field-label">{{ lang.t('form.title_ru') }}</label>
                  <input v-model="form.titleRu" class="field-input" placeholder="Ploff uzbekskiy" />
                </div>
                <!-- Description -->
                <div class="form-field span-2">
                  <label class="field-label">{{ lang.t('form.description') }}</label>
                  <textarea v-model="form.description" class="field-textarea" rows="3" :placeholder="lang.t('form.description')" />
                </div>
                <!-- Category -->
                <div class="form-field">
                  <label class="field-label">{{ lang.t('form.category') }}</label>
                  <select v-model="form.categoryId" class="field-select">
                    <option value="">{{ lang.t('form.select_cat') }}</option>
                    <option v-for="c in categories" :key="c.id" :value="c.id">{{ lang.catName(c) }}</option>
                  </select>
                </div>
                <!-- Difficulty -->
                <div class="form-field">
                  <label class="field-label">{{ lang.t('form.difficulty') }}</label>
                  <div class="diff-pills">
                    <button
                      v-for="d in difficulties"
                      :key="d.value"
                      type="button"
                      @click="form.difficultyLevel = d.value"
                      class="diff-pill"
                      :class="{ 'diff-active': form.difficultyLevel === d.value }"
                    >{{ d.label }}</button>
                  </div>
                </div>
                <!-- Prep time -->
                <div class="form-field">
                  <label class="field-label">{{ lang.t('form.prep_time') }}</label>
                  <input v-model.number="form.prepTimeMinutes" type="number" min="1" class="field-input" />
                </div>
                <!-- Cook time -->
                <div class="form-field">
                  <label class="field-label">{{ lang.t('form.cook_time') }}</label>
                  <input v-model.number="form.cookTimeMinutes" type="number" min="0" class="field-input" />
                </div>
                <!-- Servings -->
                <div class="form-field">
                  <label class="field-label">{{ lang.t('form.servings') }}</label>
                  <input v-model.number="form.servings" type="number" min="1" class="field-input" />
                </div>
                <!-- Image upload -->
                <div class="form-field span-2">
                  <label class="field-label">{{ lang.t('form.image') }}</label>

                  <!-- Hidden file input -->
                  <input
                    ref="fileInputRef"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style="display:none"
                    @change="onFileSelected"
                  />

                  <!-- Upload area -->
                  <div class="img-upload-wrap" @click="triggerFileInput">
                    <!-- Preview if URL set -->
                    <div v-if="form.imageUrl && !imgError" class="img-preview-box">
                      <img :src="form.imageUrl" @error="imgError = true" />
                      <div class="img-change-overlay">
                        <span>{{ lang.t('form.image_change') }}</span>
                      </div>
                    </div>
                    <!-- Uploading spinner -->
                    <div v-else-if="imgUploading" class="img-placeholder uploading">
                      <span class="upload-spin" />
                      <span class="upload-hint">{{ lang.t('common.loading') }}</span>
                    </div>
                    <!-- Empty state -->
                    <div v-else class="img-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      <span class="upload-hint">{{ lang.t('form.image_hint') }}</span>
                      <span class="upload-sub">{{ lang.t('form.image_sub') }}</span>
                    </div>
                  </div>

                  <!-- URL manual input -->
                  <input
                    v-model="form.imageUrl"
                    class="field-input"
                    :placeholder="lang.t('form.image_url')"
                    style="margin-top:8px"
                    @focus="imgError = false"
                  />
                </div>
                <!-- Visible toggle -->
                <div class="form-field span-2">
                  <label class="toggle-row">
                    <div class="toggle-track" :class="{ 'toggle-on': form.visible }" @click="form.visible = !form.visible">
                      <div class="toggle-thumb" />
                    </div>
                    <span class="toggle-label">{{ lang.t('form.visible') }}</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- ── TAB: STEPS ── -->
            <div v-show="activeTab === 'steps'" class="tab-content">
              <div class="tab-empty-hint" v-if="!steps.length">
                {{ lang.t('form.no_steps') }}
              </div>
              <div class="steps-list">
                <div v-for="(step, i) in steps" :key="i" class="step-row">
                  <div class="step-num">{{ i + 1 }}</div>
                  <div class="step-fields">
                    <textarea
                      v-model="step.instruction"
                      class="field-textarea"
                      rows="2"
                      :placeholder="`${i+1}-bosqich tavsifi...`"
                    />
                    <div class="step-meta">
                      <input
                        v-model.number="step.durationMinutes"
                        type="number" min="0"
                        class="field-input step-dur"
                        :placeholder="lang.t('form.step_duration')"
                      />
                      <input
                        v-model="step.imageUrl"
                        class="field-input step-img-url"
                        :placeholder="lang.t('form.step_image_url')"
                      />
                    </div>
                  </div>
                  <button class="step-del" @click="removeStep(i)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </div>
              <button @click="addStep" class="add-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                {{ lang.t('form.add_step') }}
              </button>
            </div>

            <!-- ── TAB: INGREDIENTS ── -->
            <div v-show="activeTab === 'ingredients'" class="tab-content">
              <div class="tab-empty-hint" v-if="!ingredientLines.length">
                {{ lang.t('form.no_ingredients') }}
              </div>

              <div class="ing-list">
                <div v-for="(line, i) in ingredientLines" :key="i" class="ing-row">
                  <!-- Ingredient select -->
                  <div class="ing-search-wrap">
                    <div
                      class="ing-selected"
                      :class="{ 'ing-placeholder': !line.ingredient }"
                      @click="openIngSearch(i)"
                    >
                      {{ line.ingredient ? lang.ingName(line.ingredient) : ('🔍 ' + lang.t('form.ing_search')) }}
                    </div>
                    <!-- Search dropdown for this row -->
                    <div v-if="activeIngRow === i" class="ing-dropdown">
                      <div class="ing-search-input-wrap">
                        <input
                          v-model="ingSearch"
                          @input="doIngSearch"
                          class="ing-search-input"
                          :placeholder="lang.t('form.ing_search')"
                          autofocus
                        />
                        <div v-if="ingSearching" class="ing-spinner">⏳</div>
                      </div>
                      <div v-if="ingResults.length" class="ing-results">
                        <button
                          v-for="ing in ingResults"
                          :key="ing.id"
                          class="ing-result-item"
                          @click="selectIngredient(ing)"
                        >
                          {{ lang.ingName(ing) || ing.nameUz }}
                          <span v-if="ing.nameRu && lang.lang !== 'ru'" class="ing-ru">{{ ing.nameRu }}</span>
                        </button>
                      </div>
                      <div v-else-if="ingSearch && !ingSearching" class="ing-no-results">
                        {{ lang.t('form.ing_not_found') }}
                      </div>
                      <button class="ing-close-btn" @click="activeIngRow = -1">✕ {{ lang.t('common.cancel') }}</button>
                    </div>
                  </div>
                  <!-- Amount -->
                  <input
                    v-model="line.amount"
                    type="number"
                    min="0"
                    step="0.1"
                    class="field-input ing-amount"
                    :placeholder="lang.t('form.amount')"
                  />
                  <!-- Unit -->
                  <select v-model="line.unit" class="field-select ing-unit">
                    <option v-for="u in UNITS" :key="u.value" :value="u.value">{{ u.label }}</option>
                  </select>
                  <!-- Delete -->
                  <button class="step-del" @click="removeIngredientLine(i)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </div>

              <button @click="addIngredientLine" class="add-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                {{ lang.t('form.add_ingredient') }}
              </button>
            </div>

            <!-- ── TAB: NUTRITION ── -->
            <div v-show="activeTab === 'nutrition'" class="tab-content">
              <label class="toggle-row" style="margin-bottom: 16px">
                <div class="toggle-track" :class="{ 'toggle-on': hasNutrition }" @click="hasNutrition = !hasNutrition">
                  <div class="toggle-thumb" />
                </div>
                <span class="toggle-label">{{ lang.t('form.nutrition_enable') }}</span>
              </label>

              <div v-if="hasNutrition" class="form-grid-2">
                <div class="form-field">
                  <label class="field-label">🔥 {{ lang.t('form.calories') }}</label>
                  <input v-model="nutrition.caloriesPerServing" type="number" min="0" class="field-input" placeholder="0" />
                </div>
                <div class="form-field">
                  <label class="field-label">💪 {{ lang.t('form.protein') }}</label>
                  <input v-model="nutrition.proteinGrams" type="number" min="0" step="0.1" class="field-input" placeholder="0" />
                </div>
                <div class="form-field">
                  <label class="field-label">🫐 {{ lang.t('form.fat') }}</label>
                  <input v-model="nutrition.fatGrams" type="number" min="0" step="0.1" class="field-input" placeholder="0" />
                </div>
                <div class="form-field">
                  <label class="field-label">🌾 {{ lang.t('form.carbs') }}</label>
                  <input v-model="nutrition.carbohydrateGrams" type="number" min="0" step="0.1" class="field-input" placeholder="0" />
                </div>
                <div class="form-field">
                  <label class="field-label">🥦 {{ lang.t('form.fiber') }}</label>
                  <input v-model="nutrition.fiberGrams" type="number" min="0" step="0.1" class="field-input" placeholder="0" />
                </div>
                <div class="form-field">
                  <label class="field-label">🍯 {{ lang.t('form.sugar') }}</label>
                  <input v-model="nutrition.sugarGrams" type="number" min="0" step="0.1" class="field-input" placeholder="0" />
                </div>
              </div>
              <div v-else class="tab-empty-hint">{{ lang.t('form.nutrition_enable') }}</div>
            </div>

          </div><!-- /modal-body -->

          <!-- Footer -->
          <div class="modal-footer">
            <button @click="$emit('close')" class="btn-cancel">{{ lang.t('common.cancel') }}</button>
            <button @click="save" :disabled="saving" class="btn-save">
              <svg v-if="!saving" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span v-if="saving" class="spin">⏳</span>
              {{ saving ? lang.t('form.saving_btn') : (recipe ? lang.t('form.save_btn') : lang.t('form.create_btn')) }}
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Overlay ── */
.modal-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.75);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.modal {
  width: 100%; max-width: 680px;
  max-height: 92vh;
  background: #111827;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 24px;
  display: flex; flex-direction: column;
  overflow: hidden;
}

/* ── Head ── */
.modal-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.modal-title-row { display: flex; align-items: center; gap: 12px; }
.modal-icon {
  width: 40px; height: 40px; border-radius: 12px;
  background: rgba(216,90,48,0.15);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}
.modal-title { font-size: 17px; font-weight: 800; color: #f1f5f9; }
.modal-sub   { font-size: 12px; color: #475569; margin-top: 2px; }
.modal-close {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; width: 34px; height: 34px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #64748b; transition: all 0.2s; flex-shrink: 0;
}
.modal-close:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }
.modal-close svg { width: 16px; height: 16px; }

/* ── Tabs ── */
.modal-tabs {
  display: flex; gap: 4px;
  padding: 12px 24px 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
  overflow-x: auto;
}
.modal-tabs::-webkit-scrollbar { display: none; }
.modal-tab {
  display: flex; align-items: center; gap: 5px;
  padding: 8px 14px;
  background: none; border: none; border-radius: 10px 10px 0 0;
  color: #475569; font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.2s; white-space: nowrap;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.modal-tab:hover { color: #94a3b8; background: rgba(255,255,255,0.04); }
.tab-active { color: #E8713E; border-bottom-color: #E8713E; background: rgba(216,90,48,0.06); }
.tab-badge {
  background: rgba(216,90,48,0.2); color: #E8713E;
  font-size: 10px; font-weight: 800;
  padding: 1px 6px; border-radius: 100px;
}

/* ── Body ── */
.modal-body {
  flex: 1; overflow-y: auto; padding: 20px 24px;
}
.modal-body::-webkit-scrollbar { width: 4px; }
.modal-body::-webkit-scrollbar-track { background: transparent; }
.modal-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

/* ── Error ── */
.form-error {
  padding: 10px 14px; background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.25); border-radius: 10px;
  color: #f87171; font-size: 13px; font-weight: 600;
  margin-bottom: 16px;
}

/* ── Form grid ── */
.tab-content { display: flex; flex-direction: column; gap: 0; }
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.span-2 { grid-column: span 2; }
.form-field { display: flex; flex-direction: column; gap: 6px; }

.field-label {
  font-size: 12px; font-weight: 700; color: #64748b;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.req { color: #ef4444; }
.field-input {
  height: 40px; padding: 0 12px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; color: #e2e8f0;
  font-size: 14px; outline: none; transition: border-color 0.2s;
}
.field-input:focus { border-color: rgba(216,90,48,0.5); }
.field-input::placeholder { color: #334155; }
.field-textarea {
  padding: 10px 12px; resize: vertical; min-height: 72px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; color: #e2e8f0;
  font-size: 14px; outline: none; transition: border-color 0.2s;
  font-family: inherit;
}
.field-textarea:focus { border-color: rgba(216,90,48,0.5); }
.field-select {
  height: 40px; padding: 0 12px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; color: #e2e8f0;
  font-size: 14px; outline: none; cursor: pointer;
}
.field-select option { background: #1e293b; }

/* ── Difficulty pills ── */
.diff-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.diff-pill {
  padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04); color: #64748b;
  font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
}
.diff-active {
  background: rgba(216,90,48,0.15); border-color: rgba(216,90,48,0.4); color: #E8713E;
}

/* ── Image upload ── */
.img-upload-wrap {
  border-radius: 12px;
  overflow: hidden;
  border: 1.5px dashed rgba(255,255,255,0.12);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  background: rgba(255,255,255,0.02);
}
.img-upload-wrap:hover {
  border-color: rgba(216,90,48,0.4);
  background: rgba(216,90,48,0.04);
}
.img-preview-box { position: relative; }
.img-preview-box img { width: 100%; height: 160px; object-fit: cover; display: block; }
.img-change-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.2s;
  font-size: 13px; font-weight: 700; color: #fff;
}
.img-upload-wrap:hover .img-change-overlay { opacity: 1; }
.img-placeholder {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 8px; padding: 32px 20px; color: #475569;
}
.img-placeholder svg { width: 36px; height: 36px; color: #334155; }
.upload-hint { font-size: 13px; font-weight: 600; color: #64748b; }
.upload-sub  { font-size: 11px; color: #334155; }
.uploading { pointer-events: none; }
.upload-spin {
  width: 24px; height: 24px;
  border: 3px solid rgba(216,90,48,0.2);
  border-top-color: #E8713E;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

/* ── Toggle ── */
.toggle-row { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.toggle-track {
  width: 40px; height: 22px; border-radius: 100px;
  background: rgba(255,255,255,0.1); position: relative;
  transition: background 0.2s; flex-shrink: 0;
}
.toggle-on { background: rgba(216,90,48,0.8); }
.toggle-thumb {
  position: absolute; top: 3px; left: 3px;
  width: 16px; height: 16px; border-radius: 50%; background: #fff;
  transition: transform 0.2s;
}
.toggle-on .toggle-thumb { transform: translateX(18px); }
.toggle-label { font-size: 13px; font-weight: 700; color: #94a3b8; }

/* ── Tab hints ── */
.tab-empty-hint {
  text-align: center; padding: 28px;
  color: #334155; font-size: 13px;
  background: rgba(255,255,255,0.02);
  border: 1px dashed rgba(255,255,255,0.06);
  border-radius: 14px; margin-bottom: 14px;
}

/* ── Steps ── */
.steps-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
.step-row {
  display: flex; align-items: flex-start; gap: 10px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px; padding: 12px;
}
.step-num {
  width: 28px; height: 28px; border-radius: 8px;
  background: rgba(216,90,48,0.15); color: #E8713E;
  font-size: 13px; font-weight: 800;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.step-fields { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.step-meta { display: flex; gap: 8px; }
.step-dur { width: 120px; flex-shrink: 0; }
.step-img-url { flex: 1; }
.step-del {
  width: 30px; height: 30px; border-radius: 8px;
  background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.15);
  color: #f87171; display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; transition: background 0.2s;
}
.step-del:hover { background: rgba(239,68,68,0.2); }
.step-del svg { width: 14px; height: 14px; }

/* ── Add button ── */
.add-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; border-radius: 12px;
  background: rgba(216,90,48,0.08);
  border: 1px dashed rgba(216,90,48,0.3);
  color: #E8713E; font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.2s; width: 100%;
  justify-content: center;
}
.add-btn:hover { background: rgba(216,90,48,0.15); border-style: solid; }
.add-btn svg { width: 16px; height: 16px; }

/* ── Ingredients ── */
.ing-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.ing-row {
  display: flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px; padding: 10px 12px;
}
.ing-search-wrap { flex: 1; position: relative; }
.ing-selected {
  height: 38px; padding: 0 12px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  display: flex; align-items: center;
  font-size: 13px; color: #e2e8f0;
  cursor: pointer; transition: border-color 0.2s;
}
.ing-selected:hover { border-color: rgba(216,90,48,0.4); }
.ing-placeholder { color: #334155; }
.ing-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: #1e293b; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px; z-index: 50; overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}
.ing-search-input-wrap {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.ing-search-input {
  flex: 1; background: none; border: none; outline: none;
  font-size: 13px; color: #e2e8f0;
}
.ing-spinner { font-size: 12px; }
.ing-results { max-height: 160px; overflow-y: auto; }
.ing-result-item {
  width: 100%; text-align: left; padding: 9px 12px;
  background: none; border: none; color: #e2e8f0;
  font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px;
  transition: background 0.15s;
}
.ing-result-item:hover { background: rgba(216,90,48,0.1); color: #E8713E; }
.ing-ru { color: #475569; font-size: 11px; }
.ing-no-results { padding: 10px 12px; font-size: 12px; color: #475569; }
.ing-close-btn {
  width: 100%; padding: 8px; background: rgba(255,255,255,0.03);
  border: none; border-top: 1px solid rgba(255,255,255,0.06);
  color: #475569; font-size: 12px; cursor: pointer; transition: background 0.2s;
}
.ing-close-btn:hover { background: rgba(255,255,255,0.06); }
.ing-amount { width: 90px; flex-shrink: 0; }
.ing-unit   { width: 110px; flex-shrink: 0; }

/* ── Footer ── */
.modal-footer {
  display: flex; gap: 10px; padding: 16px 24px;
  border-top: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.btn-cancel {
  flex: 1; height: 44px; border-radius: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: #64748b; font-size: 14px; font-weight: 700;
  cursor: pointer; transition: all 0.2s;
}
.btn-cancel:hover { background: rgba(255,255,255,0.08); color: #94a3b8; }
.btn-save {
  flex: 2; height: 44px; border-radius: 12px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  border: none; color: #fff;
  font-size: 14px; font-weight: 800;
  cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  box-shadow: 0 4px 14px rgba(216,90,48,0.35);
}
.btn-save:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(216,90,48,0.45); }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.btn-save svg { width: 16px; height: 16px; }

/* ── Animation ── */
.modal-fade-enter-active { transition: all 0.25s cubic-bezier(0.16,1,0.3,1); }
.modal-fade-leave-active { transition: all 0.15s ease; }
.modal-fade-enter-from   { opacity: 0; }
.modal-fade-leave-to     { opacity: 0; }
.modal-fade-enter-from .modal { transform: scale(0.95) translateY(10px); }
.modal-fade-leave-to .modal   { transform: scale(0.97); }

@media (max-width: 640px) {
  .modal-overlay { padding: 0; align-items: flex-end; }
  .modal { max-width: 100%; border-radius: 24px 24px 0 0; max-height: 95vh; }
  .form-grid-2 { grid-template-columns: 1fr; }
  .span-2 { grid-column: span 1; }
  .step-meta { flex-direction: column; }
  .step-dur, .step-img-url { width: 100%; }
  .ing-row { flex-wrap: wrap; }
  .ing-amount, .ing-unit { width: calc(50% - 4px); }
}
</style>
