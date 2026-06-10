import { CONFIG } from "./config.js";
import {
  defaultFreshCut,
  FEATURED_CUT_STORAGE_KEY,
  INVENTORY_STORAGE_KEY,
  MONTHLY_CUTS_STORAGE_KEY,
  PRODUCTS_STORAGE_KEY,
  products
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

export async function getProducts() {
  const sb = await getSupabaseOrNull();
  if (sb) {
    const { data } = await sb.from("products").select("*").eq("is_active", true).order("created_at", { ascending: true });
    if (Array.isArray(data) && data.length) {
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
        images: { packshot: item.packshot_url || "", lifestyle: item.lifestyle_url || "" }
      }));
    }
  }
  return loadJson(PRODUCTS_STORAGE_KEY, products.map((item) => ({ ...item })));
}

export async function saveProducts(nextProducts) {
  const sb = await getSupabaseOrNull();
  if (sb) {
    await sb.from("products").upsert(
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
        is_active: true
      })),
      { onConflict: "id" }
    );
  }
  saveJson(PRODUCTS_STORAGE_KEY, nextProducts);
}

export async function getInventory() {
  const fallback = Object.fromEntries(products.map((item) => [item.id, item.stock]));
  return { ...fallback, ...loadJson(INVENTORY_STORAGE_KEY, {}) };
}

export async function saveInventory(inventory) {
  const sb = await getSupabaseOrNull();
  if (sb) {
    const rows = Object.entries(inventory).map(([id, stock]) => ({ id, stock: Number(stock || 0) }));
    await sb.from("products").upsert(rows, { onConflict: "id" });
  }
  saveJson(INVENTORY_STORAGE_KEY, inventory);
}

export async function getFeaturedCut() {
  return loadJson(FEATURED_CUT_STORAGE_KEY, defaultFreshCut);
}

export async function saveFeaturedCut(cut) {
  saveJson(FEATURED_CUT_STORAGE_KEY, cut);
}

export async function getMonthlyCuts() {
  return loadJson(MONTHLY_CUTS_STORAGE_KEY, [defaultFreshCut]);
}

export async function saveMonthlyCuts(cuts) {
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
      payment_mode: order.paymentMode
    });
    if (order.items?.length) {
      await sb.from("order_items").insert(order.items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        line_total: item.lineTotal
      })));
    }
  }
  const list = await getOrders();
  const created = { ...order, createdAt: order.createdAt || new Date().toISOString() };
  list.unshift(created);
  saveJson(ORDERS_STORAGE_KEY, list.slice(0, 200));
  return created;
}

export async function updateOrderStatus(orderId, status) {
  if (!orderId) return null;
  const normalizedStatus = String(status || "").trim();
  if (!normalizedStatus) return null;

  const sb = await getSupabaseOrNull();
  if (sb) {
    await sb.from("orders").update({ status: normalizedStatus }).eq("id", orderId);
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
    const { data } = await sb.from("leads").select("*").order("created_at", { ascending: false });
    if (Array.isArray(data)) {
      const leads = data.map((item) => ({
        id: item.id,
        email: item.email,
        phone: item.phone || "",
        subject: item.subject || "",
        message: item.message || "",
        privacy_accepted: Boolean(item.privacy_accepted),
        source: item.source || "site",
        createdAt: item.created_at || new Date().toISOString()
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
      created_at: createdAt
    });
  }
  const list = await getLeads();
  const created = { ...lead, id, createdAt };
  saveJson(LEADS_STORAGE_KEY, [created, ...list.filter((item) => item.id !== id)].slice(0, 200));
  return created;
}

export async function deleteLead(leadId) {
  if (!leadId) return false;
  const sb = await getSupabaseOrNull();
  if (sb) {
    await sb.from("leads").delete().eq("id", leadId);
  }
  const list = await getLeads();
  saveJson(LEADS_STORAGE_KEY, list.filter((lead) => lead.id !== leadId).slice(0, 200));
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

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Errore lettura immagine."));
    reader.readAsDataURL(blob || file);
  });

  const sb = await getSupabaseOrNull();
  if (sb) {
    const path = `${bucket}/${todayISO()}-${Date.now()}.webp`;
    const { error } = await sb.storage.from(bucket).upload(path, blob || file, { contentType: "image/webp", upsert: true });
    if (!error) {
      const { data } = sb.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    }
  }

  return base64;
}

export async function getSiteSections() {
  const fallback = loadJson(SITE_SECTIONS_STORAGE_KEY, {
    shopTitle: "Prodotti No Cap",
    shopCopy: "Catalogo professionale, disponibilità aggiornata e acquisto rapido.",
    shopCategories: [
      { value: "all", label: "All products" },
      { value: "hair", label: "Hair care" },
      { value: "styling", label: "Styling" },
      { value: "tools", label: "Tools" },
      { value: "accessories", label: "Accessories" }
    ]
  });

  const sb = await getSupabaseOrNull();
  if (sb) {
    try {
      const [{ data: sectionData }, { data: categoryData }] = await Promise.all([
        sb.from(SHOP_SECTIONS_TABLE).select("title, subtitle").eq("key", SHOP_BANNER_KEY).maybeSingle(),
        sb.from(SHOP_CATEGORIES_TABLE).select("value, label, sort_order, is_active").eq("is_active", true).order("sort_order", { ascending: true })
      ]);

      const remote = {
        shopTitle: sectionData?.title || fallback.shopTitle,
        shopCopy: sectionData?.subtitle || fallback.shopCopy,
        shopCategories: Array.isArray(categoryData) && categoryData.length
          ? categoryData.map((row) => ({ value: row.value, label: row.label }))
          : fallback.shopCategories
      };

      saveJson(SITE_SECTIONS_STORAGE_KEY, remote);
      return remote;
    } catch {
      return fallback;
    }
  }

  return fallback;
}

export async function saveSiteSections(sections) {
  const sb = await getSupabaseOrNull();
  if (sb) {
    try {
      await sb.from(SHOP_SECTIONS_TABLE).upsert({
        key: SHOP_BANNER_KEY,
        title: sections.shopTitle || "Prodotti No Cap",
        subtitle: sections.shopCopy || "",
        is_active: true,
        sort_order: 10,
        settings: {}
      }, { onConflict: "key" });

      if (Array.isArray(sections.shopCategories)) {
        const nextCategories = sections.shopCategories.map((category, index) => ({
          value: category.value,
          label: category.label,
          is_active: true,
          sort_order: index + 1
        }));

        await sb.from(SHOP_CATEGORIES_TABLE).upsert(
          nextCategories,
          { onConflict: "value" }
        );

        const nextValues = new Set(nextCategories.map((item) => item.value));
        const { data: existing } = await sb.from(SHOP_CATEGORIES_TABLE).select("value");
        const toDisable = (existing || [])
          .map((row) => row.value)
          .filter((value) => !nextValues.has(value));

        if (toDisable.length) {
          await sb.from(SHOP_CATEGORIES_TABLE).update({ is_active: false }).in("value", toDisable);
        }

        await sb.from(SHOP_CATEGORIES_TABLE).update({ is_active: true }).in("value", [...nextValues]);
      }
    } catch {
      // Fallback locale handled below.
    }
  }

  saveJson(SITE_SECTIONS_STORAGE_KEY, sections);
}

