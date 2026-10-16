
"use strict";

const productGrid = document.getElementById("productGrid");
const statusText = document.getElementById("status");
const totalProducts = document.getElementById("totalProducts");
const averageRating = document.getElementById("averageRating");
const apiUrlInput = document.getElementById("apiUrl");
const loadBtn = document.getElementById("loadBtn");
const demoBtn = document.getElementById("demoBtn");
const csvBtn = document.getElementById("csvBtn");

let products = [];

const demoProducts = [
  {
    id: 1,
    name: "Wireless Headphones",
    price: 89.99,
    rating: 4.8,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600"
  },
  {
    id: 2,
    name: "Modern Wrist Watch",
    price: 129.50,
    rating: 4.5,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600"
  },
  {
    id: 3,
    name: "Professional Camera",
    price: 549.00,
    rating: 4.9,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600"
  },
  {
    id: 4,
    name: "Running Sneakers",
    price: 75.00,
    rating: 4.3,
    currency: "USD",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600"
  }
];

// Convert valid numbers without turning missing values into zero.
function parseOptionalNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    typeof value === "boolean"
  ) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// Normalize product information from different JSON field names.
function normalizeProduct(item, index) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    item = {};
  }

  const rawPrice = item.price ?? item.current_price;
  const rawRating = item.rating ?? item.average_rating;

  const rawImage =
    item.image ?? item.imageUrl ?? item.thumbnail ?? "";

  const rawCurrency = String(item.currency ?? "USD").toUpperCase();

  return {
    id: String(item.id ?? index + 1),
    name: String(item.name ?? item.title ?? "Unnamed Product"),
    price: parseOptionalNumber(rawPrice),
    rating: parseOptionalNumber(rawRating),
    currency: /^[A-Z]{3}$/.test(rawCurrency)
      ? rawCurrency
      : "USD",
    image: typeof rawImage === "string" ? rawImage : ""
  };
}

// Format the price using its currency code.
function formatPrice(price, currency) {
  if (price === null) {
    return "Price unavailable";
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency
    }).format(price);
  } catch {
    return price.toFixed(2) + " " + currency;
  }
}

// Render all products.
function renderProducts() {
  productGrid.replaceChildren();

  totalProducts.textContent = String(products.length);

  const ratedProducts = products.filter(product =>
    product.rating !== null &&
    product.rating >= 0 &&
    product.rating <= 5
  );

  const average = ratedProducts.length
    ? ratedProducts.reduce(
        (sum, product) => sum + product.rating, 0
      ) / ratedProducts.length
    : 0;

  averageRating.textContent = average.toFixed(1) + " ★";

  if (products.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No products found. Load some data first.";
    productGrid.appendChild(empty);
    return;
  }

  products.forEach(product => {
    const card = document.createElement("article");
    card.className = "product-card";

    const imageBox = document.createElement("div");
    imageBox.className = "product-image";

    let imageURL = null;

    try {
      if (product.image) {
        const parsedImage = new URL(product.image);

        if (["http:", "https:"].includes(parsedImage.protocol)) {
          imageURL = parsedImage.href;
        }
      }
    } catch {
      imageURL = null;
    }

    if (imageURL) {
      const img = document.createElement("img");
      img.src = imageURL;
      img.alt = product.name;
      img.loading = "lazy";

      img.onerror = () => {
        img.remove();
        imageBox.textContent = "Image unavailable";
      };

      imageBox.appendChild(img);
    } else {
      imageBox.textContent = "No product image";
    }

    const info = document.createElement("div");
    info.className = "product-info";

    const title = document.createElement("h3");
    title.className = "product-title";
    title.textContent = product.name;

    const price = document.createElement("p");
    price.className = "product-price";
    price.textContent = formatPrice(product.price, product.currency);

    const rating = document.createElement("p");
    rating.className = "product-rating";

    if (
      product.rating !== null &&
      product.rating >= 0 &&
      product.rating <= 5
    ) {
      const stars = Math.round(product.rating);

      rating.textContent =
        "★".repeat(stars) +
        "☆".repeat(5 - stars) +
        " " + product.rating.toFixed(1) + "/5";
    } else {
      rating.textContent = "Rating unavailable";
    }

    const id = document.createElement("p");
    id.className = "product-id";
    id.textContent = "Product ID: " + product.id;

    info.append(title, price, rating, id);
    card.append(imageBox, info);
    productGrid.appendChild(card);
  });
}

// Load demo products.
function loadDemoProducts() {
  products = demoProducts.map(normalizeProduct);
  renderProducts();

  statusText.textContent =
    "Successfully loaded " + products.length + " demo products.";
}

// Load products from an authorized JSON API.
async function loadFromAPI() {
  const url = apiUrlInput.value.trim();

  if (!url) {
    statusText.textContent = "Please enter a product JSON URL.";
    return;
  }

  let parsedURL;

  try {
    parsedURL = new URL(url);

    if (!["http:", "https:"].includes(parsedURL.protocol)) {
      throw new Error("Only HTTP and HTTPS URLs are supported.");
    }
  } catch {
    statusText.textContent = "Please enter a valid HTTP or HTTPS URL.";
    return;
  }

  loadBtn.disabled = true;
  statusText.textContent = "Loading product data...";

  try {
    const response = await fetch(parsedURL.href, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("HTTP error " + response.status);
    }

    const data = await response.json();

    const items = Array.isArray(data)
      ? data
      : data?.products ?? data?.items ?? data?.results;

    if (!Array.isArray(items)) {
      throw new Error(
        "Expected a JSON array or a products, items, or results array."
      );
    }

    products = items.map(normalizeProduct);
    renderProducts();

    statusText.textContent =
      "Successfully loaded " + products.length + " products.";
  } catch (error) {
    statusText.textContent =
      "Unable to load products: " + error.message +
      ". Check the API URL, internet connection, permissions, and CORS settings.";
  } finally {
    loadBtn.disabled = false;
  }
}

// Protect CSV values and correctly escape commas and quotation marks.
function escapeCSV(value) {
  let text = String(value ?? "");

  // Prevent common spreadsheet formula injection.
  if (/^[\s]*[=+\-@]/.test(text)) {
    text = "'" + text;
  }

  return '"' + text.replace(/"/g, '""') + '"';
}

// Export product information to a CSV file.
function exportCSV() {
  if (products.length === 0) {
    statusText.textContent = "No products available to export.";
    return;
  }

  const headers = [
    "Product ID",
    "Product Name",
    "Price",
    "Currency",
    "Rating",
    "Image URL"
  ];

  const rows = products.map(product => [
    product.id,
    product.name,
    product.price ?? "",
    product.currency,
    product.rating ?? "",
    product.image
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(escapeCSV).join(","))
    .join("\r\n");

  const blob = new Blob(
    ["\uFEFF" + csvContent],
    { type: "text/csv;charset=utf-8;" }
  );

  const downloadURL = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = downloadURL;
  link.download = "products.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(downloadURL), 1000);

  statusText.textContent = "CSV download started.";
}

// Register button actions.
demoBtn.addEventListener("click", loadDemoProducts);
loadBtn.addEventListener("click", loadFromAPI);
csvBtn.addEventListener("click", exportCSV);

// Display demo products when the page opens.
loadDemoProducts();