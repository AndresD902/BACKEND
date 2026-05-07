export interface SuperAdmin {
  id:                   number;
  nombre:               string;
  email:                string;
  password_hash:        string;
  activo:               boolean;
  ultimo_login:         Date | null;
  reset_token:          string | null;
  reset_token_expires:  Date | null;
  created_at:           Date;
  updated_at:           Date;
}
