// =====================================================
// CONFIG
// =====================================================
const API_BASE = "http://localhost:3000/api";


// =====================================================
// LOAD CHOCOLATES ON HOME PAGE
// =====================================================
async function loadChocolates() {
    const productList = document.getElementById("productList");
    if (!productList) return;

    productList.innerHTML = "";

    try {
        const res = await fetch(`${API_BASE}/chocolates`);
        const chocolates = await res.json();

        const cartRes = await fetch(`${API_BASE}/cart`);
        const cart = await cartRes.json();

        chocolates.forEach(choco => {
            const inCart = cart.some(c => c.chocolate_id === choco.id);

            const div = document.createElement("div");
            div.className = "product-card";

            div.innerHTML = `
                <img src="${choco.img}">
                <div class="product-card-content">
                    <h3>${choco.name}</h3>
                    <p>${choco.price}</p>

                    <button onclick="${inCart ? `removeFromCart(${choco.id})` : `addToCart(${choco.id})`}">
                        ${inCart ? "Remove from Cart" : "Add to Cart"}
                    </button>

                    <button onclick="deleteChocoFromHome(${choco.id})" class="delete-btn-home">
                        Delete
                    </button>
                </div>
            `;

            productList.appendChild(div);
        });

    } catch (e) {
        console.error("Error loading chocolates:", e);
    }
}


// =====================================================
// ADD CHOCOLATE (ADMIN)
// =====================================================
async function addChocolateAdmin(name, price, img) {
    const res = await fetch(`${API_BASE}/add-chocolate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price, img })
    });

    if (!res.ok) {
        alert("Failed to add chocolate!");
        return;
    }

    alert("Chocolate added successfully!");
    loadChocolates();
    loadAdminChocolates();
}


// =====================================================
// LOAD CHOCOLATES ON ADMIN PAGE
// =====================================================
async function loadAdminChocolates() {
    const productList = document.getElementById("productList");
    if (!productList) return;

    productList.innerHTML = "";

    try {
        const res = await fetch(`${API_BASE}/add-chocolates`);
        const chocolates = await res.json();

        chocolates.forEach(choco => {
            const div = document.createElement("div");
            div.className = "product-card";

            div.innerHTML = `
                <img src="${choco.img}">
                <span>${choco.name} - ${choco.price}</span>
                <button onclick="deleteChocoFromHome(${choco.id})">Delete</button>
            `;

            adminList.appendChild(div);
        });

    } catch (e) {
        console.error("Admin load error:", e);
    }
}


// =====================================================
// DELETE CHOCOLATE (HOME + ADMIN)
// =====================================================
async function deleteChocoFromHome(id) {
    if (!confirm("Delete this chocolate?")) return;

    await fetch(`${API_BASE}/chocolates/${id}`, {
        method: "DELETE"
    });

    alert("Deleted!");
    loadChocolates();
    loadAdminChocolates();
}


// =====================================================
// ADD TO CART
// =====================================================
async function addToCart(id) {
    await fetch(`${API_BASE}/cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chocolate_id: id, quantity: 1 })
    });

    alert("Added to cart!");
    loadChocolates();
    updateCartCount();
}


// =====================================================
// REMOVE FROM CART
// =====================================================
async function removeFromCart(id) {
    const res = await fetch(`${API_BASE}/cart`);
    const cart = await res.json();

    const item = cart.find(i => i.chocolate_id === id);
    if (!item) return;

    await fetch(`${API_BASE}/cart/${item.cart_id}`, {
        method: "DELETE"
    });

    alert("Removed!");
    loadChocolates();
    updateCartCount();
}


// =====================================================
// LOAD CART PAGE
// =====================================================
async function loadCart() {
    const cartList = document.getElementById("cartList");
    if (!cartList) return;

    const res = await fetch(`${API_BASE}/cart`);
    const cart = await res.json();

    cartList.innerHTML = "";

    if (cart.length === 0) {
        cartList.innerHTML = "<p style='text-align:center;font-size:20px;'>Your cart is empty!</p>";
        return;
    }

    cart.forEach(item => {
        const div = document.createElement("div");
        div.className = "product-card";

        div.innerHTML = `
            <img src="${item.img}">
            <div class="product-card-content">
                <h3>${item.name}</h3>
                <p>${item.price} × ${item.quantity}</p>
                <button onclick="removeFromCart(${item.chocolate_id})">Remove</button>
            </div>
        `;

        cartList.appendChild(div);
    });
}


// =====================================================
// UPDATE CART COUNT
// =====================================================
async function updateCartCount() {
    const res = await fetch(`${API_BASE}/cart`);
    const cart = await res.json();

    const link = document.querySelector("nav a[href='cart.html']");
    if (link) {
        link.innerHTML = `Cart 🛒 (${cart.length})`;
    }
}


// =====================================================
// SEARCH
// =====================================================
function searchChocolates() {
    const text = document.getElementById("searchInput").value.toLowerCase();
    const items = document.querySelectorAll(".product-card");

    items.forEach(card => {
        const name = card.querySelector("h3").innerText.toLowerCase();
        card.style.display = name.includes(text) ? "block" : "none";
    });
}


// =====================================================
// AUTO LOAD (SMART AUTO-DETECT MODE)
// =====================================================
window.onload = () => {
    loadChocolates();
    loadCart();
    loadAdminChocolates();
    updateCartCount();
};
