const invoiceForm = document.querySelector("#invoice-form");
const itemsContainer = document.querySelector("#items-container");
const itemTemplate = document.querySelector("#item-template");
const addItemButton = document.querySelector("#add-item-button");

const resultElements = {
  product: document.querySelector("#result-product"),
  subtotal: document.querySelector("#result-subtotal"),
  discount: document.querySelector("#result-discount"),
  net: document.querySelector("#result-net"),
  tax: document.querySelector("#result-tax"),
  total: document.querySelector("#result-total"),
  paymentResult: document.querySelector("#payment-result"),
  paymentLabel: document.querySelector("#payment-label"),
  change: document.querySelector("#result-change"),
  notice: document.querySelector("#notice"),
};

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 2,
});

function roundToCents(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function showNotice(message, type) {
  resultElements.notice.textContent = message;
  resultElements.notice.className = `notice is-${type}`;
  resultElements.notice.hidden = false;
}

function hidePaymentResult() {
  resultElements.paymentResult.hidden = true;
  resultElements.paymentResult.classList.remove("is-short", "is-change");
}

function clearResults() {
  resultElements.product.textContent = "Aún sin calcular";
  resultElements.subtotal.textContent = currencyFormatter.format(0);
  resultElements.discount.textContent = `− ${currencyFormatter.format(0)}`;
  resultElements.net.textContent = currencyFormatter.format(0);
  resultElements.tax.textContent = currencyFormatter.format(0);
  resultElements.total.textContent = currencyFormatter.format(0);
  resultElements.notice.hidden = true;
  resultElements.notice.textContent = "";
  resultElements.notice.className = "notice";
  hidePaymentResult();
}

function updateItemRow(row) {
  const productSelect = row.querySelector('[data-field="product"]');
  const selectedOption = productSelect.selectedOptions[0];
  const isCustom = selectedOption.value === "custom";
  const customProductField = row.querySelector("[data-custom-field]");
  const customProductInput = row.querySelector('[data-field="custom-product"]');
  const priceInput = row.querySelector('[data-field="price"]');
  const priceHint = row.querySelector("[data-price-hint]");

  customProductField.hidden = !isCustom;
  customProductInput.required = isCustom;
  priceHint.textContent = isCustom ? "ingresa el precio" : "se completa al elegir";
  priceInput.value = selectedOption.dataset.price || "";
  priceInput.readOnly = !isCustom;

  if (isCustom) {
    customProductInput.focus();
  }
}

function updateItemNumbers() {
  const rows = [...itemsContainer.querySelectorAll("[data-item-row]")];
  rows.forEach((row, index) => {
    row.querySelector("[data-item-number]").textContent = `Producto ${index + 1}`;
    row.querySelector("[data-remove-item]").hidden = rows.length === 1;
  });
}

function addItemRow() {
  const row = itemTemplate.content.firstElementChild.cloneNode(true);
  itemsContainer.append(row);
  updateItemNumbers();
  return row;
}

itemsContainer.addEventListener("change", (event) => {
  if (event.target.matches('[data-field="product"]')) {
    updateItemRow(event.target.closest("[data-item-row]"));
  }
});

itemsContainer.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-item]");
  if (!removeButton) {
    return;
  }

  removeButton.closest("[data-item-row]").remove();
  updateItemNumbers();
});

addItemButton.addEventListener("click", () => {
  const row = addItemRow();
  row.querySelector('[data-field="product"]').focus();
});

invoiceForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const rows = [...itemsContainer.querySelectorAll("[data-item-row]")];
  const items = [];
  let subtotal = 0;

  for (const row of rows) {
    const productSelect = row.querySelector('[data-field="product"]');
    const selectedProduct = productSelect.value;
    const product = selectedProduct === "custom"
      ? row.querySelector('[data-field="custom-product"]').value.trim()
      : selectedProduct;
    const priceInput = row.querySelector('[data-field="price"]').value;
    const price = Number(priceInput);
    const quantityInput = row.querySelector('[data-field="quantity"]');
    const quantity = Number(quantityInput.value);

    if (!product) {
      showNotice("Selecciona un producto o escribe el nombre del producto personalizado.", "error");
      (selectedProduct === "custom"
        ? row.querySelector('[data-field="custom-product"]')
        : productSelect).focus();
      return;
    }

    if (priceInput === "" || !Number.isFinite(price) || price < 0) {
      showNotice("Ingresa un precio válido, igual o mayor que cero.", "error");
      row.querySelector('[data-field="price"]').focus();
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      showNotice("La cantidad debe ser un número entero mayor que cero.", "error");
      quantityInput.focus();
      return;
    }

    subtotal += roundToCents(price * quantity);
    items.push({ product, quantity });
  }

  subtotal = roundToCents(subtotal);
  const discountInput = document.querySelector("#discount").value;
  const discount = discountInput === "" ? 0 : Number(discountInput);
  const paymentInput = document.querySelector("#payment").value;
  const payment = paymentInput === "" ? null : Number(paymentInput);

  if (!Number.isFinite(discount) || discount < 0) {
    showNotice("El descuento debe ser un valor igual o mayor que cero.", "error");
    document.querySelector("#discount").focus();
    return;
  }

  if (discount > subtotal) {
    showNotice("El descuento no puede ser mayor que el subtotal.", "error");
    document.querySelector("#discount").focus();
    return;
  }

  if (payment !== null && (!Number.isFinite(payment) || payment < 0)) {
    showNotice("El dinero recibido debe ser un valor igual o mayor que cero.", "error");
    document.querySelector("#payment").focus();
    return;
  }

  const net = roundToCents(subtotal - discount);
  const tax = roundToCents(net * 0.19);
  const total = roundToCents(net + tax);

  resultElements.product.textContent = items
    .map(({ product, quantity }) => `${product} × ${quantity}`)
    .join(" · ");
  resultElements.subtotal.textContent = currencyFormatter.format(subtotal);
  resultElements.discount.textContent = `− ${currencyFormatter.format(discount)}`;
  resultElements.net.textContent = currencyFormatter.format(net);
  resultElements.tax.textContent = currencyFormatter.format(tax);
  resultElements.total.textContent = currencyFormatter.format(total);
  hidePaymentResult();

  const notices = [];

  if (payment !== null) {
    const difference = roundToCents(payment - total);
    resultElements.paymentResult.hidden = false;

    if (difference < 0) {
      resultElements.paymentLabel.textContent = "Falta por pagar";
      resultElements.change.textContent = currencyFormatter.format(Math.abs(difference));
      resultElements.paymentResult.classList.add("is-short");
      notices.push(`Alerta: faltan ${currencyFormatter.format(Math.abs(difference))} para completar el pago.`);
    } else if (difference > 0) {
      resultElements.paymentLabel.textContent = "Devolver";
      resultElements.change.textContent = currencyFormatter.format(difference);
      resultElements.paymentResult.classList.add("is-change");
      notices.push(`Alerta: debes devolver ${currencyFormatter.format(difference)} de cambio.`);
    } else {
      resultElements.paymentLabel.textContent = "Cambio";
      resultElements.change.textContent = currencyFormatter.format(0);
      notices.push("El pago es exacto.");
    }
  }

  const isWarning = payment !== null && roundToCents(payment - total) !== 0;
  showNotice(
    notices.length > 0
      ? notices.join(" ")
      : "Factura calculada correctamente. El IVA del 19 % se aplicó automáticamente.",
    isWarning ? "warning" : "success",
  );
});

invoiceForm.addEventListener("reset", () => {
  window.setTimeout(() => {
    const rows = [...itemsContainer.querySelectorAll("[data-item-row]")];
    rows.slice(1).forEach((row) => row.remove());
    updateItemNumbers();
    updateItemRow(itemsContainer.querySelector("[data-item-row]"));
    clearResults();
  }, 0);
});

addItemRow();
