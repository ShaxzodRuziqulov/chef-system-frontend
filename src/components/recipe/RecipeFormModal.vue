<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { recipesApi }              from '@/api/recipes'
import { categoriesApi, tagsApi } from '@/api/categories'
import { ingredientsApi }         from '@/api/ingredients'
import { uploadApi }              from '@/api/upload'
import { useLangStore }   from '@/stores/langStore'
import { useUnitsStore }  from '@/stores/unitsStore'
import { useToast }       from '@/composables/useToast'
import ImgUpload          from '@/components/ui/ImgUpload.vue'

const lang  = useLangStore()
const units = useUnitsStore()
const toast = useToast()

// ── Props & Emits ─────────────────────────────────────────────────
const props = defineProps({
  /** null = create mode, object = edit mode */
  recipe:  { type: Object, default: null },
  visible: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'saved'])

// ── State ─────────────────────────────────────────────────────────
const saving     = ref(false)
const activeTab  = ref('basic')
const categories = ref([])
const allTags    = ref([])
const errorMsg   = ref('')

// ── Form ──────────────────────────────────────────────────────────
const form = ref(emptyForm())

function emptyForm() {
  return {
    titleUz:         '',
    titleRu:         '',
    titleEng:        '',
    description:     '',
    categoryId:      '',
    difficultyLevel: 'MEDIUM',
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    servings:        4,
    imageUrl:        '',
    imageUrls:       [],
    videoUrl:        '',
    visible:         true,
    tagIds:          [],
  }
}

// ── Gallery rasmlari ──────────────────────────────────────────────
const MAX_GALLERY = 10

function addGallerySlot() {
  if (form.value.imageUrls.length < MAX_GALLERY)
    form.value.imageUrls.push('')
}

function removeGalleryImage(i) {
  form.value.imageUrls.splice(i, 1)
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

// Backenddan keladigan birliklar ro'yxati (til o'zgarganda reaktiv)
const UNITS = computed(() => units.selectOptions)

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
  const ing = ingredientLines.value[rowIdx]?.ingredient
  ingSearch.value = ing ? (ing.ingredientNameUz || ing.nameUz || '') : ''
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
    // Search returns IngredientDto (nameUz/nameRu/nameEng)
    // Normalize to unified shape that ingName() understands
    ingredientLines.value[activeIngRow.value].ingredient = {
      id:               ing.id,
      ingredientNameUz: ing.nameUz  || ing.ingredientNameUz  || '',
      ingredientNameRu: ing.nameRu  || ing.ingredientNameRu  || '',
      ingredientNameEng:ing.nameEng || ing.ingredientNameEng || '',
    }
  }
  ingResults.value = []
  ingSearch.value  = ''
}

const ingCreating = ref(false)
async function createAndSelectIngredient() {
  const name = ingSearch.value.trim()
  if (!name) return
  ingCreating.value = true
  try {
    const res = await ingredientsApi.create({ nameUz: name })
    const created = res.data?.data ?? res.data
    selectIngredient(created)
    activeIngRow.value = -1
    toast.success(`"${name}" ingredienti qo'shildi!`)
  } catch (err) {
    const msg = err?.response?.data?.message || lang.t('common.error_save')
    toast.error(msg)
    errorMsg.value = msg
  } finally {
    ingCreating.value = false
  }
}

// ── Video upload ──────────────────────────────────────────────────
const videoMode      = ref('url')   // 'url' | 'file'
const videoUploading = ref(false)
const videoProgress  = ref(0)
const videoInput     = ref(null)

function isLocalVideo(url) {
  if (!url) return false
  if (url.includes('youtube') || url.includes('youtu.be')) return false
  return url.startsWith('/uploads/') || url.startsWith('http')
}

async function uploadVideoFile(file) {
  if (!file) return
  const MAX = 200 * 1024 * 1024
  if (file.size > MAX) { toast.error('Video hajmi 200 MB dan oshmasligi kerak'); return }
  videoUploading.value = true
  videoProgress.value  = 0
  try {
    const res = await uploadApi.video(file, (pct) => { videoProgress.value = pct })
    form.value.videoUrl = res.data?.data?.url ?? res.data?.url ?? ''
    toast.success('Video yuklandi!')
  } catch (err) {
    toast.error(err?.response?.data?.message || 'Video yuklanmadi')
  } finally {
    videoUploading.value = false
  }
}

function onVideoFileChange(e) {
  const file = e.target.files?.[0]
  if (file) uploadVideoFile(file)
  e.target.value = ''
}

function onVideoDrop(e) {
  const file = e.dataTransfer.files?.[0]
  if (file) uploadVideoFile(file)
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
  errorMsg.value  = ''
  activeTab.value = 'basic'
  videoMode.value = 'url'

  // Load categories & tags
  try {
    const [c, t] = await Promise.all([categoriesApi.getAll(), tagsApi.getAll()])
    categories.value = c.data?.data ?? c.data ?? []
    allTags.value    = t.data?.data ?? t.data ?? []
  } catch {}

  if (props.recipe) {
    // Edit mode — fill form from recipe
    const r = props.recipe
    form.value = {
      titleUz:         r.titleUz         || '',
      titleRu:         r.titleRu         || '',
      titleEng:        r.titleEng        || '',
      description:     r.description     || '',
      categoryId:      r.categoryId      || '',
      difficultyLevel: r.difficultyLevel || 'MEDIUM',
      prepTimeMinutes: r.prepTimeMinutes || 15,
      cookTimeMinutes: r.cookTimeMinutes || 30,
      servings:        r.servings        || 4,
      imageUrl:        r.imageUrl        || '',
      imageUrls:       (r.images || []).map(img => img.imageUrl),
      videoUrl:        r.videoUrl        || '',
      visible:         r.visible         ?? true,
      tagIds:          (r.tags || []).map(t => t.id),
    }
    steps.value = (r.steps || []).map(s => ({
      stepNumber:      s.stepNumber,
      instruction:     s.instruction,
      durationMinutes: s.durationMinutes || null,
      imageUrl:        s.imageUrl        || '',
    }))
    ingredientLines.value = (r.ingredients || []).map(ri => ({
      ingredient: {
        id:               ri.ingredientId,
        ingredientNameUz: ri.ingredientNameUz || '',
        ingredientNameRu: ri.ingredientNameRu || '',
        ingredientNameEng:ri.ingredientNameEng || '',
      },
      amount: ri.amount,
      unit:   ri.unit,
      notes:  ri.notes || '',
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
      // edit: bo'sh string = o'chirish signali; create: null yuborish yetarli
      videoUrl: props.recipe
        ? (form.value.videoUrl?.trim() ?? '')   // edit — bo'sh string backendga o'chirish signali
        : (form.value.videoUrl?.trim() || null), // create — null = yo'q
      imageUrls:       form.value.imageUrls.filter(u => u?.trim()),
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
    toast.success(props.recipe ? 'Retsept yangilandi! ✓' : "Retsept qo'shildi! ✓")
    emit('saved', saved)
    emit('close')
  } catch (err) {
    const msg = err?.response?.data?.message || err?.response?.data?.data
    const text = typeof msg === 'object' ? Object.values(msg).join(', ') : (msg || lang.t('common.error_save'))
    errorMsg.value = text
    toast.error(text)
  } finally {
    saving.value = false
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
                <div class="form-field">
                  <label class="field-label">{{ lang.t('form.title_ru') }}</label>
                  <input v-model="form.titleRu" class="field-input" placeholder="Плов узбекский" />
                </div>
                <!-- Title ENG -->
                <div class="form-field">
                  <label class="field-label">{{ lang.t('form.title_eng') }}</label>
                  <input v-model="form.titleEng" class="field-input" placeholder="Uzbek Plov" />
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
                <!-- Tags -->
                <div class="form-field span-2">
                  <label class="field-label">Teglar</label>
                  <div class="tags-wrap">
                    <button
                      v-for="tag in allTags"
                      :key="tag.id"
                      type="button"
                      class="tag-pill"
                      :class="{ 'tag-active': form.tagIds.includes(tag.id) }"
                      @click="form.tagIds.includes(tag.id)
                        ? form.tagIds.splice(form.tagIds.indexOf(tag.id), 1)
                        : form.tagIds.push(tag.id)"
                    ># {{ tag.nameUz }}</button>
                    <span v-if="!allTags.length" class="tags-empty">Hali teg yo'q (Admin paneldan qo'shing)</span>
                  </div>
                </div>

                <!-- Image upload -->
                <div class="form-field span-2">
                  <label class="field-label">{{ lang.t('form.image') }}</label>
                  <ImgUpload v-model="form.imageUrl" size="md" :placeholder="lang.t('form.image_hint')" />
                </div>

                <!-- Gallery rasmlari -->
                <div class="form-field span-2">
                  <label class="field-label">
                    🖼️ Gallery rasmlari
                    <span class="field-hint-inline">(ixtiyoriy, maks {{ MAX_GALLERY }} ta)</span>
                  </label>
                  <div class="gallery-grid">
                    <div v-for="(url, i) in form.imageUrls" :key="i" class="gallery-slot">
                      <ImgUpload v-model="form.imageUrls[i]" size="sm" placeholder="Rasm" />
                      <button type="button" class="gallery-remove" @click="removeGalleryImage(i)">✕</button>
                    </div>
                    <button
                      v-if="form.imageUrls.length < MAX_GALLERY"
                      type="button"
                      class="gallery-add"
                      @click="addGallerySlot"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 5v14M5 12h14"/></svg>
                      Rasm qo'shish
                    </button>
                  </div>
                </div>

                <!-- Video section -->
                <div class="form-field span-2">
                  <label class="field-label">🎬 Video</label>
                  <div class="video-tabs">
                    <button type="button" class="vtab" :class="{ 'vtab-active': videoMode === 'url' }" @click="videoMode = 'url'">🔗 Havola</button>
                    <button type="button" class="vtab" :class="{ 'vtab-active': videoMode === 'file' }" @click="videoMode = 'file'">📁 Fayl yuklash</button>
                  </div>
                  <template v-if="videoMode === 'url'">
                    <input
                      v-model="form.videoUrl"
                      class="field-input"
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                    <span class="field-hint">Faqat YouTube havolasi qo'llab-quvvatlanadi</span>
                  </template>
                  <template v-else>
                    <div class="video-upload-zone" @click="videoInput?.click()" @dragover.prevent @drop.prevent="onVideoDrop">
                      <template v-if="videoUploading">
                        <div class="video-progress-wrap">
                          <div class="video-progress-bar" :style="{ width: videoProgress + '%' }" />
                        </div>
                        <span class="video-upload-hint">Yuklanmoqda... {{ videoProgress }}%</span>
                      </template>
                      <template v-else-if="form.videoUrl && isLocalVideo(form.videoUrl)">
                        <span class="video-uploaded-name">✅ {{ form.videoUrl.split('/').pop() }}</span>
                        <button type="button" class="video-remove-btn" @click.stop="form.videoUrl = ''">✕ O'chirish</button>
                      </template>
                      <template v-else>
                        <svg class="video-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M4 8a2 2 0 012-2h9a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8z"/></svg>
                        <span class="video-upload-hint">Bosing yoki faylni bu yerga tashlang</span>
                        <span class="video-upload-sub">MP4, WebM, MOV, AVI — maks 200 MB</span>
                      </template>
                    </div>
                    <input ref="videoInput" type="file" accept="video/mp4,video/webm,video/quicktime,video/x-msvideo" class="hidden-input" @change="onVideoFileChange" />
                  </template>
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
                      <ImgUpload v-model="step.imageUrl" size="sm" placeholder="Bosqich rasmi" class="step-img-upload" />
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

              <!-- Empty state -->
              <div v-if="!ingredientLines.length" class="ing-empty">
                <div class="ing-empty-icon">🧅</div>
                <p class="ing-empty-title">Hali ingredient qo'shilmagan</p>
                <p class="ing-empty-sub">Ingredientlarni qo'shib retseptni to'ldiring</p>
              </div>

              <div class="ing-list">
                <div v-for="(line, i) in ingredientLines" :key="i" class="ing-card">
                  <!-- Card header: number + name selector + delete -->
                  <div class="ing-card-top">
                    <span class="ing-num">{{ String(i + 1).padStart(2, '0') }}</span>

                    <!-- Ingredient selector -->
                    <div class="ing-search-wrap">
                      <div
                        class="ing-selected"
                        :class="{ 'ing-placeholder': !line.ingredient, 'ing-selected-open': activeIngRow === i }"
                        @click="openIngSearch(i)"
                      >
                        <svg class="ing-sel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                        </svg>
                        <span>{{ line.ingredient ? lang.ingName(line.ingredient) : lang.t('form.ing_search') }}</span>
                        <svg class="ing-sel-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                      </div>

                      <!-- Dropdown -->
                      <div v-if="activeIngRow === i" class="ing-dropdown">
                        <div class="ing-search-input-wrap">
                          <svg class="ing-drop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                          </svg>
                          <input
                            v-model="ingSearch"
                            @input="doIngSearch"
                            class="ing-search-input"
                            :placeholder="lang.t('form.ing_search')"
                            autofocus
                          />
                          <span v-if="ingSearching" class="ing-spin" />
                        </div>
                        <div v-if="ingResults.length" class="ing-results">
                          <button
                            v-for="ing in ingResults"
                            :key="ing.id"
                            class="ing-result-item"
                            @click="selectIngredient(ing)"
                          >
                            <span class="ing-result-name">{{ lang.ingName(ing) || ing.nameUz }}</span>
                            <span v-if="ing.nameRu && lang.lang !== 'ru'" class="ing-ru">{{ ing.nameRu }}</span>
                          </button>
                        </div>
                        <div v-else-if="ingSearch && !ingSearching" class="ing-no-results">
                          <span class="ing-no-results-text">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            "{{ ingSearch }}" topilmadi
                          </span>
                          <button
                            class="ing-create-btn"
                            :disabled="ingCreating"
                            @click="createAndSelectIngredient"
                          >
                            <span v-if="ingCreating" class="ing-spin" />
                            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                            "{{ ingSearch }}" — yangi ingredient qo'shish
                          </button>
                        </div>
                        <div v-else-if="!ingSearch" class="ing-hint-text">
                          Ingredient nomini yozing...
                        </div>
                        <button class="ing-close-btn" @click="activeIngRow = -1">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                          {{ lang.t('common.cancel') }}
                        </button>
                      </div>
                    </div>

                    <button class="ing-del-btn" @click="removeIngredientLine(i)" title="O'chirish">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>

                  <!-- Card body: amount + unit + notes -->
                  <div class="ing-card-body">
                    <div class="ing-field-group">
                      <label class="ing-field-label">Miqdor</label>
                      <input
                        v-model="line.amount"
                        type="number"
                        min="0"
                        step="0.1"
                        class="field-input ing-amount"
                        placeholder="0"
                      />
                    </div>
                    <div class="ing-field-group">
                      <label class="ing-field-label">O'lchov</label>
                      <select v-model="line.unit" class="field-select ing-unit">
                        <option v-for="u in UNITS" :key="u.value" :value="u.value">{{ u.label }}</option>
                      </select>
                    </div>
                    <div class="ing-field-group ing-notes-group">
                      <label class="ing-field-label">Izoh (ixtiyoriy)</label>
                      <input
                        v-model="line.notes"
                        class="field-input"
                        placeholder="Masalan: mayda doğranmış"
                      />
                    </div>
                  </div>
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
  background: var(--bg-surface);
  border: 1px solid var(--bd-md);
  border-radius: 24px;
  display: flex; flex-direction: column;
  overflow: hidden;
}

/* ── Head ── */
.modal-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--bd);
  flex-shrink: 0;
}
.modal-title-row { display: flex; align-items: center; gap: 12px; }
.modal-icon {
  width: 40px; height: 40px; border-radius: 12px;
  background: rgba(216,90,48,0.15);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}
.modal-title { font-size: 17px; font-weight: 800; color: var(--tx-1); }
.modal-sub   { font-size: 12px; color: var(--tx-5); margin-top: 2px; }
.modal-close {
  background: var(--bg-input); border: 1px solid var(--bd-md);
  border-radius: 10px; width: 34px; height: 34px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--tx-4); transition: all 0.2s; flex-shrink: 0;
}
.modal-close:hover { background: var(--bg-input-f); color: var(--tx-2); }
.modal-close svg { width: 16px; height: 16px; }

/* ── Tabs ── */
.modal-tabs {
  display: flex; gap: 4px;
  padding: 12px 24px 0;
  border-bottom: 1px solid var(--bd);
  flex-shrink: 0;
  overflow-x: auto;
}
.modal-tabs::-webkit-scrollbar { display: none; }
.modal-tab {
  display: flex; align-items: center; gap: 5px;
  padding: 8px 14px;
  background: none; border: none; border-radius: 10px 10px 0 0;
  color: var(--tx-5); font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.2s; white-space: nowrap;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.modal-tab:hover { color: var(--tx-3); background: var(--bg-card-md); }
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
.modal-body::-webkit-scrollbar-thumb { background: var(--bd-lg); border-radius: 2px; }

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
  font-size: 12px; font-weight: 700; color: var(--tx-4);
  text-transform: uppercase; letter-spacing: 0.04em;
}
.req { color: #ef4444; }
.field-input {
  height: 40px; padding: 0 12px;
  background: var(--bg-input);
  border: 1px solid var(--bd-md);
  border-radius: 10px; color: var(--tx-2);
  font-size: 14px; outline: none; transition: border-color 0.2s;
}
.field-input:focus { border-color: rgba(216,90,48,0.5); }
.field-input::placeholder { color: var(--tx-6); }
.field-hint { font-size: 11px; color: var(--tx-6); margin-top: -2px; }
.field-textarea {
  padding: 10px 12px; resize: vertical; min-height: 72px;
  background: var(--bg-input);
  border: 1px solid var(--bd-md);
  border-radius: 10px; color: var(--tx-2);
  font-size: 14px; outline: none; transition: border-color 0.2s;
  font-family: inherit;
}
.field-textarea:focus { border-color: rgba(216,90,48,0.5); }
.field-select {
  height: 40px; padding: 0 12px;
  background: var(--bg-input);
  border: 1px solid var(--bd-md);
  border-radius: 10px; color: var(--tx-2);
  font-size: 14px; outline: none; cursor: pointer;
  color-scheme: dark;
}
.field-select option { background: var(--bg-surface); color: var(--tx-2); }

/* ── Tags ── */
.tags-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
.tag-pill {
  padding: 5px 12px; border-radius: 20px;
  border: 1px solid var(--bd-lg);
  background: var(--bg-card-md);
  color: var(--tx-4); font-size: 12px; font-weight: 700;
  cursor: pointer; transition: all 0.2s;
}
.tag-pill:hover { border-color: rgba(216,90,48,0.4); color: #E8713E; }
.tag-active { background: rgba(216,90,48,0.15); border-color: rgba(216,90,48,0.4); color: #E8713E; }
.tags-empty { font-size: 12px; color: var(--tx-6); }

/* ── Difficulty pills ── */
.diff-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.diff-pill {
  padding: 8px 14px; border-radius: 10px; border: 1px solid var(--bd-md);
  background: var(--bg-card-md); color: var(--tx-4);
  font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
}
.diff-active {
  background: rgba(216,90,48,0.15); border-color: rgba(216,90,48,0.4); color: #E8713E;
}

/* ── Step img upload ── */
.step-img-upload { flex: 1; min-width: 0; }

/* ── Toggle ── */
.toggle-row { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.toggle-track {
  width: 40px; height: 22px; border-radius: 100px;
  background: var(--bd-lg); position: relative;
  transition: background 0.2s; flex-shrink: 0;
}
.toggle-on { background: rgba(216,90,48,0.8); }
.toggle-thumb {
  position: absolute; top: 3px; left: 3px;
  width: 16px; height: 16px; border-radius: 50%; background: #fff;
  transition: transform 0.2s;
}
.toggle-on .toggle-thumb { transform: translateX(18px); }
.toggle-label { font-size: 13px; font-weight: 700; color: var(--tx-3); }

/* ── Tab hints ── */
.tab-empty-hint {
  text-align: center; padding: 28px;
  color: var(--tx-6); font-size: 13px;
  background: var(--bg-card);
  border: 1px dashed var(--bd);
  border-radius: 14px; margin-bottom: 14px;
}

/* ── Steps ── */
.steps-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
.step-row {
  display: flex; align-items: flex-start; gap: 10px;
  background: var(--bg-card); border: 1px solid var(--bd);
  border-radius: 14px; padding: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
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
/* ── Ingredient Empty State ── */
.ing-empty {
  text-align: center; padding: 32px 24px;
  background: var(--bg-card);
  border: 1px dashed var(--bd-md);
  border-radius: 16px; margin-bottom: 16px;
}
.ing-empty-icon { font-size: 40px; margin-bottom: 10px; }
.ing-empty-title { font-size: 14px; font-weight: 700; color: var(--tx-4); margin-bottom: 4px; }
.ing-empty-sub { font-size: 12px; color: var(--tx-6); }

/* ── Ingredient Card ── */
.ing-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
.ing-card {
  background: var(--bg-card);
  border: 1px solid var(--bd-md);
  border-radius: 14px;
  overflow: visible;
  transition: border-color 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.ing-card:hover { border-color: rgba(216,90,48,0.2); }

.ing-card-top {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--bd);
}
.ing-num {
  width: 28px; height: 28px; border-radius: 8px;
  background: rgba(216,90,48,0.12); color: #E8713E;
  font-size: 11px; font-weight: 900;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; letter-spacing: 0.02em;
}

.ing-card-body {
  display: flex; align-items: flex-end; gap: 8px;
  padding: 10px 12px;
  flex-wrap: wrap;
}
.ing-field-group { display: flex; flex-direction: column; gap: 4px; }
.ing-field-label { font-size: 10px; font-weight: 700; color: var(--tx-5); text-transform: uppercase; letter-spacing: 0.05em; }
.ing-notes-group { flex: 1; min-width: 140px; }

/* ── Ingredient Selector ── */
.ing-search-wrap { flex: 1; position: relative; }
.ing-selected {
  height: 38px; padding: 0 10px;
  background: var(--bg-input);
  border: 1px solid var(--bd-md);
  border-radius: 10px;
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--tx-2);
  cursor: pointer; transition: border-color 0.2s, background 0.2s;
  user-select: none;
}
.ing-selected:hover, .ing-selected-open {
  border-color: rgba(216,90,48,0.5);
  background: rgba(216,90,48,0.05);
}
.ing-sel-icon { width: 14px; height: 14px; color: var(--tx-5); flex-shrink: 0; }
.ing-selected span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ing-sel-arrow { width: 14px; height: 14px; color: var(--tx-5); flex-shrink: 0; transition: transform 0.2s; }
.ing-selected-open .ing-sel-arrow { transform: rotate(180deg); color: #E8713E; }
.ing-placeholder { color: var(--tx-5); }

/* ── Dropdown ── */
.ing-dropdown {
  position: absolute; top: calc(100% + 6px); left: 0; right: 0;
  background: var(--bg-surface); border: 1px solid var(--bd-md);
  border-radius: 14px; z-index: 100; overflow: hidden;
  box-shadow: 0 12px 40px rgba(0,0,0,0.5);
}
.ing-search-input-wrap {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; border-bottom: 1px solid var(--bd);
}
.ing-drop-icon { width: 15px; height: 15px; color: var(--tx-5); flex-shrink: 0; }
.ing-search-input {
  flex: 1; background: none; border: none; outline: none;
  font-size: 13px; color: var(--tx-2);
}
.ing-search-input::placeholder { color: var(--tx-6); }
.ing-spin {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.1);
  border-top-color: #E8713E;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

.ing-results { max-height: 180px; overflow-y: auto; }
.ing-result-item {
  width: 100%; text-align: left; padding: 10px 14px;
  background: none; border: none; color: var(--tx-2);
  font-size: 13px; cursor: pointer;
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  transition: background 0.15s, color 0.15s;
  border-bottom: 1px solid var(--bd);
}
.ing-result-item:last-child { border-bottom: none; }
.ing-result-item:hover { background: rgba(216,90,48,0.1); color: #E8713E; }
.ing-result-name { font-weight: 600; }
.ing-ru { color: var(--tx-5); font-size: 11px; white-space: nowrap; }

.ing-no-results { padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
.ing-no-results-text {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--tx-5);
}
.ing-no-results-text svg { width: 14px; height: 14px; flex-shrink: 0; }

.ing-hint-text { padding: 12px 14px; font-size: 12px; color: var(--tx-6); text-align: center; }

.ing-create-btn {
  display: flex; align-items: center; gap: 7px;
  width: 100%; padding: 9px 12px;
  background: rgba(216,90,48,0.08);
  border: 1px dashed rgba(216,90,48,0.4);
  border-radius: 8px; color: #E8713E;
  font-size: 12px; font-weight: 700;
  cursor: pointer; transition: background 0.2s, border-color 0.2s;
  text-align: left;
}
.ing-create-btn:hover:not(:disabled) { background: rgba(216,90,48,0.15); border-color: rgba(216,90,48,0.7); }
.ing-create-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.ing-create-btn svg { width: 14px; height: 14px; flex-shrink: 0; }

.ing-close-btn {
  width: 100%; padding: 9px; background: var(--bg-card);
  border: none; border-top: 1px solid var(--bd);
  color: var(--tx-5); font-size: 12px; font-weight: 600;
  cursor: pointer; transition: background 0.2s, color 0.2s;
  display: flex; align-items: center; justify-content: center; gap: 6px;
}
.ing-close-btn svg { width: 13px; height: 13px; }
.ing-close-btn:hover { background: var(--bg-card-md); color: var(--tx-3); }

/* ── Ingredient del button ── */
.ing-del-btn {
  width: 32px; height: 32px; flex-shrink: 0;
  border-radius: 8px; border: 1px solid var(--bd);
  background: var(--bg-card);
  color: var(--tx-5); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.ing-del-btn:hover { background: rgba(239,68,68,0.12); color: #f87171; border-color: rgba(239,68,68,0.3); }
.ing-del-btn svg { width: 15px; height: 15px; }

.ing-amount { width: 86px; flex-shrink: 0; }
.ing-unit   { width: 120px; flex-shrink: 0; }

/* ── Footer ── */
.modal-footer {
  display: flex; gap: 10px; padding: 16px 24px;
  border-top: 1px solid var(--bd);
  flex-shrink: 0;
}
.btn-cancel {
  flex: 1; height: 44px; border-radius: 12px;
  background: var(--bg-input);
  border: 1px solid var(--bd-md);
  color: var(--tx-4); font-size: 14px; font-weight: 700;
  cursor: pointer; transition: all 0.2s;
}
.btn-cancel:hover { background: var(--bg-input-f); color: var(--tx-3); }
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

/* ── Video ── */
.hidden-input { display: none; }
.video-tabs { display: flex; gap: 6px; margin-bottom: 8px; }
.vtab {
  flex: 1; padding: 7px 12px; border-radius: 8px;
  border: 1px solid var(--bd-md);
  background: var(--bg-card-md); color: var(--tx-4);
  font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
}
.vtab-active { background: rgba(216,90,48,0.12); border-color: rgba(216,90,48,0.4); color: #E8713E; }
.video-upload-zone {
  min-height: 96px; border: 2px dashed var(--bd-md);
  border-radius: 12px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 6px;
  cursor: pointer; transition: border-color 0.2s, background 0.2s;
  padding: 16px;
}
.video-upload-zone:hover { border-color: rgba(216,90,48,0.5); background: rgba(216,90,48,0.03); }
.video-upload-icon { width: 32px; height: 32px; color: var(--tx-5); }
.video-upload-hint { font-size: 13px; color: var(--tx-4); font-weight: 600; }
.video-upload-sub  { font-size: 11px; color: var(--tx-6); }
.video-uploaded-name { font-size: 13px; color: #4ade80; font-weight: 700; }
.video-remove-btn {
  margin-top: 4px; padding: 4px 12px;
  background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25);
  border-radius: 6px; color: #f87171; font-size: 11px; font-weight: 700;
  cursor: pointer; transition: background 0.2s;
}
.video-remove-btn:hover { background: rgba(239,68,68,0.2); }
.video-progress-wrap {
  width: 100%; height: 6px; background: var(--bd-lg);
  border-radius: 100px; overflow: hidden;
}
.video-progress-bar {
  height: 100%; background: linear-gradient(90deg, #D85A30, #E8713E);
  border-radius: 100px; transition: width 0.3s;
}

/* ── Gallery ── */
.field-hint-inline { font-size: 11px; font-weight: 500; color: var(--tx-5); margin-left: 6px; }
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
}
.gallery-slot { position: relative; }
.gallery-remove {
  position: absolute; top: 4px; right: 4px; z-index: 2;
  width: 20px; height: 20px; border-radius: 6px;
  background: rgba(239,68,68,0.8); border: none; color: white;
  font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.gallery-remove:hover { background: #ef4444; }
.gallery-add {
  height: 72px; border-radius: 10px;
  border: 2px dashed var(--bd-xl); background: var(--bg-input);
  color: var(--tx-5); cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  font-size: 11px; font-weight: 700; transition: all 0.2s;
}
.gallery-add:hover { border-color: rgba(216,90,48,0.45); color: #E8713E; background: rgba(216,90,48,0.05); }
.gallery-add svg { width: 18px; height: 18px; }

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
  .step-dur { width: 100%; }
  .ing-card-body { flex-wrap: wrap; }
  .ing-amount { width: 80px; }
  .ing-unit { width: 100px; }
  .ing-notes-group { width: 100%; }
}
</style>
