// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCTMHlUCGOpU7VRIdbP2VADzUF9n1lI88A",
  authDomain: "site-pizza-a2930.firebaseapp.com",
  projectId: "site-pizza-a2930",
  storageBucket: "site-pizza-a2930.firebasestorage.app",
  messagingSenderId: "914255031241",
  appId: "1:914255031241:web:84ae273b22cb7d04499618"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Global State Management
class PizzariaApp {
    constructor() {
        this.cart = [];
        this.currentUser = null;
        this.menuData = {
            categories: [
                { id: 'pizzas-salgadas', name: 'Pizzas Salgadas', icon: 'fas fa-pizza-slice' },
                { id: 'pizzas-doces', name: 'Pizzas Doces', icon: 'fas fa-birthday-cake' },
                { id: 'bebidas', name: 'Bebidas', icon: 'fas fa-glass-water' }
            ],
            items: {
                'margherita': {
                    id: 'margherita',
                    name: 'Pizza Margherita',
                    description: 'Molho de tomate, mozzarella de búfala, manjericão fresco e azeite extravirgem',
                    category: 'pizzas-salgadas',
                    prices: { 'P': 32.00, 'M': 42.00, 'G': 48.00 },
                    popular: true,
                    vegetarian: true
                },
                'calabresa': {
                    id: 'calabresa',
                    name: 'Calabresa Especial',
                    description: 'Molho de tomate, calabresa artesanal, cebola roxa, azeitonas pretas e orégano',
                    category: 'pizzas-salgadas',
                    prices: { 'P': 35.00, 'M': 45.00, 'G': 52.00 },
                    popular: true
                },
                'portuguesa': {
                    id: 'portuguesa',
                    name: 'Portuguesa Premium',
                    description: 'Molho de tomate, presunto parma, ovos caipira, ervilhas, cebola e azeitonas portuguesas',
                    category: 'pizzas-salgadas',
                    prices: { 'P': 42.00, 'M': 52.00, 'G': 58.00 }
                },
                'quatro-queijos': {
                    id: 'quatro-queijos',
                    name: 'Quatro Queijos Gourmet',
                    description: 'Molho branco, mozzarella, gorgonzola, parmesão reggiano e catupiry premium',
                    category: 'pizzas-salgadas',
                    prices: { 'P': 45.00, 'M': 55.00, 'G': 62.00 },
                    premium: true
                },
                'chocolate': {
                    id: 'chocolate',
                    name: 'Chocolate com Morango',
                    description: 'Massa doce, nutella, morangos frescos, banana e açúcar de confeiteiro',
                    category: 'pizzas-doces',
                    prices: { 'P': 28.00, 'M': 35.00, 'G': 42.00 },
                    popular: true
                },
                'coca-2l': {
                    id: 'coca-2l',
                    name: 'Coca-Cola 2L',
                    description: 'Refrigerante Coca-Cola 2 litros gelado',
                    category: 'bebidas',
                    prices: { 'Única': 8.00 }
                },
                'guarana-2l': {
                    id: 'guarana-2l',
                    name: 'Guaraná Antarctica 2L',
                    description: 'Refrigerante Guaraná Antarctica 2 litros gelado',
                    category: 'bebidas',
                    prices: { 'Única': 8.00 }
                }
            }
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupSmoothScrolling();
        this.setupHeaderScroll();
        this.initializeFirebaseData();
        this.loadCartFromStorage();
        this.setupIntersectionObserver();
    }

    setupEventListeners() {
        // Navigation events
        document.addEventListener('click', this.handleGlobalClick.bind(this));
        
        // Header scroll effect
        window.addEventListener('scroll', this.handleScroll.bind(this));
        
        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobileMenuToggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', this.toggleMobileMenu.bind(this));
        }

        // Modal events
        this.setupModalEvents();
        
        // Form submissions
        const adminForm = document.getElementById('adminLoginForm');
        if (adminForm) {
            adminForm.addEventListener('submit', this.handleAdminLogin.bind(this));
        }

        // Cart events
        const finishOrderBtn = document.getElementById('finishOrder');
        if (finishOrderBtn) {
            finishOrderBtn.addEventListener('click', this.finishOrder.bind(this));
        }

        // Menu category tabs
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-tab')) {
                this.switchMenuCategory(e.target.dataset.category);
            }
        });
    }

    handleGlobalClick(e) {
        const target = e.target;
        
        // Menu buttons
        if (target.id === 'verCardapioBtn' || target.id === 'heroCardapioBtn' || target.id === 'fullMenuBtn') {
            e.preventDefault();
            this.openFullMenu();
        }
        
        // Admin buttons
        if (target.id === 'adminBtn' || target.id === 'footerAdminBtn') {
            e.preventDefault();
            this.openAdminModal();
        }
        
        // Modal close buttons
        if (target.classList.contains('modal-close') || target.classList.contains('modal') && !target.closest('.modal-content')) {
            this.closeAllModals();
        }
        
        // Cart close
        if (target.id === 'closeCart') {
            this.closeCart();
        }
    }

    setupSmoothScrolling() {
        // Smooth scroll for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    const headerHeight = document.querySelector('.header').offsetHeight;
                    const targetPosition = target.offsetTop - headerHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                    
                    // Update active nav link
                    this.updateActiveNavLink(anchor.getAttribute('href'));
                }
            });
        });
    }

    setupHeaderScroll() {
        const header = document.querySelector('.header');
        let lastScrollY = window.scrollY;
        
        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;
            
            if (currentScrollY > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
            
            // Hide/show header on scroll
            if (currentScrollY > lastScrollY && currentScrollY > 200) {
                header.style.transform = 'translateY(-100%)';
            } else {
                header.style.transform = 'translateY(0)';
            }
            
            lastScrollY = currentScrollY;
        });
    }

    setupIntersectionObserver() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    this.updateActiveNavLink(`#${id}`);
                }
            });
        }, {
            threshold: 0.3,
            rootMargin: '-100px 0px -100px 0px'
        });
        
        sections.forEach(section => observer.observe(section));
    }

    updateActiveNavLink(activeHref) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === activeHref) {
                link.classList.add('active');
            }
        });
    }

    handleScroll() {
        // Add any scroll-based animations here
        this.animateOnScroll();
    }

    animateOnScroll() {
        const elements = document.querySelectorAll('.menu-card, .contact-card, .feature-item');
        
        elements.forEach(element => {
            const rect = element.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
            
            if (isVisible && !element.classList.contains('animated')) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
                element.classList.add('animated');
            }
        });
    }

    toggleMobileMenu() {
        const nav = document.querySelector('.nav');
        nav.classList.toggle('mobile-open');
    }

    // Modal Management
    setupModalEvents() {
        // Close modals with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    openFullMenu() {
        const modal = document.getElementById('menuModal');
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Load menu content
        this.loadMenuContent('pizzas-salgadas');
    }

    openAdminModal() {
        const modal = document.getElementById('adminModal');
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Clear form
        document.getElementById('adminLoginForm').reset();
        this.hideError();
        this.hideLoading();
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
        document.body.style.overflow = '';
    }

    // Menu Management
    async loadMenuContent(categoryId) {
        const container = document.getElementById('menuItems');
        const tabs = document.querySelectorAll('.category-tab');
        
        // Update active tab
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === categoryId);
        });
        
        // Show loading
        container.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Carregando ${this.getCategoryName(categoryId)}...</span>
            </div>
        `;
        
        try {
            // Simulate loading time for better UX
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const items = this.getItemsByCategory(categoryId);
            this.renderMenuItems(container, items);
            
        } catch (error) {
            console.error('Erro ao carregar menu:', error);
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Erro ao carregar cardápio. Tente novamente.</span>
                </div>
            `;
        }
    }

    getItemsByCategory(categoryId) {
        return Object.values(this.menuData.items).filter(item => item.category === categoryId);
    }

    getCategoryName(categoryId) {
        const category = this.menuData.categories.find(cat => cat.id === categoryId);
        return category ? category.name : 'Menu';
    }

    renderMenuItems(container, items) {
        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-utensils"></i>
                    <p>Nenhum item encontrado nesta categoria</p>
                </div>
            `;
            return;
        }

        const itemsHTML = items.map(item => `
            <div class="menu-item-card" data-item-id="${item.id}">
                <div class="menu-item-image">
                    <div class="image-placeholder">
                        <i class="fas fa-pizza-slice"></i>
                    </div>
                    ${item.popular ? '<div class="item-badge popular">Popular</div>' : ''}
                    ${item.premium ? '<div class="item-badge premium">Premium</div>' : ''}
                    ${item.vegetarian ? '<div class="item-badge vegetarian">Vegetariano</div>' : ''}
                </div>
                <div class="menu-item-content">
                    <h4 class="menu-item-title">${item.name}</h4>
                    <p class="menu-item-description">${item.description}</p>
                    <div class="menu-item-sizes">
                        ${Object.entries(item.prices).map(([size, price]) => `
                            <button class="size-option" data-size="${size}" data-price="${price}">
                                <span class="size-name">${size}</span>
                                <span class="size-price">R$ ${price.toFixed(2)}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="menu-items-grid">
                ${itemsHTML}
            </div>
        `;

        // Add click events to size options
        container.addEventListener('click', (e) => {
            if (e.target.closest('.size-option')) {
                const sizeBtn = e.target.closest('.size-option');
                const itemCard = e.target.closest('.menu-item-card');
                const itemId = itemCard.dataset.itemId;
                const size = sizeBtn.dataset.size;
                const price = parseFloat(sizeBtn.dataset.price);
                
                this.addToCart(itemId, size, price);
            }
        });
    }

    switchMenuCategory(categoryId) {
        this.loadMenuContent(categoryId);
    }

    // Cart Management
    addToCart(itemId, size, price) {
        const item = this.menuData.items[itemId];
        if (!item) return;

        const cartItemId = `${itemId}-${size}`;
        const existingItem = this.cart.find(cartItem => cartItem.id === cartItemId);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                id: cartItemId,
                itemId: itemId,
                name: item.name,
                size: size,
                price: price,
                quantity: 1
            });
        }

        this.saveCartToStorage();
        this.updateCartUI();
        this.showCartNotification(item.name, size);
    }

    removeFromCart(cartItemId) {
        this.cart = this.cart.filter(item => item.id !== cartItemId);
        this.saveCartToStorage();
        this.updateCartUI();
    }

    updateCartQuantity(cartItemId, newQuantity) {
        const item = this.cart.find(cartItem => cartItem.id === cartItemId);
        if (item) {
            if (newQuantity <= 0) {
                this.removeFromCart(cartItemId);
            } else {
                item.quantity = newQuantity;
                this.saveCartToStorage();
                this.updateCartUI();
            }
        }
    }

    updateCartUI() {
        const cartContent = document.getElementById('cartContent');
        const cartFooter = document.getElementById('cartFooter');
        const cartTotal = document.getElementById('cartTotal');

        if (this.cart.length === 0) {
            cartContent.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Seu carrinho está vazio</p>
                    <small>Adicione pizzas deliciosas!</small>
                </div>
            `;
            cartFooter.style.display = 'none';
            return;
        }

        const cartHTML = this.cart.map(item => `
            <div class="cart-item" data-cart-id="${item.id}">
                <div class="cart-item-info">
                    <h4 class="cart-item-name">${item.name}</h4>
                    <p class="cart-item-details">Tamanho: ${item.size}</p>
                    <p class="cart-item-price">R$ ${item.price.toFixed(2)}</p>
                </div>
                <div class="cart-item-controls">
                    <div class="quantity-controls">
                        <button class="quantity-btn minus" onclick="app.updateCartQuantity('${item.id}', ${item.quantity - 1})">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn plus" onclick="app.updateCartQuantity('${item.id}', ${item.quantity + 1})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <button class="remove-item-btn" onclick="app.removeFromCart('${item.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        cartContent.innerHTML = cartHTML;
        cartFooter.style.display = 'block';
        
        const total = this.getCartTotal();
        cartTotal.textContent = `R$ ${total.toFixed(2)}`;
    }

    getCartTotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    showCartNotification(itemName, size) {
        // Create and show a notification
        const notification = document.createElement('div');
        notification.className = 'cart-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-check-circle"></i>
                <span>${itemName} (${size}) adicionado ao carrinho!</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);

        // Show cart sidebar briefly
        this.showCartPreview();
    }

    showCartPreview() {
        const cartSidebar = document.getElementById('cartSidebar');
        cartSidebar.classList.remove('hidden');
        
        // Auto-hide after 3 seconds if user doesn't interact
        setTimeout(() => {
            if (!cartSidebar.matches(':hover')) {
                cartSidebar.classList.add('hidden');
            }
        }, 3000);
    }

    openCart() {
        document.getElementById('cartSidebar').classList.remove('hidden');
    }

    closeCart() {
        document.getElementById('cartSidebar').classList.add('hidden');
    }

    saveCartToStorage() {
        try {
            sessionStorage.setItem('pizzaria_cart', JSON.stringify(this.cart));
        } catch (error) {
            console.warn('Não foi possível salvar o carrinho:', error);
        }
    }

    loadCartFromStorage() {
        try {
            const savedCart = sessionStorage.getItem('pizzaria_cart');
            if (savedCart) {
                this.cart = JSON.parse(savedCart);
                this.updateCartUI();
            }
        } catch (error) {
            console.warn('Não foi possível carregar o carrinho:', error);
            this.cart = [];
        }
    }

    // WhatsApp Integration
    async finishOrder() {
        if (this.cart.length === 0) {
            this.showError('Seu carrinho está vazio!');
            return;
        }

        const customerData = await this.getCustomerData();
        if (!customerData) return;

        const whatsappMessage = this.generateWhatsAppMessage(customerData);
        const whatsappUrl = `https://wa.me/5527996500341?text=${encodeURIComponent(whatsappMessage)}`;

        // Log the order
        try {
            await this.logOrder(customerData);
        } catch (error) {
            console.error('Erro ao registrar pedido:', error);
        }

        // Open WhatsApp
        window.open(whatsappUrl, '_blank');

        // Clear cart
        this.cart = [];
        this.saveCartToStorage();
        this.updateCartUI();
        this.closeCart();

        // Show success message
        this.showSuccessMessage('Pedido enviado para o WhatsApp! Aguarde nosso contato.');
    }

    async getCustomerData() {
        return new Promise((resolve) => {
            const modal = this.createCustomerDataModal();
            document.body.appendChild(modal);

            const form = modal.querySelector('.customer-form');
            const closeBtn = modal.querySelector('.modal-close');

            const cleanup = () => {
                document.body.removeChild(modal);
                document.body.style.overflow = '';
            };

            closeBtn.addEventListener('click', () => {
                cleanup();
                resolve(null);
            });

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const customerData = {
                    name: formData.get('name'),
                    phone: formData.get('phone'),
                    address: formData.get('address'),
                    notes: formData.get('notes')
                };

                if (!customerData.name || !customerData.phone) {
                    this.showError('Nome e telefone são obrigatórios!');
                    return;
                }

                cleanup();
                resolve(customerData);
            });

            document.body.style.overflow = 'hidden';
        });
    }

    createCustomerDataModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>
                        <i class="fas fa-user"></i>
                        Dados para Entrega
                    </h3>
                    <button class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form class="customer-form">
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-user"></i>
                                Nome Completo *
                            </label>
                            <input type="text" name="name" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-phone"></i>
                                Telefone/WhatsApp *
                            </label>
                            <input type="tel" name="phone" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-map-marker-alt"></i>
                                Endereço para Entrega
                            </label>
                            <textarea name="address" class="form-control" rows="3" placeholder="Deixe vazio para retirada na loja"></textarea>
                            <small>Se deixar vazio, o pedido será para retirada na pizzaria</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-comment"></i>
                                Observações
                            </label>
                            <textarea name="notes" class="form-control" rows="2" placeholder="Alguma observação especial?"></textarea>
                        </div>
                        <button type="submit" class="btn btn--primary btn--full-width">
                            <i class="fab fa-whatsapp"></i>
                            Enviar Pedido
                        </button>
                    </form>
                </div>
            </div>
        `;
        return modal;
    }

    generateWhatsAppMessage(customerData) {
        const total = this.getCartTotal();
        const itemsList = this.cart.map(item => 
            `• ${item.quantity}x ${item.name} (${item.size}) - R$ ${(item.price * item.quantity).toFixed(2)}`
        ).join('\n');

        let message = `🍕 *PEDIDO - PIZZARIA SANTA SENSAÇÃO*\n\n`;
        message += `*ITENS DO PEDIDO:*\n${itemsList}\n\n`;
        message += `*TOTAL: R$ ${total.toFixed(2)}*\n\n`;
        message += `*DADOS DO CLIENTE:*\n`;
        message += `📝 Nome: ${customerData.name}\n`;
        message += `📞 Telefone: ${customerData.phone}\n`;

        if (customerData.address && customerData.address.trim()) {
            message += `📍 Endereço: ${customerData.address}\n`;
            message += `🚚 *Modalidade: DELIVERY*\n`;
        } else {
            message += `🏪 *Modalidade: RETIRADA NA LOJA*\n`;
        }

        if (customerData.notes && customerData.notes.trim()) {
            message += `\n💬 *Observações:*\n${customerData.notes}\n`;
        }

        message += `\n⏰ Pedido realizado em: ${new Date().toLocaleString('pt-BR')}`;

        return message;
    }

    // Admin Functions
    async handleAdminLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value;

        if (!email || !password) {
            this.showError('Por favor, preencha todos os campos.');
            return;
        }

        this.showLoading();

        try {
            // Check admin credentials
            const adminDoc = await db.collection('portfolio_users').doc('adm@adm').get();
            
            if (!adminDoc.exists) {
                this.showError('Configurações administrativas não encontradas.');
                return;
            }

            const adminData = adminDoc.data();
            
            // Simple authentication check (in production, use proper authentication)
            if (email === 'adm@adm' && password === adminData.password) {
                // Success
                await this.logSystemActivity('admin_login', email, 'Login administrativo realizado');
                
                this.currentUser = {
                    email: email,
                    name: 'Administrador',
                    isAdmin: true
                };

                this.showSuccessMessage('Login realizado com sucesso! Redirecionando...');
                
                setTimeout(() => {
                    // In a real app, this would redirect to an admin panel
                    this.closeAllModals();
                    alert('Área administrativa ainda não implementada. Esta é uma versão de demonstração.');
                }, 1000);

            } else {
                this.showError('Email ou senha incorretos.');
            }

        } catch (error) {
            console.error('Erro no login administrativo:', error);
            this.showError('Erro interno. Tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    // Firebase Functions
    async initializeFirebaseData() {
        try {
            // Initialize admin user if not exists
            const adminDoc = await db.collection('portfolio_users').doc('adm@adm').get();
            
            if (!adminDoc.exists) {
                await db.collection('portfolio_users').doc('adm@adm').set({
                    email: 'adm@adm',
                    password: 'admin123', // In production, use hashed passwords
                    name: 'Administrador',
                    role: 'admin',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('Admin user initialized');
            }

            // Initialize menu categories if not exist
            const categoriesSnapshot = await db.collection('menu_categories').get();
            if (categoriesSnapshot.empty) {
                for (const category of this.menuData.categories) {
                    await db.collection('menu_categories').doc(category.id).set({
                        ...category,
                        active: true,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                console.log('Menu categories initialized');
            }

            // Initialize menu items if not exist
            const itemsSnapshot = await db.collection('menu_items').get();
            if (itemsSnapshot.empty) {
                for (const [itemId, item] of Object.entries(this.menuData.items)) {
                    await db.collection('menu_items').doc(itemId).set({
                        ...item,
                        active: true,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                console.log('Menu items initialized');
            }

        } catch (error) {
            console.error('Erro ao inicializar dados do Firebase:', error);
        }
    }

    async logSystemActivity(action, userEmail, details) {
        try {
            await db.collection('system_logs').add({
                action: action,
                userEmail: userEmail,
                details: details,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Erro ao registrar log:', error);
        }
    }

    async logOrder(customerData) {
        try {
            const orderData = {
                customer: customerData,
                items: this.cart,
                total: this.getCartTotal(),
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                orderDate: new Date().toISOString()
            };

            await db.collection('orders').add(orderData);
            await this.logSystemActivity('order_created', customerData.phone, 
                `Novo pedido - Total: R$ ${orderData.total.toFixed(2)}`);
        } catch (error) {
            console.error('Erro ao salvar pedido:', error);
        }
    }

    // UI Helper Functions
    showError(message) {
        const errorDiv = document.getElementById('adminError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        } else {
            alert(message);
        }
    }

    hideError() {
        const errorDiv = document.getElementById('adminError');
        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }
    }

    showLoading() {
        const loadingDiv = document.getElementById('adminLoading');
        if (loadingDiv) {
            loadingDiv.classList.remove('hidden');
        }
    }

    hideLoading() {
        const loadingDiv = document.getElementById('adminLoading');
        if (loadingDiv) {
            loadingDiv.classList.add('hidden');
        }
    }

    showSuccessMessage(message) {
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.innerHTML = `
            <div class="notification-content success">
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 4000);
    }
}

// Global functions for onclick handlers
window.openPizzaDetails = function(pizzaId) {
    app.openFullMenu();
    // Focus on the specific pizza after opening menu
    setTimeout(() => {
        const pizzaCard = document.querySelector(`[data-item-id="${pizzaId}"]`);
        if (pizzaCard) {
            pizzaCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            pizzaCard.style.outline = '2px solid var(--color-primary)';
            setTimeout(() => {
                pizzaCard.style.outline = '';
            }, 2000);
        }
    }, 600);
};

// Initialize the application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new PizzariaApp();
    
    // Add some CSS for notifications and animations
    const style = document.createElement('style');
    style.textContent = `
        .cart-notification, .success-notification {
            position: fixed;
            top: 100px;
            right: 20px;
            z-index: 3000;
            transform: translateX(400px);
            transition: transform 0.3s ease-in-out;
        }
        
        .cart-notification.show, .success-notification.show {
            transform: translateX(0);
        }
        
        .notification-content {
            background: var(--color-primary);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-lg);
            display: flex;
            align-items: center;
            gap: 0.5rem;
            min-width: 300px;
        }
        
        .notification-content.success {
            background: #10B981;
        }
        
        .menu-items-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 1.5rem;
        }
        
        .menu-item-card {
            background: white;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-md);
            overflow: hidden;
            transition: all 0.3s ease;
        }
        
        .menu-item-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-lg);
        }
        
        .menu-item-image {
            position: relative;
            height: 200px;
        }
        
        .item-badge {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            padding: 0.25rem 0.75rem;
            border-radius: var(--radius-full);
            font-size: 0.75rem;
            font-weight: 600;
            color: white;
        }
        
        .item-badge.popular { background: #10B981; }
        .item-badge.premium { background: #8B5A00; }
        .item-badge.vegetarian { background: #059669; }
        
        .menu-item-content {
            padding: 1.5rem;
        }
        
        .menu-item-title {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: var(--color-text-primary);
        }
        
        .menu-item-description {
            color: var(--color-text-secondary);
            margin-bottom: 1rem;
            line-height: 1.5;
        }
        
        .menu-item-sizes {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        
        .size-option {
            background: var(--color-bg-secondary);
            border: 2px solid var(--color-border);
            border-radius: var(--radius-md);
            padding: 0.75rem 1rem;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.25rem;
            flex: 1;
            min-width: 80px;
        }
        
        .size-option:hover {
            border-color: var(--color-primary);
            background: rgba(139, 0, 0, 0.05);
        }
        
        .size-name {
            font-weight: 600;
            color: var(--color-text-primary);
        }
        
        .size-price {
            font-size: 0.875rem;
            color: var(--color-primary);
            font-weight: 600;
        }
        
        .cart-item {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 1rem 0;
            border-bottom: 1px solid var(--color-border);
        }
        
        .cart-item:last-child {
            border-bottom: none;
        }
        
        .cart-item-info h4 {
            margin: 0 0 0.25rem 0;
            color: var(--color-text-primary);
        }
        
        .cart-item-details, .cart-item-price {
            margin: 0;
            font-size: 0.875rem;
            color: var(--color-text-secondary);
        }
        
        .cart-item-price {
            font-weight: 600;
            color: var(--color-primary);
        }
        
        .cart-item-controls {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            align-items: flex-end;
        }
        
        .quantity-controls {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .quantity-btn {
            background: var(--color-bg-secondary);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .quantity-btn:hover {
            background: var(--color-primary);
            color: white;
            border-color: var(--color-primary);
        }
        
        .quantity {
            font-weight: 600;
            min-width: 20px;
            text-align: center;
        }
        
        .remove-item-btn {
            background: #EF4444;
            border: none;
            color: white;
            border-radius: var(--radius-sm);
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .remove-item-btn:hover {
            background: #DC2626;
        }
        
        @media (max-width: 768px) {
            .menu-items-grid {
                grid-template-columns: 1fr;
            }
            
            .cart-notification, .success-notification {
                right: 10px;
                left: 10px;
                transform: translateY(-100px);
            }
            
            .cart-notification.show, .success-notification.show {
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
});

console.log('🍕 Pizzaria Santa Sensação - Sistema carregado com sucesso!');