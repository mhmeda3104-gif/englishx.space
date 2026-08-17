// ai-builder.js
// Mock AI logic for ESTL Builder

const DB_PRODUCTS = [
  { id: 'mcu1', name: 'ESP32 Development Board', category: 'mcu', price: 8.50, emoji: '📱', desc: 'Powerful Wi-Fi + Bluetooth MCU for IoT projects.' },
  { id: 'mcu2', name: 'Arduino Nano V3.0', category: 'mcu', price: 5.00, emoji: '⚡', desc: 'Classic, compact ATmega328P microcontroller.' },
  { id: 'mcu3', name: 'Raspberry Pi Pico W', category: 'mcu', price: 6.00, emoji: '🍓', desc: 'RP2040 chip with built-in wireless connectivity.' },
  { id: 'sen1', name: 'HC-SR04 Ultrasonic Sensor', category: 'sensors', price: 2.50, emoji: '📡', desc: 'Distance measuring transducer for robotics.' },
  { id: 'sen2', name: 'MPU-6050 Gyro/Accel', category: 'sensors', price: 4.00, emoji: '📐', desc: '6-axis motion tracking device for drones & balance.' },
  { id: 'mot1', name: 'NEMA 17 Stepper Motor', category: 'motors', price: 12.00, emoji: '⚙️', desc: 'High-torque precision motor for 3D printers and CNC.' },
  { id: 'mot2', name: 'MG996R Servo Motor', category: 'motors', price: 7.00, emoji: '🦾', desc: 'High-torque metal gear servo for robotic arms.' }
];

const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');

function appendMessage(sender, text, products = []) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${sender}`;
  
  let productsHtml = '';
  if (products.length > 0) {
    productsHtml = '<div style="margin-top: 16px;"><strong>Recommended Components:</strong><br>';
    products.forEach(pId => {
      const p = DB_PRODUCTS.find(x => x.id === pId);
      if(p) {
        productsHtml += `
          <div class="chat-product">
            <div class="chat-product-icon">${p.emoji}</div>
            <div class="chat-product-info">
              <div class="chat-product-title">${p.name}</div>
              <div class="chat-product-price">$${p.price.toFixed(2)}</div>
            </div>
            <button class="btn btn-primary" style="padding: 8px 16px; font-size: 13px;" onclick="addFromChat('${p.id}')">Add to Cart</button>
          </div>
        `;
      }
    });
    productsHtml += '</div>';
  }

  msgDiv.innerHTML = `
    <div class="message-bubble">
      ${text}
      ${productsHtml}
    </div>
  `;
  
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ai typing-indicator-msg`;
  msgDiv.innerHTML = `
    <div class="message-bubble">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
  const indicator = document.querySelector('.typing-indicator-msg');
  if (indicator) indicator.remove();
}

function addFromChat(id) {
  if(!window.currentUser && typeof showToast !== 'undefined') {
    return showToast("Please login first to use the cart", "warning");
  }
  const p = DB_PRODUCTS.find(x => x.id === id);
  let cart = JSON.parse(localStorage.getItem('estl_cart') || '[]');
  const existing = cart.find(x => x.id === id);
  if(existing) existing.qty += 1;
  else cart.push({...p, qty: 1});
  
  localStorage.setItem('estl_cart', JSON.stringify(cart));
  
  // Update cart count
  const countEl = document.getElementById('cartCount');
  if(countEl) {
    const total = cart.reduce((sum, item) => sum + item.qty, 0);
    countEl.innerText = total;
  }
  
  showToast(`${p.name} added to cart!`, "success");
}

function analyzeInput(text) {
  const t = text.toLowerCase();
  
  if (t.includes('car') || t.includes('rover') || t.includes('robot') || t.includes('سيارة') || t.includes('روبوت')) {
    return {
      reply: "Building a robot car is a fantastic project! You'll need a microcontroller to process the logic, some motors to drive the wheels, and an ultrasonic sensor to avoid obstacles. Here is what I recommend:",
      products: ['mcu2', 'mot2', 'sen1']
    };
  }
  
  if (t.includes('drone') || t.includes('fly') || t.includes('quadcopter') || t.includes('درون') || t.includes('طائرة')) {
    return {
      reply: "Awesome! Drones require precise motion tracking and a fast processor to stay balanced in the air. The ESP32 is great for wireless control, and the MPU-6050 is a must-have for the flight controller.",
      products: ['mcu1', 'sen2']
    };
  }
  
  if (t.includes('home') || t.includes('smart') || t.includes('weather') || t.includes('iot') || t.includes('بيت ذكي')) {
    return {
      reply: "Smart home projects are very popular! You'll definitely want a board with built-in Wi-Fi so you can connect it to the cloud. I recommend the ESP32 or the Raspberry Pi Pico W.",
      products: ['mcu1', 'mcu3']
    };
  }
  
  if (t.includes('arm') || t.includes('cnc') || t.includes('3d printer')) {
    return {
      reply: "For heavy-duty robotic arms or CNC machines, you need high torque and precision. Stepper motors are perfect for this, combined with an Arduino to send the step signals.",
      products: ['mcu2', 'mot1']
    };
  }

  if (t.includes('hello') || t.includes('hi') || t.includes('مرحبا')) {
    return {
      reply: "Hello there! What kind of engineering project are you planning to build today?",
      products: []
    };
  }

  return {
    reply: "That sounds like an interesting idea! While I'm still learning about that specific project, generally you'll want to start with a good microcontroller and some basic sensors. Check these out:",
    products: ['mcu2', 'sen1']
  };
}

function handleSend() {
  const text = userInput.value.trim();
  if (!text) return;
  
  appendMessage('user', text);
  userInput.value = '';
  
  showTypingIndicator();
  
  setTimeout(() => {
    hideTypingIndicator();
    const response = analyzeInput(text);
    appendMessage('ai', response.reply, response.products);
  }, 1500); // Simulate network delay
}

sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleSend();
});

// Update cart count on load for this page
document.addEventListener('DOMContentLoaded', () => {
  const cart = JSON.parse(localStorage.getItem('estl_cart') || '[]');
  const countEl = document.getElementById('cartCount');
  if(countEl) {
    const total = cart.reduce((sum, item) => sum + item.qty, 0);
    countEl.innerText = total;
  }
});
