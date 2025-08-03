/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const userInput = document.getElementById("userInput");
const generateRoutineBtn = document.getElementById("generateRoutine");
const clearAllBtn = document.getElementById("clearAll");
const productSearchInput = document.getElementById("productSearch");
const showMoreBtn = document.getElementById("showMoreBtn");

/* Array to store selected products */
let selectedProducts = [];

/* Variable to track if AI is currently responding */
let isAIResponding = false;

/* Array to store chat history */
let chatHistory = [];

/* Variables for pagination */
let allProducts = [];
let currentlyDisplayedProducts = [];
let showingAll = false;
const PRODUCTS_PER_PAGE = 6;

/* Function to save selected products to localStorage */
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

/* Function to load selected products from localStorage */
function loadSelectedProducts() {
  const saved = localStorage.getItem("selectedProducts");
  if (saved) {
    selectedProducts = JSON.parse(saved);
  }
}

/* Function to save chat history to localStorage */
function saveChatHistory() {
  localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
}

/* Function to load chat history from localStorage */
function loadChatHistory() {
  const saved = localStorage.getItem("chatHistory");
  if (saved) {
    chatHistory = JSON.parse(saved);
  }
}

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Browse all products or use the category and search filters above
  </div>
`;

/* Load and display all products initially */
loadAndDisplayProducts();

/* Load previously selected products from localStorage */
loadSelectedProducts();

/* Load chat history from localStorage */
loadChatHistory();

/* Automatically detect and set RTL direction */
detectAndSetRTLDirection();

/* Initialize selected products display */
updateSelectedProductsDisplay();

/* Function to disable buttons while AI is responding */
function disableButtons() {
  const sendBtn = document.getElementById("sendBtn");
  generateRoutineBtn.disabled = true;
  sendBtn.disabled = true;

  /* Add visual indication that buttons are disabled */
  generateRoutineBtn.style.opacity = "0.6";
  generateRoutineBtn.style.cursor = "not-allowed";
  sendBtn.style.opacity = "0.6";
  sendBtn.style.cursor = "not-allowed";
}

/* Function to enable buttons after AI response */
function enableButtons() {
  const sendBtn = document.getElementById("sendBtn");
  generateRoutineBtn.disabled = false;
  sendBtn.disabled = false;

  /* Restore normal button appearance */
  generateRoutineBtn.style.opacity = "1";
  generateRoutineBtn.style.cursor = "pointer";
  sendBtn.style.opacity = "1";
  sendBtn.style.cursor = "pointer";
}

/* Function to parse markdown text using the marked library */
function parseMarkdown(text) {
  /* Configure marked options for better formatting */
  marked.setOptions({
    breaks: true /* Convert line breaks to <br> tags */,
    gfm: true /* Enable GitHub Flavored Markdown */,
    sanitize: false /* Allow HTML (safe since we control the content) */,
  });

  /* Parse the markdown text and return HTML */
  return marked.parse(text);
}

/* Function to display text with typewriter effect while preserving markdown formatting */
async function typewriterEffect(element, markdownText, speed = 50) {
  /* Clear the target element */
  element.innerHTML = "";

  /* Split the markdown text into characters for progressive typing */
  const characters = markdownText.split("");
  let currentText = "";

  /* Type each character one by one */
  for (let i = 0; i <= characters.length; i++) {
    /* Build the current text progressively */
    currentText = characters.slice(0, i).join("");

    /* Parse the current markdown text to HTML */
    const currentHtml = parseMarkdown(currentText);

    /* Show the progressive markdown formatting without visible cursor */
    element.innerHTML = currentHtml;

    /* Auto-scroll to keep the typing visible */
    chatWindow.scrollTop = chatWindow.scrollHeight;

    /* Check if current character is punctuation that should cause a pause */
    const currentChar = characters[i - 1];
    const pauseChars = [",", ".", ";", ":", "!", "?"];
    let delay = speed;

    /* Add extra pause for punctuation marks */
    if (pauseChars.includes(currentChar)) {
      delay = speed * 3; /* Triple the delay for punctuation */
    }

    /* Wait before showing next character (unless we're at the end) */
    if (i < characters.length) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  /* Ensure final HTML is displayed */
  element.innerHTML = parseMarkdown(markdownText);
}

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  /* Store products for pagination */
  currentlyDisplayedProducts = products;

  /* Determine which products to show based on pagination state */
  let productsToShow = products;
  if (!showingAll && products.length > PRODUCTS_PER_PAGE) {
    productsToShow = products.slice(0, PRODUCTS_PER_PAGE);
  }

  productsContainer.innerHTML = productsToShow
    .map(
      (product, index) => `
    <div class="product-card" 
         data-product-id="${product.id}" 
         data-product-name="${product.name}" 
         data-product-brand="${product.brand}"
         data-product-description="${product.description}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
      <!-- Tooltip element that will show on hover -->
      <div class="product-tooltip">
        ${product.description}
      </div>
    </div>
  `
    )
    .join("");

  /* Add click event listeners to product cards */
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    card.addEventListener("click", handleProductSelection);

    /* Check if this product is already selected and add visual indicator */
    const productId = card.dataset.productId;
    const isSelected = selectedProducts.some(
      (product) => product.id === productId
    );
    if (isSelected) {
      card.classList.add("selected");
    }
  });

  /* Update Show More button visibility and text */
  updateShowMoreButton(products);
}

/* Function to update Show More button */
function updateShowMoreButton(products) {
  if (products.length <= PRODUCTS_PER_PAGE) {
    /* Hide button if there are not enough products */
    showMoreBtn.style.display = "none";
  } else {
    /* Show button and update text based on current state */
    showMoreBtn.style.display = "block";

    if (showingAll) {
      showMoreBtn.innerHTML =
        '<i class="fa-solid fa-chevron-up"></i> Show Less Products';
      showMoreBtn.classList.add("show-less");
    } else {
      showMoreBtn.innerHTML =
        '<i class="fa-solid fa-chevron-down"></i> Show More Products';
      showMoreBtn.classList.remove("show-less");
    }
  }
}

/* Function to toggle Show More/Show Less */
function toggleShowMore() {
  showingAll = !showingAll;
  /* Re-display current products with new pagination state */
  displayProducts(currentlyDisplayedProducts);
}

/* Function to load and display all products initially */
async function loadAndDisplayProducts() {
  const products = await loadProducts();
  allProducts = products;
  /* Reset pagination state when loading all products */
  showingAll = false;
  displayProducts(products);
}

/* Function to filter products based on category and search */
async function filterAndDisplayProducts() {
  const products = await loadProducts();
  const selectedCategory = categoryFilter.value;
  const searchTerm = productSearchInput.value.toLowerCase().trim();

  let filteredProducts = products;

  /* Filter by category if selected */
  if (selectedCategory) {
    filteredProducts = filteredProducts.filter(
      (product) => product.category === selectedCategory
    );
  }

  /* Filter by search term if provided */
  if (searchTerm) {
    filteredProducts = filteredProducts.filter((product) => {
      const productName = product.name.toLowerCase();
      const productBrand = product.brand.toLowerCase();
      const productDescription = product.description.toLowerCase();

      /* Check if search term exists in name, brand, or description */
      return (
        productName.includes(searchTerm) ||
        productBrand.includes(searchTerm) ||
        productDescription.includes(searchTerm)
      );
    });
  }

  /* Reset pagination state when filtering */
  showingAll = false;

  /* Display filtered products */
  displayProducts(filteredProducts);

  /* Show message if no products match the filters */
  if (filteredProducts.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products found matching your search criteria. Try adjusting your filters.
      </div>
    `;
    /* Hide Show More button when no products */
    showMoreBtn.style.display = "none";
  }
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", filterAndDisplayProducts);

/* Filter and display products when user types in search */
productSearchInput.addEventListener("input", filterAndDisplayProducts);

/* Handle product card selection/deselection */
function handleProductSelection(event) {
  const card = event.currentTarget;
  const productId = card.dataset.productId;
  const productName = card.dataset.productName;
  const productBrand = card.dataset.productBrand;

  /* Check if product is already selected */
  const existingIndex = selectedProducts.findIndex(
    (product) => product.id === productId
  );

  if (existingIndex !== -1) {
    /* Product is already selected, remove it */
    selectedProducts.splice(existingIndex, 1);
    card.classList.remove("selected");
  } else {
    /* Product is not selected, add it */
    selectedProducts.push({
      id: productId,
      name: productName,
      brand: productBrand,
    });
    card.classList.add("selected");
  }

  /* Save selected products to localStorage */
  saveSelectedProducts();

  /* Update the selected products display */
  updateSelectedProductsDisplay();
}

/* Update the display of selected products */
function updateSelectedProductsDisplay() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML =
      '<p style="color: #666; font-style: italic;">No products selected</p>';
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-item">
        <span>${product.name} - ${product.brand}</span>
        <button class="remove-btn" onclick="removeSelectedProduct('${product.id}')" aria-label="Remove ${product.name}">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    `
    )
    .join("");
}

/* Remove a product from the selected list */
function removeSelectedProduct(productId) {
  /* Remove from selectedProducts array */
  const productIndex = selectedProducts.findIndex(
    (product) => product.id === productId
  );
  if (productIndex !== -1) {
    selectedProducts.splice(productIndex, 1);
  }

  /* Remove selected class from product card if it's visible */
  const productCard = document.querySelector(
    `[data-product-id="${productId}"]`
  );
  if (productCard) {
    productCard.classList.remove("selected");
  }

  /* Save updated selection to localStorage */
  saveSelectedProducts();

  /* Update the display */
  updateSelectedProductsDisplay();
}

/* Function to clear all selected products */
function clearAllProducts() {
  /* Clear the selectedProducts array */
  selectedProducts = [];

  /* Remove selected class from all visible product cards */
  const selectedCards = document.querySelectorAll(".product-card.selected");
  selectedCards.forEach((card) => {
    card.classList.remove("selected");
  });

  /* Save the empty selection to localStorage */
  saveSelectedProducts();

  /* Update the display */
  updateSelectedProductsDisplay();
}

/* Function to automatically detect and set RTL direction based on browser language */
function detectAndSetRTLDirection() {
  /* List of RTL language codes */
  const rtlLanguages = ["ar", "he", "fa", "ur", "ku", "ps", "sd", "yi"];

  /* Get user's browser language */
  const userLanguage = navigator.language || navigator.userLanguage;
  const languageCode = userLanguage.split("-")[0].toLowerCase();

  /* Check if the user's language is RTL */
  const isRTL = rtlLanguages.includes(languageCode);

  /* Set the direction attribute on the html element */
  const html = document.documentElement;
  if (isRTL) {
    html.setAttribute("dir", "rtl");
  } else {
    html.setAttribute("dir", "ltr");
  }
}

/* Function to call OpenAI API through Cloudflare Workers */
async function callOpenAI(userMessage) {
  /* Check if AI is already responding */
  if (isAIResponding) {
    return;
  }

  /* Set loading state and disable buttons */
  isAIResponding = true;
  disableButtons();

  try {
    /* Add user message to chat history */
    chatHistory.push({
      role: "user",
      content: userMessage,
    });

    /* Show loading message while waiting for response */
    chatWindow.innerHTML += `
      <div style="margin-bottom: 15px;">
        <strong>You:</strong> ${userMessage}
      </div>
      <div style="margin-bottom: 15px; color: #666;" id="loading-message">
        <strong>AI Assistant:</strong> <em>Thinking...</em>
      </div>
    `;

    /* Scroll to bottom of chat window */
    chatWindow.scrollTop = chatWindow.scrollHeight;

    /* Load the current products data to send as context */
    const products = await loadProducts();

    /* Create a simplified product list for the AI context */
    const productContext = products.map((product) => ({
      id: product.id,
      brand: product.brand,
      name: product.name,
      category: product.category,
      description: product.description,
    }));

    /* Prepare the messages array for OpenAI API with chat history */
    const messages = [
      {
        role: "system",
        content: `You are a helpful L'Oréal beauty and skincare expert. Help users build personalized beauty routines using L'Oréal products. Be friendly, knowledgeable, and provide specific product recommendations when appropriate. Format your responses using markdown for better readability (use **bold**, *italics*, lists, etc.).

Here is the complete list of available products you can recommend:
${JSON.stringify(productContext, null, 2)}

When making recommendations, always reference specific products from this list by their exact names and brands. Focus on creating personalized routines based on the user's needs and the products available.`,
      },
      /* Add all previous chat history to maintain conversation context */
      ...chatHistory,
    ];

    /* Make API request to Cloudflare Workers endpoint */
    const response = await fetch(
      "https://openai-worker.liam-kaznelson.workers.dev",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          tools: [{ type: "web_search" }],
          tool_choice: "auto", // Let model decide when to search
          messages: messages,
          max_tokens: 500,
          temperature: 0.8,
        }),
      }
    );

    /* Check if the response is successful */
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    /* Parse the JSON response */
    const data = await response.json();

    /* Extract the AI response from the API data */
    /* Handle both regular responses and responses with web search results */
    let aiResponse = "";
    const message = data.choices[0].message;

    /* Check if there's regular content */
    if (message.content) {
      aiResponse = message.content;
    }

    /* Check if there are tool calls (web search results) */
    if (message.tool_calls && message.tool_calls.length > 0) {
      /* If we already have content, add separator */
      if (aiResponse) {
        aiResponse += "\n\n---\n\n";
      }

      /* Process each tool call */
      message.tool_calls.forEach((toolCall) => {
        if (toolCall.type === "web_search") {
          /* Handle web search tool calls */
          const searchResults = toolCall.web_search;
          if (searchResults && searchResults.results) {
            aiResponse += "**Related Web Search Results:**\n\n";
            searchResults.results.forEach((result, index) => {
              aiResponse += `${index + 1}. **[${result.title}](${
                result.url
              })**\n`;
              if (result.snippet) {
                aiResponse += `   ${result.snippet}\n\n`;
              }
            });
          }
        } else if (toolCall.function) {
          /* Handle other function calls if present */
          aiResponse += `**Tool Used:** ${toolCall.function.name}\n`;
          if (toolCall.function.arguments) {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              aiResponse += `**Query:** ${
                args.query || "Information search"
              }\n\n`;
            } catch (e) {
              /* If arguments can't be parsed, just show that a tool was used */
              aiResponse += "\n";
            }
          }
        }
      });
    }

    /* Fallback if no content or tool calls */
    if (!aiResponse) {
      aiResponse =
        "I apologize, but I received an unexpected response format. Please try asking your question again.";
    }

    /* Add AI response to chat history */
    chatHistory.push({
      role: "assistant",
      content: aiResponse,
    });

    /* Save updated chat history to localStorage */
    saveChatHistory();

    /* Update chat window with the formatted AI response using typewriter effect */
    const loadingElement = document.getElementById("loading-message");
    if (loadingElement) {
      /* Create a container for the AI response content */
      const responseContainer = document.createElement("span");
      loadingElement.innerHTML = "<strong>AI Assistant:</strong> ";
      loadingElement.appendChild(responseContainer);
      loadingElement.removeAttribute("id");

      /* Apply typewriter effect to the response */
      await typewriterEffect(responseContainer, aiResponse, 20);
    }
  } catch (error) {
    /* Handle any errors that occur during the API call */
    console.error("Error calling OpenAI API:", error);

    /* Show error message to user */
    const loadingElement = document.getElementById("loading-message");
    if (loadingElement) {
      loadingElement.innerHTML =
        "<strong>AI Assistant:</strong> Sorry, I encountered an error. Please try again.";
      loadingElement.removeAttribute("id");
    }
  } finally {
    /* Re-enable buttons and reset loading state */
    isAIResponding = false;
    enableButtons();
  }

  /* Scroll to bottom of chat window */
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Generate routine based on selected products */
async function generateRoutine() {
  /* Check if any products are selected */
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML += `
      <div style="margin-bottom: 15px; color: #ff003b;">
        <strong>Notice:</strong> Please select some products first to generate a personalized routine.
      </div>
    `;
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return;
  }

  /* Create a message about the selected products */
  const productList = selectedProducts
    .map((product) => `${product.name} by ${product.brand}`)
    .join(", ");
  const routineMessage = `I have selected these L'Oréal products: ${productList}. Can you help me create a personalized beauty routine using these products? Please provide step-by-step instructions and tips for best results.`;

  /* Call OpenAI API with the routine request */
  await callOpenAI(routineMessage);
}

/* Chat form submission handler with OpenAI integration */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  /* Get the user's message from the input field */
  const userMessage = userInput.value.trim();

  /* Check if the user actually typed something */
  if (!userMessage) {
    return;
  }

  /* Clear the input field */
  userInput.value = "";

  /* Call OpenAI API with the user's message */
  await callOpenAI(userMessage);
});

/* Add event listener for the Generate Routine button */
generateRoutineBtn.addEventListener("click", generateRoutine);

/* Add event listener for the Clear All button */
clearAllBtn.addEventListener("click", clearAllProducts);

/* Add event listener for the Show More button */
showMoreBtn.addEventListener("click", toggleShowMore);
