# Supabase schema baseline

Questa directory contiene la base database prod-ready per la migrazione No Cap Next.

## File

- `migrations/001_prod_ready_schema.sql`: schema, indici, trigger `updated_at`, funzione admin helper e policy RLS.
- `seed.sql`: seed minimo per categorie, prodotti demo e sezioni shop. Non crea admin reali.

Nota: la Supabase CLI non era disponibile nell'ambiente Codex durante la generazione, quindi la migration e stata creata manualmente con il nome richiesto.

## Ordine di applicazione

1. Apri il progetto Supabase target.
2. Applica `supabase/migrations/001_prod_ready_schema.sql` tramite SQL editor, CLI o pipeline migrations.
3. Applica `supabase/seed.sql` solo sugli ambienti dev/staging o su produzione vuota se vuoi caricare il catalogo demo.
4. Crea il primo utente admin da Supabase Auth.
5. Inserisci manualmente la riga corrispondente in `public.admin_users`.

## Env richieste

Public/browser:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CONTACT_FORM_MODE`

Server-only:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWKS_URL`
- `ADMIN_API_TOKEN`
- `TURNSTILE_SECRET_KEY`
- `APP_ENV`

## Primo admin

1. Crea l'utente in Supabase Auth con email e password forte.
2. Recupera l'UUID dell'utente da `auth.users`.
3. Esegui una insert simile:

```sql
insert into public.admin_users (auth_user_id, email, is_admin, role)
values ('00000000-0000-0000-0000-000000000000', 'admin@example.com', true, 'owner')
on conflict (auth_user_id) do update
set email = excluded.email,
    is_admin = excluded.is_admin,
    role = excluded.role;
```

La colonna `user_id` e un alias generato da `auth_user_id` per compatibilita con l'helper Next attuale `lib/server/admin-auth.ts`.

## Test SELECT pubblico products

Con anon key, questa query deve restituire solo prodotti attivi:

```http
GET /rest/v1/products?is_active=eq.true&select=id,name,category,label,description,price,stock,packshot_url,lifestyle_url,colors,shape,badge
apikey: <anon-key>
Authorization: Bearer <anon-key>
```

La stessa regola vale per:

- `shop_categories`
- `shop_sections`
- `shop_section_items`

## Verifica accessi negati ad anon

Con anon key, queste letture devono fallire o restituire accesso negato:

```http
GET /rest/v1/orders?select=id
GET /rest/v1/order_items?select=id
GET /rest/v1/leads?select=id
GET /rest/v1/admin_users?select=id
GET /rest/v1/admin_audit_log?select=id
```

Gli insert pubblici diretti su `orders`, `order_items` e `leads` non sono aperti. Il flusso previsto e API server con `SUPABASE_SERVICE_ROLE_KEY`, validazioni applicative e rate limit.

## Verifica policy admin

1. Effettua login con un utente Supabase Auth presente in `public.admin_users` con `is_admin = true`.
2. Usa l'access token come bearer token.
3. Verifica che possa leggere e modificare tabelle operative:

```http
GET /rest/v1/products?select=id,name&limit=1
PATCH /rest/v1/products?id=eq.<product-id>
```

4. Ripeti con un utente autenticato non admin: deve ricevere accesso negato o zero righe per tabelle non pubbliche.

## Test API Products CRUD admin-side

Dopo lo Step 2, il progetto Next espone API server-side protette da Bearer admin JWT:

```http
GET /api/admin/products
Authorization: Bearer <supabase-admin-access-token>
```

```http
POST /api/admin/products
Authorization: Bearer <supabase-admin-access-token>
Content-Type: application/json

{
  "name": "New Pomade",
  "price": 18.5,
  "stock_quantity": 8,
  "category": "styling",
  "packshot_url": "/Img/products/black-wax-packshot-opt.webp",
  "is_active": true
}
```

```http
GET /api/admin/products/<product-uuid>
PATCH /api/admin/products/<product-uuid>
DELETE /api/admin/products/<product-uuid>
Authorization: Bearer <supabase-admin-access-token>
```

`DELETE` e un soft delete: imposta `is_active = false` e `status = "archived"`.

Queste API non usano `ADMIN_API_TOKEN` per le write CRUD; il token statico resta confinato alle API read-only legacy gia presenti. Le write usano `SUPABASE_SERVICE_ROLE_KEY` solo lato server e tentano di registrare `product.create`, `product.update` e `product.soft_delete` in `admin_audit_log`.

## Test API Shop Structure CRUD admin-side

Dopo lo Step 4, il progetto espone API server-side protette per categorie e sezioni shop:

```http
GET /api/admin/shop-categories
POST /api/admin/shop-categories
GET /api/admin/shop-categories/<category-uuid>
PATCH /api/admin/shop-categories/<category-uuid>
DELETE /api/admin/shop-categories/<category-uuid>
Authorization: Bearer <supabase-admin-access-token>
```

Payload categoria minimo:

```json
{
  "label": "Styling",
  "slug": "styling",
  "description": "Prodotti styling",
  "sort_order": 20,
  "is_active": true
}
```

```http
GET /api/admin/shop-sections
POST /api/admin/shop-sections
GET /api/admin/shop-sections/<section-uuid>
PATCH /api/admin/shop-sections/<section-uuid>
DELETE /api/admin/shop-sections/<section-uuid>
Authorization: Bearer <supabase-admin-access-token>
```

Payload sezione minimo:

```json
{
  "title": "Home shop preview",
  "key": "home-shop-preview",
  "subtitle": "Anteprima prodotti",
  "body": "Sezione editoriale shop",
  "sort_order": 20,
  "is_active": true
}
```

Section items base:

```http
GET /api/admin/shop-sections/<section-uuid-or-key>/items
POST /api/admin/shop-sections/<section-uuid-or-key>/items
PATCH /api/admin/shop-section-items/<item-uuid>
DELETE /api/admin/shop-section-items/<item-uuid>
Authorization: Bearer <supabase-admin-access-token>
```

`DELETE` e soft delete: imposta `is_active = false`. Le write tentano audit log best-effort con action `shop_category.*`, `shop_section.*`, `shop_section_item.*`.

## Test API Orders server-side

Dopo lo Step 8, il progetto espone una API pubblica server-side per creare ordini senza esporre la service role key, con idempotency key e creazione atomica via RPC:

```http
POST /api/orders/create
Content-Type: application/json

{
  "customer": {
    "fullName": "Mario Rossi",
    "email": "mario@example.com",
    "phone": "+393331234567"
  },
  "fulfillment": "shipping",
  "idempotency_key": "uuid-o-key-univoca-del-tentativo",
  "paymentMode": "in-shop",
  "shippingAddress": {
    "address": "Via Roma 1",
    "city": "Napoli",
    "zip": "80100"
  },
  "items": [
    {
      "productId": "<product-uuid-or-slug>",
      "quantity": 2
    }
  ]
}
```

Note operative:

- `idempotency_key` e obbligatoria;
- a parita di `idempotency_key` e payload identico la RPC restituisce l'ordine esistente;
- a parita di `idempotency_key` e payload diverso la RPC genera conflict;
- i prezzi client-side vengono ignorati;
- `subtotal`, `shipping` e `total` vengono calcolati dal server usando `products.price`;
- `shipping` e fissato a `6` quando fulfillment e `shipping`;
- `delivery` viene normalizzato a `shipping`;
- `in_shop` viene normalizzato a `in-shop`;
- la RPC verifica stock con lock `for update`, crea `orders` e `order_items`, e decrementa `products.stock` nella stessa transazione;
- Turnstile viene richiesto solo se `TURNSTILE_SECRET_KEY` e configurata;
- l'audit log `order.create` e best-effort.

Migration Step 8:

- `supabase/migrations/002_orders_idempotency_stock.sql`
- aggiunge `orders.idempotency_key`
- aggiunge `orders.payload_hash`
- crea indice unique parziale su `orders(idempotency_key)`
- crea RPC `public.create_order_with_items(jsonb, text, text)`

La migration/RPC non e stata applicata a un DB reale durante la sessione Codex: va applicata e verificata in Supabase dev/staging prima del deploy.

API Admin Orders protette da Supabase admin JWT:

```http
GET /api/admin/orders?page=1&pageSize=25&status=in-attesa
Authorization: Bearer <supabase-admin-access-token>
```

```http
GET /api/admin/orders/<order-uuid>
Authorization: Bearer <supabase-admin-access-token>
```

```http
PATCH /api/admin/orders/<order-uuid>
Authorization: Bearer <supabase-admin-access-token>
Content-Type: application/json

{
  "status": "spedito",
  "notes": "Tracking inviato"
}
```

Stati ordine consentiti:

- `in-attesa`
- `in-lavorazione`
- `pronto`
- `spedito`
- `completato`
- `annullato`

Le API Admin Orders non usano `ADMIN_API_TOKEN`; richiedono il Bearer JWT Supabase di un utente presente in `admin_users`.

## Test API Leads admin-side

Dopo lo Step 9, il progetto espone API server-side protette per gestire lead arrivati dal form contact:

```http
GET /api/admin/leads?page=1&pageSize=25&status=new
Authorization: Bearer <supabase-admin-access-token>
```

```http
GET /api/admin/leads/<lead-id>
Authorization: Bearer <supabase-admin-access-token>
```

```http
PATCH /api/admin/leads/<lead-id>
Authorization: Bearer <supabase-admin-access-token>
Content-Type: application/json

{
  "status": "contacted"
}
```

```http
DELETE /api/admin/leads/<lead-id>
Authorization: Bearer <supabase-admin-access-token>
```

`DELETE` non fa hard delete: archivia il lead impostando `status = "closed"` per restare coerente con il vincolo schema esistente.

Status lead consentiti:

- `new`
- `open`
- `contacted`
- `closed`
- `spam`

Le write tentano audit log best-effort con action `lead.status_update` e `lead.archive`.

## Step 10 - Contact Lead UUID consistency

La tabella `public.leads` usa:

```sql
id uuid primary key default gen_random_uuid()
```

Il writer `POST /api/contact/create` non deve inviare id legacy tipo `lead-...`.

Dopo lo Step 10, `lib/server/contact-create.ts` lascia generare UUID al database e invia solo campi compatibili:

- `email`
- `phone`
- `subject`
- `message`
- `privacy_accepted`
- `source`

Non invia:

- `id`
- `created_at`

Admin Leads usa gli UUID come stringhe opache per:

- `GET /api/admin/leads/<uuid>`
- `PATCH /api/admin/leads/<uuid>`
- `DELETE /api/admin/leads/<uuid>`

Consistency check eseguito lato codice/test:

- generated columns non scritte direttamente: `stock_quantity`, `fulfillment_mode`, `product_name_snapshot`, `unit_price_snapshot`, `total_price_snapshot`, `admin_users.user_id`;
- status coerenti con vincoli schema;
- lead archive mappato a `closed`, non a `archived`;
- Orders hardening usa RPC e non scrive snapshot generated direttamente.

Resta da verificare su Supabase reale:

- applicazione migration `002_orders_idempotency_stock.sql`;
- insert reale `POST /api/contact/create`;
- Admin Leads list/detail/update/archive con UUID reali.

## RLS model

- `products`: public `SELECT` solo `is_active = true`; admin full CRUD.
- `shop_categories`: public `SELECT` solo `is_active = true`; admin full CRUD.
- `shop_sections`: public `SELECT` solo `is_active = true`; admin full CRUD.
- `shop_section_items`: public `SELECT` solo item attivi collegati a sezioni attive; admin full CRUD.
- `orders` e `order_items`: nessun accesso anon; admin full CRUD; insert runtime previsto da API server.
- `leads`: nessun accesso anon; admin full CRUD; insert runtime previsto da API server contact.
- `admin_users`: nessun accesso anon; lettura/scrittura solo admin.
- `admin_audit_log`: nessun accesso anon; lettura e insert solo admin.

## Compatibilita con codice legacy

La migration usa UUID come chiave primaria prod-ready per `products`, `orders`, `order_items` e `leads`. Alcuni flussi vanilla legacy generano invece id stringa tipo `aftershave`, `order-...` o `lead-...`.

Prima di collegare nuove API write a questo schema:

- genera gli UUID lato database o lato API server;
- salva gli identificatori leggibili in colonne dedicate come `slug`, `sku`, `order_number` o `source`;
- non inviare piu stringhe legacy nella colonna `id`;
- aggiorna eventuali payload API per usare `product_id` UUID e snapshot testuali in `order_items`.

Questa scelta mantiene lo schema piu robusto per il prod-ready, ma richiede lo Step 2 API per evitare che i vecchi writer client-side vengano collegati direttamente.

## Verifiche manuali ancora necessarie

- Eseguire la migration su un database Supabase reale o locale.
- Eseguire Supabase advisors dopo applicazione.
- Verificare che le tabelle siano esposte alla Data API nel progetto target.
- Confermare che `service_role` resti solo server-side.
- Confermare eventuali policy storage per il bucket immagini `products` in uno step separato.

## Final prod-ready stabilization

Stato finale locale:

- Migration presenti: `001_prod_ready_schema.sql` e `002_orders_idempotency_stock.sql`.
- Seed presente: `seed.sql`.
- Env documentate in `.env.example`.
- Test locali automatici passano: lint, typecheck, test e build.
- Pagamenti reali restano OFF: nessun provider Stripe/PayPal e nessun redirect/modal pagamento.

Non eseguito in questo ambiente:

- Apply migration su Supabase dev/staging, perche la CLI `supabase` non e installata.
- Smoke test reali su DB dev/staging, perche non e presente una `.env.local` reale.
- Supabase advisors, per assenza CLI/MCP autenticato.

Ordine apply consigliato:

1. Applicare `supabase/migrations/001_prod_ready_schema.sql`.
2. Applicare `supabase/migrations/002_orders_idempotency_stock.sql`.
3. Applicare `supabase/seed.sql`.
4. Creare almeno un utente Supabase Auth e il relativo record `public.admin_users`.
5. Eseguire advisors/security checks.

Smoke test manuale staging:

- Contact: `POST /api/contact/create`, poi Admin Leads list/detail/status/archive.
- Products: Admin Products list/create/update/soft delete.
- Shop structure: categories, sections e section items list/create/update/soft delete.
- Orders: `POST /api/orders/create`, idempotency retry, conflict payload diverso, stock insufficiente, Admin Orders list/detail/status update.
- Payments: confermare ancora nessun provider reale, con `payment_mode` solo informativo.
