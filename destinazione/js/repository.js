import { CONFIG } from "./config.js";
import {
  defaultFreshCut,
  FEATURED_CUT_STORAGE_KEY,
  INVENTORY_STORAGE_KEY,
  MONTHLY_CUTS_STORAGE_KEY,
  PRODUCTS_STORAGE_KEY,
  products,
} from "./data.js";
import { getSupabaseClient } from "./supabase-client.js";
import { todayISO } from "./utils.js";

const CART_STORAGE_KEY = "no-cap-cart-v2";
const ORDERS_STORAGE_KEY = "no-cap-orders-v1";
const LEADS_STORAGE_KEY = "no-cap-leads-v1";
const SITE_SECTIONS_STORAGE_KEY = "no-cap-site-sections-v1";
const SHOP_SECTIONS_TABLE = "shop_sections";
const SHOP_CATEGORIES_TABLE = "shop_categories";
const SHOP_BANNER_KEY = "shop-banner";
const CUTS_TABLE = "cuts";

function loadJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function localProvider() {
  return CONFIG.DATA_PROVIDER !== "supabase";
}

async function getSupabaseOrNull() {
  if (localProvider()) return null;
  return getSupabaseClient();
}

function throwIfSupabaseError(error, context) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

export async function getProducts() {
  const sb = await getSupabaseOrNull();
  if (sb) {
    const { data, error } = await sb
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    throwIfSupabaseError(error, "Impossibile leggere i prodotti");
    if (Array.isArray(data)) {
      return data.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        label: item.label || item.category,
        description: item.description || "",
        price: Number(item.price || 0),
        stock: Number(item.stock || 0),
        restock: Number(item.restock || 0),
        badge: item.badge || "",
        colors: item.colors || ["#0a0a0a", "#d40f19", "#ffffff"],
        shape: item.shape || "jar",
        images: {
          packshot: item.packshot_url || "",
          lifestyle: item.lifestyle_url || "",
        },
      }));
    }
  }
  return loadJson(
    PRODUCTS_STORAGE_KEY,
    products.map((item) => ({ ...item })),
  );
}

export async function saveProducts(nextProducts) {
  const sb = await getSupabaseOrNull();
  if (sb) {
    const { error } = await sb.from("products").upsert(
      nextProducts.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        label: item.label,
        description: item.description || "",
        price: item.price,
        stock: item.stock ?? 0,
        restock: item.restock ?? 0,
        packshot_url: item.images?.packshot || "",
        lifestyle_url: item.images?.lifestyle || "",
        colors: item.colors || [],
        shape: item.shape || "jar",
        badge: item.badge || "",
        is_active: true,
      })),
      { onConflict: "id" },
    );
    throwIfSupabaseError(error, "Impossibile salvare i prodotti");
  }
  saveJson(PRODUCTS_STORAGE_KEY, nextProducts);
}

export async function deleteProduct(productId) {
  if (!productId) return false;
  const sb = await getSupabaseOrNull();
  if (sb) {
    const { error } = await sb.from("products").delete().eq("id", productId);

    if (error) {
      throw new Error(
        `Impossibile eliminare il prodotto ${productId}: ${error.message}`,
      );
    }
  }

  const localProducts = loadJson(
    PRODUCTS_STORAGE_KEY,
    products.map((item) => ({ ...item })),
  );
  saveJson(
    PRODUCTS_STORAGE_KEY,
    localProducts.filter((item) => item.id !== productId),
  );

  const localInventory = loadJson(
    INVENTORY_STORAGE_KEY,
    Object.fromEntries(products.map((item) => [item.id, item.stock])),
  );
  delete localInventory[productId];
  saveJson(INVENTORY_STORAGE_KEY, localInventory);

  return true;
}

export async function getInventory() {
  const fallback = Object.fromEntries(
    products.map((item) => [item.id, item.stock]),
  );
  const sb = await getSupabaseOrNull();
  if (sb) {
    const { data, error } = await sb.from("products").select("id, stock");
    throwIfSupabaseError(error, "Impossibile leggere la giacenza");
    if (Array.isArray(data)) {
      const remote = Object.fromEntries(
        data.map((item) => [item.id, Number(item.stock || 0)]),
      );
      saveJson(INVENTORY_STORAGE_KEY, remote);
      return remote;
    }
  }
  return { ...fallback, ...loadJson(INVENTORY_STORAGE_KEY, {}) };
}

export async function saveInventory(inventory) {
  const sb = await getSupabaseOrNull();
  if (sb) {
    const rows = Object.entries(inventory).map(([id, stock]) => ({
      id,
      stock: Number(stock || 0),
    }));

    for (const row of rows) {
      const { error } = await sb
        .from("products")
        .update({
          stock: row.stock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (error) {
        throw new Error(
          `Impossibile aggiornare la giacenza di ${row.id}: ${error.message}`,
        );
      }
    }
  }
  saveJson(INVENTORY_STORAGE_KEY, inventory);
}

export async function getFeaturedCut() {
  const sb = await getSupabaseOrNull();
  if (sb) {
    const { data, error } = await sb
      .from(CUTS_TABLE)
      .select("id, title, description, image_url, date, is_featured")
      .eq("is_featured", true)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    throwIfSupabaseError(error, "Impossibile leggere il taglio featured");

    if (data) {
      const featured = {
        id: data.id,
        name: data.title || defaultFreshCut.name,
        description: data.description || defaultFreshCut.description,
        image: data.image_url || defaultFreshCut.image,
        date: data.date || defaultFreshCut.date,
      };
      saveJson(FEATURED_CUT_STORAGE_KEY, featured);
      return featured;
    }
  }
  return loadJson(FEATURED_CUT_STORAGE_KEY, defaultFreshCut);
}

export async function saveFeaturedCut(cut) {
  const sb = await getSupabaseOrNull();
  if (sb) {
    const { error: resetError } = await sb
      .from(CUTS_TABLE)
      .update({ is_featured: false })
      .eq("is_featured", true);
    throwIfSupabaseError(resetError, "Impossibile resettare il featured cut");

    const { error: upsertError } = await sb.from(CUTS_TABLE).upsert(
      {
        id: cut.id,
        title: cut.name,
        description: cut.description || null,
        image_url: cut.image || null,
        date: cut.date || todayISO(),
        is_featured: true,
      },
      { onConflict: "id" },
    );
    throwIfSupabaseError(upsertError, "Impossibile salvare il featured cut");
  }
  saveJson(FEATURED_CUT_STORAGE_KEY, cut);
}

export async function getMonthlyCuts() {
  const sb = await getSupabaseOrNull();
  if (sb) {
    const monthStart = `${todayISO().slice(0, 7)}-01`;
    const nextMonthDate = new Date(`${monthStart}T00:00:00Z`);
    nextMonthDate.setUTCMonth(nextMonthDate.getUTCMonth() + 1);
    const monthEnd = nextMonthDate.toISOString().slice(0, 10);
    const { data, error } = await sb
      .from(CUTS_TABLE)
      .select("id, title, description, image_url, date, is_featured")
      .gte("date", monthStart)
      .lt("date", monthEnd)
      .order("date", { ascending: false });
    throwIfSupabaseError(error, "Impossibile leggere i tagli del mese");

    if (Array.isArray(data)) {
      const cuts = data.map((item) => ({
        id: item.id,
        name: item.title || defaultFreshCut.name,
        description: item.description || defaultFreshCut.description,
        image: item.image_url || defaultFreshCut.image,
        date: item.date || defaultFreshCut.date,
      }));
      saveJson(MONTHLY_CUTS_STORAGE_KEY, cuts);
      return cuts;
    }
  }
  return loadJson(MONTHLY_CUTS_STORAGE_KEY, [defaultFreshCut]);
}

export async function saveMonthlyCuts(cuts) {
  const sb = await getSupabaseOrNull();
  if (sb && Array.isArray(cuts) && cuts.length) {
    const { error } = await sb.from(CUTS_TABLE).upsert(
      cuts.map((cut, index) => ({
        id: cut.id,
        title: cut.name,
        description: cut.description || null,
        image_url: cut.image || null,
        date: cut.date || todayISO(),
        is_featured: index === 0,
      })),
      { onConflict: "id" },
    );
    throwIfSupabaseError(error, "Impossibile salvare i tagli del mese");
  }
  saveJson(MONTHLY_CUTS_STORAGE_KEY, cuts);
}

export async function getCart() {
  return loadJson(CART_STORAGE_KEY, []);
}

export async function saveCart(cart) {
  saveJson(CART_STORAGE_KEY, cart);
}

export async function clearCart() {
  saveJson(CART_STORAGE_KEY, []);
}

export async function getOrders() {
  const sb = await getSupabaseOrNull();
  if (sb) {
    const [
      { data: ordersData, error: ordersError },
      { data: itemsData, error: itemsError },
    ] = await Promise.all([
      sb.from("orders").select("*").order("created_at", { ascending: false }),
      sb.from("order_items").select("*"),
    ]);
    throwIfSupabaseError(ordersError, "Impossibile leggere gli ordini");
    throwIfSupabaseError(itemsError, "Impossibile leggere le righe ordine");

    if (Array.isArray(ordersData)) {
      const itemsByOrderId = new Map();
      (itemsData || []).forEach((item) => {
        const list = itemsByOrderId.get(item.order_id) || [];
        list.push({
          productId: item.product_id,
          productName: item.product_name,
          unitPrice: Number(item.unit_price || 0),
          quantity: Number(item.quantity || 0),
          lineTotal: Number(item.line_total || 0),
        });
        itemsByOrderId.set(item.order_id, list);
      });

      const orders = ordersData.map((item) => ({
        id: item.id,
        orderNumber: item.order_number,
        createdAt: item.created_at || new Date().toISOString(),
        customer: {
          fullName: item.customer_name,
          email: item.customer_email,
          phone: item.customer_phone,
        },
        fulfillment: item.fulfillment,
        shippingAddress:
          item.address || item.city || item.zip
            ? {
                address: item.address || "",
                city: item.city || "",
                zip: item.zip || "",
              }
            : null,
        items: itemsByOrderId.get(item.id) || [],
        subtotal: Number(item.subtotal || 0),
        shipping: Number(item.shipping || 0),
        total: Number(item.total || 0),
        status: item.status || "prenotato",
        paymentMode: item.payment_mode || "in-shop",
      }));

      saveJson(ORDERS_STORAGE_KEY, orders);
      return orders;
    }
  }
  return loadJson(ORDERS_STORAGE_KEY, []);
}

export async function createOrder(order) {
  const sb = await getSupabaseOrNull();
  if (sb) {
    await sb.from("orders").insert({
      id: order.id,
      order_number: order.orderNumber,
      customer_name: order.customer.fullName,
      customer_email: order.customer.email,
      customer_phone: order.customer.phone,
      fulfillment: order.fulfillment,
      address: order.shippingAddress?.address || null,
      city: order.shippingAddress?.city || null,
      zip: order.shippingAddress?.zip || null,
      subtotal: order.subtotal,
      shipping: order.shipping,
      total: order.total,
      status: order.status,
      payment_mode: order.paymentMode,
    });
    if (order.items?.length) {
      await sb.from("order_items").insert(
        order.items.map((item) => ({
          order_id: order.id,
          product_id: item.productId,
          product_name: item.productName,
          unit_price: item.unitPrice,
          quantity: item.quantity,
          line_total: item.lineTotal,
        })),
      );
    }
  }
  const list = await getOrders();
  const created = {
    ...order,
    createdAt: order.createdAt || new Date().toISOString(),
  };
  list.unshift(created);
  saveJson(ORDERS_STORAGE_KEY, list.slice(0, 200));
  return created;
}

export async function updateOrderStatus(orderId, status) {
  if (!orderId) return null;
  const normalizedStatus = String(status || "")
    .trim()
    .toLowerCase();
  if (!normalizedStatus) return null;

  const sb = await getSupabaseOrNull();
  if (sb) {
    const { error } = await sb
      .from("orders")
      .update({ status: normalizedStatus })
      .eq("id", orderId);
    throwIfSupabaseError(error, "Impossibile aggiornare lo stato ordine");
  }

  const list = await getOrders();
  const index = list.findIndex((order) => order.id === orderId);
  if (index < 0) return null;
  list[index] = { ...list[index], status: normalizedStatus };
  saveJson(ORDERS_STORAGE_KEY, list.slice(0, 200));
  return list[index];
}

export async function getLeads() {
  const sb = await getSupabaseOrNull();
  if (sb) {
    const { data, error } = await sb
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    throwIfSupabaseError(error, "Impossibile leggere le richieste");
    if (Array.isArray(data)) {
      const leads = data.map((item) => ({
        id: item.id,
        email: item.email,
        phone: item.phone || "",
        subject: item.subject || "",
        message: item.message || "",
        privacy_accepted: Boolean(item.privacy_accepted),
        source: item.source || "site",
        createdAt: item.created_at || new Date().toISOString(),
      }));
      saveJson(LEADS_STORAGE_KEY, leads);
      return leads;
    }
  }
  return loadJson(LEADS_STORAGE_KEY, []);
}

export async function createLead(lead) {
  const id = lead.id || `lead-${Date.now()}`;
  const createdAt = lead.createdAt || new Date().toISOString();
  const sb = await getSupabaseOrNull();
  if (sb) {
    await sb.from("leads").insert({
      id,
      email: lead.email,
      phone: lead.phone || null,
      subject: lead.subject || null,
      message: lead.message,
      privacy_accepted: Boolean(lead.privacy_accepted),
      source: lead.source || "site",
      created_at: createdAt,
    });
  }
  const list = await getLeads();
  const created = { ...lead, id, createdAt };
  saveJson(
    LEADS_STORAGE_KEY,
    [created, ...list.filter((item) => item.id !== id)].slice(0, 200),
  );
  return created;
}

export async function deleteLead(leadId) {
  if (!leadId) return false;
  const sb = await getSupabaseOrNull();
  if (sb) {
    const { error } = await sb.from("leads").delete().eq("id", leadId);
    throwIfSupabaseError(error, "Impossibile eliminare la richiesta");
  }
  const list = await getLeads();
  saveJson(
    LEADS_STORAGE_KEY,
    list.filter((lead) => lead.id !== leadId).slice(0, 200),
  );
  return true;
}

export async function uploadImage(file, options = {}) {
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    throw new Error("File immagine non valido.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Immagine troppo grande (max 8MB).");
  }

  const bucket = options.bucket || "products";
  const maxSide = 1200;
  const quality = 0.82;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality),
  );
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Errore lettura immagine."));
    reader.readAsDataURL(blob || file);
  });

  const sb = await getSupabaseOrNull();
  if (sb) {
    const path = `${bucket}/${todayISO()}-${Date.now()}.webp`;
    const { error } = await sb.storage
      .from(bucket)
      .upload(path, blob || file, { contentType: "image/webp", upsert: true });
    throwIfSupabaseError(
      error,
      `Impossibile caricare l'immagine nel bucket ${bucket}`,
    );
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  return base64;
}

export async function getSiteSections() {
  const fallback = loadJson(SITE_SECTIONS_STORAGE_KEY, {
    shopTitle: "Prodotti No Cap",
    shopCopy:
      "Catalogo professionale, disponibilità aggiornata e acquisto rapido.",
    shopCategories: [
      { value: "all", label: "All products" },
      { value: "hair", label: "Hair care" },
      { value: "styling", label: "Styling" },
      { value: "tools", label: "Tools" },
      { value: "accessories", label: "Accessories" },
    ],
  });

  const sb = await getSupabaseOrNull();
  if (sb) {
    const [
      { data: sectionData, error: sectionError },
      { data: categoryData, error: categoryError },
    ] = await Promise.all([
      sb
        .from(SHOP_SECTIONS_TABLE)
        .select("title, subtitle")
        .eq("key", SHOP_BANNER_KEY)
        .maybeSingle(),
      sb
        .from(SHOP_CATEGORIES_TABLE)
        .select("value, label, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    throwIfSupabaseError(sectionError, "Impossibile leggere le sezioni shop");
    throwIfSupabaseError(
      categoryError,
      "Impossibile leggere le categorie shop",
    );

    const remote = {
      shopTitle: sectionData?.title || fallback.shopTitle,
      shopCopy: sectionData?.subtitle || fallback.shopCopy,
      shopCategories:
        Array.isArray(categoryData) && categoryData.length
          ? categoryData.map((row) => ({ value: row.value, label: row.label }))
          : fallback.shopCategories,
    };

    saveJson(SITE_SECTIONS_STORAGE_KEY, remote);
    return remote;
  }

  return fallback;
}

export async function saveSiteSections(sections) {
  const sb = await getSupabaseOrNull();
  if (sb) {
    const { error: sectionSaveError } = await sb
      .from(SHOP_SECTIONS_TABLE)
      .upsert(
        {
          key: SHOP_BANNER_KEY,
          title: sections.shopTitle || "Prodotti No Cap",
          subtitle: sections.shopCopy || "",
          is_active: true,
          sort_order: 10,
          settings: {},
        },
        { onConflict: "key" },
      );
    throwIfSupabaseError(
      sectionSaveError,
      "Impossibile salvare la sezione shop",
    );

    if (Array.isArray(sections.shopCategories)) {
      const nextCategories = sections.shopCategories.map((category, index) => ({
        value: category.value,
        label: category.label,
        is_active: true,
        sort_order: index + 1,
      }));

      const { error: categoryUpsertError } = await sb
        .from(SHOP_CATEGORIES_TABLE)
        .upsert(nextCategories, { onConflict: "value" });
      throwIfSupabaseError(
        categoryUpsertError,
        "Impossibile salvare le categorie shop",
      );

      const nextValues = new Set(nextCategories.map((item) => item.value));
      const { data: existing, error: existingError } = await sb
        .from(SHOP_CATEGORIES_TABLE)
        .select("value");
      throwIfSupabaseError(
        existingError,
        "Impossibile leggere le categorie esistenti",
      );

      const toDisable = (existing || [])
        .map((row) => row.value)
        .filter((value) => !nextValues.has(value));

      if (toDisable.length) {
        const { error: disableError } = await sb
          .from(SHOP_CATEGORIES_TABLE)
          .update({ is_active: false })
          .in("value", toDisable);
        throwIfSupabaseError(
          disableError,
          "Impossibile disattivare le categorie rimosse",
        );
      }

      const { error: enableError } = await sb
        .from(SHOP_CATEGORIES_TABLE)
        .update({ is_active: true })
        .in("value", [...nextValues]);
      throwIfSupabaseError(
        enableError,
        "Impossibile attivare le categorie correnti",
      );
    }
  }

  saveJson(SITE_SECTIONS_STORAGE_KEY, sections);
}
