-- Minimal development seed for No Cap Next.
-- Apply after supabase/migrations/001_prod_ready_schema.sql.
-- No real admin user is inserted here.

insert into public.shop_categories (id, value, label, sort_order, is_active)
values
  ('11111111-1111-4111-8111-111111111111', 'all', 'All products', 0, true),
  ('22222222-2222-4222-8222-222222222222', 'hair', 'Hair care', 10, true),
  ('33333333-3333-4333-8333-333333333333', 'styling', 'Styling', 20, true),
  ('44444444-4444-4444-8444-444444444444', 'tools', 'Tools', 30, true),
  ('55555555-5555-4555-8555-555555555555', 'accessories', 'Accessories', 40, true)
on conflict (value) do update
set label = excluded.label,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active;

insert into public.products (
  id,
  sku,
  name,
  slug,
  description,
  category,
  category_id,
  label,
  price,
  packshot_url,
  lifestyle_url,
  badge,
  stock,
  restock,
  colors,
  shape,
  is_active,
  sort_order
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'AFTERSHAVE',
    'Aftershave',
    'aftershave',
    'Aftershave rinfrescante con finitura pulita da barber shop.',
    'hair',
    '22222222-2222-4222-8222-222222222222',
    'Hair',
    15.00,
    '/Img/products/aftershave-packshot-opt.webp',
    '/Img/products/aftershave-lifestyle-opt.webp',
    'Novita',
    10,
    10,
    '["#d7f4ee", "#c9935a", "#111111"]'::jsonb,
    'bottle',
    true,
    10
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'BLACK-WAX',
    'Black Wax',
    'black-wax',
    'Tenuta forte con shine controllato per look precisi tutto il giorno.',
    'styling',
    '33333333-3333-4333-8333-333333333333',
    'Styling',
    17.00,
    '/Img/products/black-wax-packshot-opt.webp',
    '/Img/products/black-wax-lifestyle-opt.webp',
    'Best seller',
    6,
    8,
    '["#0d0d0d", "#f4f4f4", "#d40f19"]'::jsonb,
    'jar',
    true,
    20
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'CLAY-POMADE',
    'Clay Pomade',
    'clay-pomade',
    'Texture opaca, flessibile e naturale per volume definito.',
    'styling',
    '33333333-3333-4333-8333-333333333333',
    'Styling',
    16.00,
    '/Img/products/clay-pomade-packshot-opt.webp',
    '/Img/products/clay-pomade-lifestyle-opt.webp',
    'Novita',
    3,
    8,
    '["#161616", "#8b4fd1", "#f2d5ff"]'::jsonb,
    'jar',
    true,
    30
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    'DUST-WAX',
    'Dust Wax',
    'dust-wax',
    'Volume asciutto e texture dry per styling moderno.',
    'styling',
    '33333333-3333-4333-8333-333333333333',
    'Styling',
    20.00,
    '/Img/products/dust-wax-packshot-opt.webp',
    '/Img/products/dust-wax-lifestyle-opt.webp',
    'Ultimi pezzi',
    2,
    7,
    '["#111111", "#f5f5f5", "#d40f19"]'::jsonb,
    'spray',
    true,
    40
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
    'FADE-DLC',
    'Fade DLC + Shallow DLC',
    'fade-dlc',
    'Lama DLC professionale per sfumature pulite e veloci.',
    'tools',
    '44444444-4444-4444-8444-444444444444',
    'Tools',
    39.95,
    '/Img/products/fade-dlc-packshot-opt.webp',
    '/Img/products/fade-dlc-lifestyle-opt.webp',
    null,
    4,
    6,
    '["#080808", "#2c2c2c", "#ffffff"]'::jsonb,
    'blade',
    true,
    50
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
    'FADE-GOLD',
    'Fade Gold + Slim Deep Gold',
    'fade-gold',
    'Set gold premium per precisione elevata in ogni passata.',
    'tools',
    '44444444-4444-4444-8444-444444444444',
    'Tools',
    39.95,
    '/Img/products/fade-gold-packshot-opt.webp',
    '/Img/products/fade-gold-lifestyle-opt.webp',
    'Best seller',
    7,
    9,
    '["#d6a61f", "#ffe37a", "#111111"]'::jsonb,
    'blade',
    true,
    60
  )
on conflict (slug) do update
set sku = excluded.sku,
    name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    category_id = excluded.category_id,
    label = excluded.label,
    price = excluded.price,
    packshot_url = excluded.packshot_url,
    lifestyle_url = excluded.lifestyle_url,
    badge = excluded.badge,
    stock = excluded.stock,
    restock = excluded.restock,
    colors = excluded.colors,
    shape = excluded.shape,
    is_active = excluded.is_active,
    sort_order = excluded.sort_order;

insert into public.shop_sections (key, title, subtitle, settings, is_active, sort_order)
values
  (
    'shop-banner',
    'Prodotti No Cap',
    'Catalogo professionale, disponibilita aggiornata e acquisto rapido.',
    '{}'::jsonb,
    true,
    10
  ),
  (
    'home-shop-preview',
    'Shop essentials',
    'Anteprima prodotti No Cap per homepage e sezioni editoriali.',
    '{}'::jsonb,
    true,
    20
  )
on conflict (key) do update
set title = excluded.title,
    subtitle = excluded.subtitle,
    settings = excluded.settings,
    is_active = excluded.is_active,
    sort_order = excluded.sort_order;

insert into public.shop_section_items (section_key, item_key, title, label, href, image_url, content, is_active, sort_order)
values
  (
    'home-shop-preview',
    'black-wax',
    'Black Wax',
    'Styling',
    '/shop?category=styling',
    '/Img/products/black-wax-packshot-opt.webp',
    '{"body":"Tenuta forte con shine controllato."}'::jsonb,
    true,
    10
  ),
  (
    'home-shop-preview',
    'fade-gold',
    'Fade Gold + Slim Deep Gold',
    'Tools',
    '/shop?category=tools',
    '/Img/products/fade-gold-packshot-opt.webp',
    '{"body":"Set gold premium per precisione elevata."}'::jsonb,
    true,
    20
  )
on conflict (section_key, item_key) do update
set title = excluded.title,
    label = excluded.label,
    href = excluded.href,
    image_url = excluded.image_url,
    content = excluded.content,
    is_active = excluded.is_active,
    sort_order = excluded.sort_order;

-- Create the first admin manually after creating the Supabase Auth user.
-- Replace both placeholders with the actual auth.users.id and email.
--
-- insert into public.admin_users (auth_user_id, email, is_admin, role)
-- values ('00000000-0000-0000-0000-000000000000', 'admin@example.com', true, 'owner')
-- on conflict (auth_user_id) do update
-- set email = excluded.email,
--     is_admin = excluded.is_admin,
--     role = excluded.role;
