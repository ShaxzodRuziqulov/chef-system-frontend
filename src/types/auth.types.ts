// ─────────────────────────────────────────────────────────────────
// Auth — backend DTOlari bilan to'liq mos
// ─────────────────────────────────────────────────────────────────

export type Role = 'USER' | 'ADMIN'

// POST /api/auth/register → ApiResponse<AuthResponse>
export interface RegisterRequest {
  username: string
  email:    string
  password: string
  fullName?: string
}

export interface AuthResponse {
  accessToken:  string    // camelCase (no @JsonProperty)
  refreshToken: string
  expiresIn:    number    // millisekund
  user:         UserDto
}

// POST /api/auth/login → ApiResponse<AuthTokenResponse>
export interface LoginRequest {
  username: string
  password: string
}

export interface AuthTokenResponse {
  access_token:  string   // snake_case (@JsonProperty)
  refresh_token: string
  user:          AuthUserResponse
}

// POST /api/auth/refresh → ApiResponse<TokenPairResponse>
export interface RefreshRequest {
  refresh_token: string
}

export interface TokenPairResponse {
  access_token:  string
  refresh_token: string
}

// GET /api/auth/me → ApiResponse<AuthUserResponse>
export interface AuthUserResponse {
  id:         string      // UUID
  fullName:   string
  roles:      Role
  avatar_url: string | null
}

// GET /api/users/{id} → ApiResponse<UserDto>
export interface UserDto {
  id:        string
  username:  string
  email:     string
  fullName:  string
  avatarUrl: string | null
  role:      Role
  active:    boolean
  createdAt: string
}

// localStorage da saqlangan token juftligi
export interface StoredTokens {
  access_token:  string
  refresh_token: string
}
