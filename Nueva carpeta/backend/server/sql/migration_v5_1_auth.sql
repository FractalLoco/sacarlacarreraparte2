-- Migration v5.1 — Seguridad de autenticación
-- Seguro sobre datos existentes; idempotente.
-- Ejecutar: psql -U postgres -d tresalmar -f migration_v5_1_auth.sql

-- DEFAULT 1: usuarios existentes quedan en versión 1.
-- Los tokens emitidos antes de este deploy no llevan el campo "tv",
-- por lo que decoded.tv === undefined ≠ 1 → el usuario hace re-login una vez.
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          SERIAL PRIMARY KEY,
  usuario_id  INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revocado    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rt_hash    ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_rt_usuario ON refresh_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_rt_expires ON refresh_tokens(expires_at);
