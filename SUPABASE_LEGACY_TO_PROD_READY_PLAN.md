# Supabase legacy to prod-ready compatibility plan

## 1. Stato DB reale noto

Project reale:

- Nome: `NOCAP`
- Ref: `vbwltkmqfmbxrrfqqeff`
- Stato noto: `ACTIVE_HEALTHY`

Tabelle presenti secondo controllo gia eseguito:

- `products`
- `orders`
- `order_items`
- `leads`
- `admin_users`
- `shop_categories`
- `shop_sections`
- `shop_section_items`
- `cuts`

Risultati read-only aggiornati dal DB reale:

| Tabella | Righe | Tipo ID reale |
| --- | ---: | --- |
| `products` | 7 | `id text` |
| `orders` | 1 | `id text` |
| `order_items` | 3 | `order_id text` FK verso `orders.id`; `product_id` legacy text |
| `leads` | 1 | `id text` |
| `admin_users` | 1 | `user_id uuid` |
| `shop_categories` | 5 | `id uuid` |
| `shop_sections` | 1 | `id uuid` |
| `shop_section_items` | 1 | `id uuid` |
| `cuts` | 0 | legacy extra, non usata dallo schema prod-ready locale |

Valori reali rilevati:

- `orders.status`: `prenotato`
- `orders.payment_mode`: `in-shop`
- `orders.fulfillment`: `pickup`
- `leads.source`: `contact-form`
- `products.category`: `styling`, `tools`, `hair`, `accessories`

Mismatch noti dal controllo reale:

- `products.id` e `text`, non `uuid`.
- `orders.id` e `text`, non `uuid`.
- `leads.id` e `text`, non `uuid`.
- `order_items.order_id` e `text`.
- `admin_audit_log` sembra mancante.
- RPC `public.create_order_with_items` sembra mancante.
- Helper `app_private.is_admin()` sembra mancante.
- RLS e attiva ma probabilmente con policy legacy.

Decisione aggiornata: i dati reali sono pochi ma presenti, quindi il DB non va resettato e le PK legacy `text` non vanno convertite direttamente. Il codice deve trattare `products.id`, `orders.id` e `leads.id` come stringhe opache. UUID resta valido solo per `shop_categories.id`, `shop_sections.id`, `shop_section_items.id` e `admin_users.user_id`.

Nessuna migration e stata applicata al DB reale in questa fase. Questo documento e il file SQL associato sono solo piano e candidate SQL.

## 2. Schema prod-ready atteso

Schema atteso dai file locali:

- `destinazione/next-prod/supabase/migrations/001_prod_ready_schema.sql`
- `destinazione/next-prod/supabase/migrations/002_orders_idempotency_stock.sql`
- `destinazione/next-prod/supabase/seed.sql`

Elementi principali:

- `pgcrypto` per `gen_random_uuid()`.
- Schema privato `app_private`.
- Trigger helper `public.set_updated_at()`.
- Helper admin `app_private.is_admin()`.
- Tabelle prod-ready:
  - `products` con `id uuid`, `slug`, `sku`, `code`, `status`, `stock`, `stock_quantity generated`.
  - `shop_categories` con `id uuid`, `value`, `label`.
  - `shop_sections` con `id uuid`, `key`, `settings`.
  - `shop_section_items` con `id uuid`, `section_id uuid`, `section_key`.
  - `orders` con `id uuid`, `order_number`, `fulfillment`, `payment_mode`, `status`, `idempotency_key`, `payload_hash`.
  - `order_items` con `id uuid`, `order_id uuid`, `product_id uuid`, snapshot generated.
  - `leads` con `id uuid`, `email`, `message`, `privacy_accepted`, `status`.
  - `admin_users` con `auth_user_id uuid`, `user_id generated`, `is_admin`, `role`.
  - `admin_audit_log`.
- RPC `public.create_order_with_items(jsonb, text, text)` per creazione ordine atomica e decremento stock.
- RLS forzata su tabelle pubbliche e policy admin basate su `app_private.is_admin()`.

## 3. Query read-only di ispezione DB reale

Eseguire prima su staging o in SQL editor Supabase, senza modifiche:

```sql
-- Tabelle/colonne
select
  table_schema,
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  is_generated,
  generation_expression
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'products',
    'orders',
    'order_items',
    'leads',
    'admin_users',
    'shop_categories',
    'shop_sections',
    'shop_section_items',
    'admin_audit_log',
    'cuts'
  )
order by table_name, ordinal_position;

-- Primary key / foreign key / unique / check constraints
select
  n.nspname as schema_name,
  c.relname as table_name,
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'products',
    'orders',
    'order_items',
    'leads',
    'admin_users',
    'shop_categories',
    'shop_sections',
    'shop_section_items',
    'admin_audit_log',
    'cuts'
  )
order by c.relname, con.contype, con.conname;

-- Indici
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'products',
    'orders',
    'order_items',
    'leads',
    'admin_users',
    'shop_categories',
    'shop_sections',
    'shop_section_items',
    'admin_audit_log',
    'cuts'
  )
order by tablename, indexname;

-- RLS enabled/forced
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'products',
    'orders',
    'order_items',
    'leads',
    'admin_users',
    'shop_categories',
    'shop_sections',
    'shop_section_items',
    'admin_audit_log',
    'cuts'
  )
order by c.relname;

-- Policies RLS
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'products',
    'orders',
    'order_items',
    'leads',
    'admin_users',
    'shop_categories',
    'shop_sections',
    'shop_section_items',
    'admin_audit_log',
    'cuts'
  )
order by tablename, policyname;

-- Funzioni richieste/esistenti
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result_type,
  l.lanname as language,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where (n.nspname = 'public' and p.proname in ('set_updated_at', 'create_order_with_items'))
   or (n.nspname = 'app_private' and p.proname = 'is_admin')
order by n.nspname, p.proname;

-- Trigger
select
  event_object_schema,
  event_object_table,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in (
    'products',
    'orders',
    'order_items',
    'leads',
    'admin_users',
    'shop_categories',
    'shop_sections',
    'shop_section_items',
    'admin_audit_log',
    'cuts'
  )
order by event_object_table, trigger_name;

-- Conteggio righe
select 'products' as table_name, count(*) from public.products
union all select 'orders', count(*) from public.orders
union all select 'order_items', count(*) from public.order_items
union all select 'leads', count(*) from public.leads
union all select 'admin_users', count(*) from public.admin_users
union all select 'shop_categories', count(*) from public.shop_categories
union all select 'shop_sections', count(*) from public.shop_sections
union all select 'shop_section_items', count(*) from public.shop_section_items
union all select 'cuts', count(*) from public.cuts;

-- admin_audit_log se esiste
select 'admin_audit_log' as table_name, count(*)
from public.admin_audit_log;

-- Status legacy effettivi
select 'orders.status' as field, status, count(*)
from public.orders
group by status
order by count(*) desc, status;

select 'leads.status' as field, status, count(*)
from public.leads
group by status
order by count(*) desc, status;

select 'products.status' as field, status, count(*)
from public.products
group by status
order by count(*) desc, status;

-- Dati critici legacy: valori null/duplicati
select 'products.slug missing' as check_name, count(*) from public.products where slug is null or slug = '';
select 'products.id duplicate' as check_name, id, count(*) from public.products group by id having count(*) > 1;
select 'orders.order_number missing' as check_name, count(*) from public.orders where order_number is null or order_number = '';
select 'order_items orphan orders' as check_name, count(*)
from public.order_items oi
left join public.orders o on o.id = oi.order_id
where o.id is null;
select 'order_items orphan products' as check_name, count(*)
from public.order_items oi
left join public.products p on p.id = oi.product_id
where oi.product_id is not null and p.id is null;
```

## 4. Diff tabella per tabella

Il diff sotto usa i mismatch noti piu lo schema atteso locale. Va confermato con le query read-only.

| Tabella | Diff noto/probabile | Rischio dati |
| --- | --- | --- |
| `products` | `id text` legacy confermato. Serve non validare come UUID. Probabili colonne additive da mantenere: `slug`, `sku`, `code`, `status`, `stock`, `restock`, `colors`, `metadata`, `sort_order`. | HIGH |
| `orders` | `id text` legacy confermato; `status` reale `prenotato`. Servono `idempotency_key`, `payload_hash`, `updated_at` e RPC text-compatible che generi `order-*`. | HIGH |
| `order_items` | `order_id text` FK confermata; `product_id` deve restare text-compatible. RPC deve scrivere solo colonne reali `product_name`, `unit_price`, `quantity`, `line_total`. | HIGH |
| `leads` | `id text` legacy confermato. Contact writer non invia id: migration 003 deve aggiungere default DB `lead-*` per non reintrodurre id legacy nel codice. | HIGH |
| `admin_users` | `user_id uuid` confermato; helper admin deve confrontare `admin_users.user_id = auth.uid()`. | MEDIUM |
| `shop_categories` | `id uuid` confermato; `category_id` puo restare UUID se usato per relazione con questa tabella. | LOW/MEDIUM |
| `shop_sections` | `id uuid` confermato; `section_id` puo restare UUID se usato per relazione con questa tabella. | LOW/MEDIUM |
| `shop_section_items` | `id uuid` confermato; FK reale verso `shop_sections.key` gia presente. Preferire `section_key` per compatibilita UI/API. | LOW/MEDIUM |
| `admin_audit_log` | Mancante secondo controllo noto. Le API tollerano errore audit best-effort, ma perderebbero tracciamento. | LOW/MEDIUM |
| `cuts` | Extra legacy. Non nello schema prod-ready locale. Non va cancellata: serve audit separato per Fresh Cut/servizi. | MEDIUM |

## 5. Strategia consigliata

Consiglio: **C. creare layer di compatibilita progressivo**.

Motivo:

- Convertire direttamente PK/FK `text` in `uuid` su tabelle con dati reali e relazioni e troppo rischioso.
- Adattare completamente il codice al legacy `text` e piu rapido, ma rinuncia al modello prod-ready gia testato, alla RPC di stock/idempotency e a future FK solide.
- Il layer progressivo permette di:
  - preservare dati legacy;
  - aggiungere colonne mancanti e funzioni senza drop;
  - rendere il codice attuale piu compatibile con ID stringa dove gia possibile;
  - rimandare la conversione UUID a una fase di backfill controllata.

In pratica:

1. Non convertire subito `products.id`, `orders.id`, `leads.id`.
2. Aggiungere colonne mancanti compatibili e non distruttive.
3. Creare `admin_audit_log`.
4. Creare `app_private.is_admin()`.
5. Creare una variante RPC `create_order_with_items` compatibile con PK text, senza scrivere colonne UUID prod-ready non presenti e usando `product_id text` / `order_id text`.
6. Solo dopo smoke test, valutare migration v2 verso colonne UUID parallele (`uuid_id`, `product_uuid`, ecc.) con backfill e doppia scrittura.

## 6. Punti codice che assumono UUID

Assunzioni UUID forti:

- `lib/server/admin-products-crud.ts`
  - `category_id` usa `z.string().uuid()`.
- `lib/server/admin-shop-structure-crud.ts`
  - `section_id` usa `z.string().uuid()`.
- `supabase/migrations/001_prod_ready_schema.sql`
  - PK/FK UUID su quasi tutte le tabelle.
- `supabase/seed.sql`
  - inserisce UUID espliciti.
- `tests/schema-api-consistency.test.mjs`
  - verifica `leads.id uuid`.

Punti che trattano ID come stringa opaca:

- Admin Products item routes: `id` route param e REST filter `id=eq.${id}`.
- Admin Orders: `id` e `order_id` sono stringhe nei filtri REST.
- Admin Leads: `id` e stringa opaca nei filtri REST.
- Public products: `id` e tipo `string`.
- Checkout Orders API: `product_id`/`slug` sono identifier string, non necessariamente UUID.
- RPC `002_orders_idempotency_stock.sql`: cerca `products` con `id::text = identifier or slug/sku/code`.

Modifiche codice necessarie/verificate per supportare schema legacy:

- `category_id` puo restare UUID perche `shop_categories.id` reale e UUID.
- `section_id` puo restare UUID perche `shop_sections.id` reale e UUID; preferire comunque `section_key` nei flow UI.
- `leads.id text` deve ricevere default DB `lead-...` nella migration 003; il codice Contact continua a non inviare `id`.
- `orders.id text` deve ricevere default DB `order-...`; la RPC non deve assumere UUID.
- `order_items.id` reale e `bigint GENERATED ALWAYS AS IDENTITY`; la migration 003 locale rispecchia la migration realmente applicata e non deve creare sequence/default manuale ne alterare il default identity.
- `order_items.created_at` reale manca; la migration 003 lo aggiunge per rendere stabile il retry idempotente che restituisce gli item ordinati.
- `orders.notes` reale manca, ma Admin Orders usa `notes`; la migration 003 lo aggiunge in modo additivo invece di rimuovere il campo dalla RPC.
- `orders-create.ts` normalizza il payload nested del checkout in payload flat prima della RPC; la RPC legge solo campi flat.
- Admin Orders deve accettare anche status legacy `prenotato`.
- Admin Leads tratta `id` come stringa opaca; test aggiornati su `lead-real-1`.

Nota applicazione reale NOCAP:

- La compatibility 003 e stata applicata in due parti: `legacy_compatibility_foundations_no_identity_sequence` e `legacy_order_rpc`.
- Il blocco originario candidato per `public.order_items_id_seq` non e stato applicato perche `order_items.id` e gia identity column.
- Il file locale `003_legacy_compatibility_plan.sql` mantiene ora lo stesso comportamento: lascia `order_items.id` untouched, mantiene `order_items.created_at` e mantiene la RPC legacy-compatible.

## 7. Piano rollback

Prima di qualsiasi apply:

1. Snapshot/backup Supabase completo.
2. Export CSV/SQL delle tabelle:
   - `products`
   - `orders`
   - `order_items`
   - `leads`
   - `admin_users`
   - `shop_categories`
   - `shop_sections`
   - `shop_section_items`
   - `cuts`
3. Eseguire prima su branch/staging DB.

Rollback per compatibility migration:

- Le colonne aggiunte sono additive: si possono lasciare inutilizzate se serve rollback applicativo.
- Le policy create con nomi nuovi possono essere disabilitate/droppate singolarmente.
- La RPC `create_order_with_items` puo essere sostituita con versione precedente o revocata.
- Non usare `DROP TABLE`, `TRUNCATE` o conversioni PK in-place finche il rollback non e provato.

## 8. Ordine consigliato di esecuzione

1. Eseguire query read-only di ispezione.
2. Salvare output query nel repo o in ticket operativo.
3. Creare staging DB o branch database.
4. Applicare solo sezioni LOW risk della migration candidate:
   - extension/schema/helper;
   - colonne additive;
   - indici additive;
   - `admin_audit_log`;
   - `idempotency_key`/`payload_hash`.
5. Verificare Contact insert e Admin Leads su staging.
6. Verificare Products list/update/soft delete su staging.
7. Applicare/adeguare RPC legacy-compatible per Orders.
8. Testare Checkout order create, idempotency retry, conflict e stock insufficiente.
9. Solo dopo, valutare RLS/policy finali.
10. Solo in fase successiva, progettare conversione UUID parallela.

## 9. SQL candidate

Il file candidate creato e:

- `destinazione/next-prod/supabase/migrations/003_legacy_compatibility_plan.sql`

Contiene:

- query di preflight read-only;
- sezioni additive sicure;
- creazione candidate `admin_audit_log`;
- helper `app_private.is_admin()`;
- colonne candidate mancanti;
- indici candidate;
- RPC candidate compatibile con `text`;
- policy candidate commentate o da applicare solo dopo revisione.

## 10. Cosa testare manualmente dopo

Smoke test staging:

- Contact:
  - `POST /api/contact/create`;
  - record in `leads`;
  - Admin Leads list/detail/status/archive.
- Products:
  - Admin Products list/create/update/soft delete;
  - Shop pubblico legge solo prodotti attivi.
- Shop structure:
  - categories list/create/update/soft delete;
  - sections list/create/update/soft delete;
  - items create/update/soft delete via `section_key`.
- Orders:
  - `POST /api/orders/create`;
  - retry stessa idempotency key stesso payload;
  - stessa key payload diverso produce conflict;
  - stock insufficiente produce 409;
  - Admin Orders list/detail/status update.
- Security:
  - anon non legge orders/leads/admin_users;
  - anon legge solo products/shop content attivi;
  - utente non admin non accede alle API admin.

## 11. Decisione finale

Strategia consigliata: **C. layer compatibilita progressivo**.

Non applicare ancora `001_prod_ready_schema.sql` su DB reale legacy: essendo piena di `create table if not exists` non correggerebbe tipi esistenti, e le parti con UUID/FK/RLS potrebbero creare una falsa sensazione di allineamento. Prima serve una migration compatibility costruita sui dati reali ispezionati.

## FINAL REAL SUPABASE VALIDATION

### Stato migration reale

Su Supabase reale NOCAP risultano applicate:

- `legacy_compatibility_foundations_no_identity_sequence`;
- `legacy_order_rpc`.

Il file locale `destinazione/next-prod/supabase/migrations/003_legacy_compatibility_plan.sql` rispecchia questo stato: non crea sequence/default manuale per `order_items.id`, documenta che la colonna reale e `bigint GENERATED ALWAYS AS IDENTITY`, mantiene `order_items.created_at` e mantiene la RPC `create_order_with_items(jsonb, text, text)`.

### Validazione locale

- `npm run lint`: PASS con warning noti su `<img>`.
- `npm run typecheck`: PASS.
- `npm test`: PASS.
- `npm run build`: PASS.

### Smoke test reali applicativi

Non eseguiti da questo ambiente per assenza di `.env.local` e variabili Supabase/Admin reali. Restano da eseguire manualmente:

- Contact create e Admin Leads;
- Checkout order create e Admin Orders;
- Products CRUD;
- Shop Structure CRUD;
- conferma Shop pubblico su prodotti attivi;
- conferma pagamenti OFF.

### Pagamenti

Pagamenti reali restano OFF: nessun provider Stripe/PayPal e nessun redirect pagamento.
