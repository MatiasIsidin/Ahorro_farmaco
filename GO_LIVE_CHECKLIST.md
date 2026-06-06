# Go-Live Checklist — Ahorro Inteligente en Fármacos Crónicos

## 1. SUPABASE — Ejecutar antes del deploy

### SQL a ejecutar (en orden):
```
supabase/migrations/002_observability_final.sql
```

### Verificar en Supabase Dashboard:
- [ ] Tabla `error_logs` creada con RLS activo
- [ ] Tabla `analytics_events` creada con RLS activo
- [ ] Políticas INSERT/SELECT correctas (sin UPDATE/DELETE desde cliente)
- [ ] Índices creados en todas las tablas
- [ ] Bucket `prescriptions` → privado (no público)
- [ ] Storage policy: solo `auth.uid()` puede leer/escribir su carpeta
- [ ] Auth → Email confirmations: configurado según necesidad
- [ ] Auth → JWT expiry: 3600s (1 hora) recomendado

### RLS — Verificar que TODAS las tablas tienen RLS:
- [ ] `family_profiles`
- [ ] `user_medications`
- [ ] `alerts`
- [ ] `shopping_carts`
- [ ] `cart_items`
- [ ] `prescriptions`
- [ ] `savings_records`
- [ ] `error_logs`
- [ ] `analytics_events`

---

## 2. VARIABLES DE ENTORNO

### Para Vercel (Settings → Environment Variables):
```
VITE_SUPABASE_URL        = https://vggyvqvwqoudnfupykvx.supabase.co
VITE_SUPABASE_ANON_KEY   = [tu anon key]
VITE_APP_VERSION         = 1.0.0
VITE_APP_ENV             = production
VITE_ANALYTICS_ENABLED   = true
```

### Para GitHub Actions (Settings → Secrets → Actions):
```
VITE_SUPABASE_URL        = https://vggyvqvwqoudnfupykvx.supabase.co
VITE_SUPABASE_ANON_KEY   = [tu anon key]
```

### NUNCA en variables de entorno del cliente:
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- Cualquier clave privada

---

## 3. DEPLOY — Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy de producción
vercel --prod

# Verificar que vercel.json está aplicando headers CSP
vercel inspect [deployment-url]
```

### Verificar post-deploy:
- [ ] `https://tu-dominio.com` carga correctamente
- [ ] Rutas protegidas redirigen a `/` sin sesión
- [ ] Headers de seguridad presentes (verificar con securityheaders.com)
- [ ] CSP no bloquea Supabase (verificar consola del navegador)
- [ ] PWA installable (Chrome → "Instalar aplicación")
- [ ] Manifest.json accesible en `/manifest.json`
- [ ] Iconos accesibles en `/icons/icon-192.png` y `/icons/icon-512.png`

---

## 4. DEPLOY — Netlify (alternativa)

```bash
# Build
npm run build

# Deploy manual
netlify deploy --prod --dir=dist
```

Los archivos `public/_headers` y `public/_redirects` se aplican automáticamente.

---

## 5. ROLLBACK STRATEGY

### Vercel:
1. Dashboard → Deployments → seleccionar deployment anterior
2. Click "Promote to Production"
3. Tiempo estimado: < 30 segundos

### Si hay problema de datos en Supabase:
1. Supabase Dashboard → Database → Backups
2. Los backups automáticos están disponibles en plan Pro
3. En plan Free: exportar manualmente antes de cada deploy mayor

---

## 6. SECURITY CHECKLIST

- [ ] CSP header activo y sin errores en consola
- [ ] `X-Frame-Options: DENY` activo
- [ ] `X-Content-Type-Options: nosniff` activo
- [ ] HTTPS forzado (Vercel/Netlify lo hacen automáticamente)
- [ ] `.env.local` NO está en el repositorio
- [ ] `SUPABASE_SERVICE_ROLE_KEY` NUNCA en el cliente
- [ ] Storage bucket `prescriptions` es PRIVADO
- [ ] Signed URLs expiran en 300 segundos
- [ ] Validación MIME en cliente (allowlist: jpeg, png, webp, pdf)
- [ ] Límite de tamaño de archivo: 10 MB
- [ ] RLS activo en todas las tablas
- [ ] No hay queries sin `.eq('user_id', auth.uid())` en tablas sensibles

---

## 7. ANALYTICS — Verificar funcionamiento

Después del primer usuario real:
```sql
-- En Supabase SQL Editor:
SELECT event_name, COUNT(*) as total
FROM analytics_events
GROUP BY event_name
ORDER BY total DESC
LIMIT 20;
```

Eventos esperados en las primeras 24h:
- `auth_login_attempt` / `auth_login_success`
- `page_view`
- `dashboard_viewed`
- `data_load_time`

---

## 8. OBSERVABILIDAD — Verificar errores

```sql
-- Ver errores recientes:
SELECT level, message, route, app_version, created_at
FROM error_logs
ORDER BY created_at DESC
LIMIT 50;

-- Errores por ruta:
SELECT route, COUNT(*) as total
FROM error_logs
WHERE level = 'error'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY route
ORDER BY total DESC;
```

---

## ESTADO FINAL DE READINESS

| Área | Estado |
|------|--------|
| Auth (Supabase) | 🟢 Listo |
| Database + RLS | 🟢 Listo |
| Storage + Signed URLs | 🟢 Listo |
| CRUD completo | 🟢 Listo |
| Error Boundary | 🟢 Listo |
| Logger estructurado | 🟢 Listo |
| Toast system | 🟢 Listo |
| Analytics (privacy-safe) | 🟢 Listo |
| CSP headers | 🟢 Listo |
| PWA (manifest + iconos) | 🟢 Listo |
| Code splitting | 🟢 Listo |
| Tests (20/20) | 🟢 Listo |
| CI/CD pipeline | 🟢 Listo |
| .env.example | 🟢 Listo |
| Vercel config | 🟢 Listo |
| Netlify config | 🟢 Listo |
| SQL migrations | 🟢 Listo (ejecutar manualmente) |
| Iconos PWA | 🟢 Generados |
| Senior mode | 🟢 Listo |
| Responsive/mobile | 🟢 Listo |
| Notif. server-side | 🟡 Requiere Edge Functions (post-launch) |
| OCR real | 🟡 Simulado (post-launch) |
| Push notifications | 🟡 Post-launch |
