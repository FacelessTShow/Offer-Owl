import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

const resources = {
  en: {
    translation: {
      // Navigation
      home: 'Home',
      compare: 'Compare',
      favorites: 'Favorites',
      profile: 'Profile',
      
      // Common
      search: 'Search',
      loading: 'Loading...',
      error: 'Error',
      retry: 'Retry',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      remove: 'Remove',
      back: 'Back',
      next: 'Next',
      done: 'Done',
      
      // Authentication
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      forgotPassword: 'Forgot Password?',
      loginWithGoogle: 'Login with Google',
      loginWithApple: 'Login with Apple',
      createAccount: 'Create Account',
      alreadyHaveAccount: 'Already have an account?',
      dontHaveAccount: "Don't have an account?",
      
      // Product Search
      searchProducts: 'Search Products',
      voiceSearch: 'Voice Search',
      imageSearch: 'Image Search',
      scanProduct: 'Scan Product',
      searchByCategory: 'Search by Category',
      recentSearches: 'Recent Searches',
      popularProducts: 'Popular Products',
      featuredDeals: 'Featured Deals',
      
      // Product Details
      productDetails: 'Product Details',
      specifications: 'Specifications',
      reviews: 'Reviews',
      priceHistory: 'Price History',
      priceAlert: 'Price Alert',
      addToFavorites: 'Add to Favorites',
      removeFromFavorites: 'Remove from Favorites',
      shareProduct: 'Share Product',
      currentPrice: 'Current Price',
      lowestPrice: 'Lowest Price',
      highestPrice: 'Highest Price',
      averagePrice: 'Average Price',
      availability: 'Availability',
      inStock: 'In Stock',
      outOfStock: 'Out of Stock',
      limitedStock: 'Limited Stock',
      
      // Price Comparison
      compareProducts: 'Compare Products',
      priceComparison: 'Price Comparison',
      stores: 'Stores',
      shipping: 'Shipping',
      delivery: 'Delivery',
      totalPrice: 'Total Price',
      savings: 'Savings',
      bestDeal: 'Best Deal',
      worstDeal: 'Worst Deal',
      
      // Retailers
      amazon: 'Amazon',
      walmart: 'Walmart',
      ebay: 'eBay',
      temu: 'Temu',
      shopee: 'Shopee',
      aliexpress: 'AliExpress',
      kabum: 'KaBuM!',
      terabyteShop: 'Terabyte Shop',
      magazineLuiza: 'Magazine Luiza',
      submarino: 'Submarino',
      
      // Filters
      filters: 'Filters',
      price: 'Price',
      brand: 'Brand',
      rating: 'Rating',
      category: 'Category',
      condition: 'Condition',
      new: 'New',
      used: 'Used',
      refurbished: 'Refurbished',
      sortBy: 'Sort by',
      priceAsc: 'Price: Low to High',
      priceDesc: 'Price: High to Low',
      popularity: 'Popularity',
      newestFirst: 'Newest First',
      bestRating: 'Best Rating',
      
      // Notifications
      notifications: 'Notifications',
      priceDropAlert: 'Price Drop Alert',
      backInStock: 'Back in Stock',
      newDeals: 'New Deals',
      weeklyDigest: 'Weekly Digest',
      
      // Profile
      account: 'Account',
      settings: 'Settings',
      language: 'Language',
      currency: 'Currency',
      notifications_settings: 'Notification Settings',
      privacy: 'Privacy',
      terms: 'Terms of Service',
      about: 'About',
      version: 'Version',
      
      // Errors
      networkError: 'Network error. Please check your connection.',
      serverError: 'Server error. Please try again later.',
      notFound: 'Product not found.',
      invalidEmail: 'Please enter a valid email address.',
      passwordTooShort: 'Password must be at least 6 characters.',
      passwordsDontMatch: 'Passwords do not match.',
      
      // Success Messages
      loginSuccess: 'Login successful!',
      accountCreated: 'Account created successfully!',
      productAdded: 'Product added to favorites!',
      productRemoved: 'Product removed from favorites!',
      alertSet: 'Price alert set successfully!',
      
      // Empty States
      noProducts: 'No products found.',
      noFavorites: 'No favorite products yet.',
      noComparisons: 'No products to compare.',
      noNotifications: 'No new notifications.',
      
      // Voice Search
      listeningPrompt: 'Listening... Say the product name',
      voiceSearchError: 'Voice search not available.',
      speakNow: 'Speak now',
      
      // Image Search
      imageSearchPrompt: 'Take a photo or select from gallery',
      analyzing: 'Analyzing image...',
      imageSearchError: 'Could not analyze image.',
      
      // Charts and Analytics
      priceChart: 'Price Chart',
      last7Days: 'Last 7 Days',
      last30Days: 'Last 30 Days',
      last90Days: 'Last 90 Days',
      priceDrops: 'Price Drops',
      priceIncreases: 'Price Increases',
      
      // Units
      currency_symbol: '$',
      days: 'days',
      hours: 'hours',
      minutes: 'minutes',
      
      // Categories
      electronics: 'Electronics',
      clothing: 'Clothing',
      homeGarden: 'Home & Garden',
      sports: 'Sports',
      books: 'Books',
      toys: 'Toys',
      automotive: 'Automotive',
      health: 'Health & Beauty',
    }
  },
  pt: {
    translation: {
      // Navigation
      home: 'Início',
      compare: 'Comparar',
      favorites: 'Favoritos',
      profile: 'Perfil',
      
      // Common
      search: 'Buscar',
      loading: 'Carregando...',
      error: 'Erro',
      retry: 'Tentar novamente',
      cancel: 'Cancelar',
      save: 'Salvar',
      delete: 'Excluir',
      edit: 'Editar',
      add: 'Adicionar',
      remove: 'Remover',
      back: 'Voltar',
      next: 'Próximo',
      done: 'Concluído',
      
      // Authentication
      login: 'Entrar',
      register: 'Cadastrar',
      logout: 'Sair',
      email: 'E-mail',
      password: 'Senha',
      confirmPassword: 'Confirmar Senha',
      forgotPassword: 'Esqueceu a senha?',
      loginWithGoogle: 'Entrar com Google',
      loginWithApple: 'Entrar com Apple',
      createAccount: 'Criar Conta',
      alreadyHaveAccount: 'Já tem uma conta?',
      dontHaveAccount: 'Não tem uma conta?',
      
      // Product Search
      searchProducts: 'Buscar Produtos',
      voiceSearch: 'Busca por Voz',
      imageSearch: 'Busca por Imagem',
      scanProduct: 'Escanear Produto',
      searchByCategory: 'Buscar por Categoria',
      recentSearches: 'Buscas Recentes',
      popularProducts: 'Produtos Populares',
      featuredDeals: 'Ofertas em Destaque',
      
      // Product Details
      productDetails: 'Detalhes do Produto',
      specifications: 'Especificações',
      reviews: 'Avaliações',
      priceHistory: 'Histórico de Preços',
      priceAlert: 'Alerta de Preço',
      addToFavorites: 'Adicionar aos Favoritos',
      removeFromFavorites: 'Remover dos Favoritos',
      shareProduct: 'Compartilhar Produto',
      currentPrice: 'Preço Atual',
      lowestPrice: 'Menor Preço',
      highestPrice: 'Maior Preço',
      averagePrice: 'Preço Médio',
      availability: 'Disponibilidade',
      inStock: 'Em Estoque',
      outOfStock: 'Fora de Estoque',
      limitedStock: 'Estoque Limitado',
      
      // Price Comparison
      compareProducts: 'Comparar Produtos',
      priceComparison: 'Comparação de Preços',
      stores: 'Lojas',
      shipping: 'Frete',
      delivery: 'Entrega',
      totalPrice: 'Preço Total',
      savings: 'Economia',
      bestDeal: 'Melhor Oferta',
      worstDeal: 'Pior Oferta',
      
      // Retailers
      amazon: 'Amazon',
      walmart: 'Walmart',
      ebay: 'eBay',
      temu: 'Temu',
      shopee: 'Shopee',
      aliexpress: 'AliExpress',
      kabum: 'KaBuM!',
      terabyteShop: 'Terabyte Shop',
      magazineLuiza: 'Magazine Luiza',
      submarino: 'Submarino',
      
      // Filters
      filters: 'Filtros',
      price: 'Preço',
      brand: 'Marca',
      rating: 'Avaliação',
      category: 'Categoria',
      condition: 'Condição',
      new: 'Novo',
      used: 'Usado',
      refurbished: 'Recondicionado',
      sortBy: 'Ordenar por',
      priceAsc: 'Preço: Menor para Maior',
      priceDesc: 'Preço: Maior para Menor',
      popularity: 'Popularidade',
      newestFirst: 'Mais Recentes',
      bestRating: 'Melhor Avaliação',
      
      // Notifications
      notifications: 'Notificações',
      priceDropAlert: 'Alerta de Queda de Preço',
      backInStock: 'De Volta ao Estoque',
      newDeals: 'Novas Ofertas',
      weeklyDigest: 'Resumo Semanal',
      
      // Profile
      account: 'Conta',
      settings: 'Configurações',
      language: 'Idioma',
      currency: 'Moeda',
      notifications_settings: 'Configurações de Notificação',
      privacy: 'Privacidade',
      terms: 'Termos de Serviço',
      about: 'Sobre',
      version: 'Versão',
      
      // Errors
      networkError: 'Erro de rede. Verifique sua conexão.',
      serverError: 'Erro do servidor. Tente novamente mais tarde.',
      notFound: 'Produto não encontrado.',
      invalidEmail: 'Digite um endereço de e-mail válido.',
      passwordTooShort: 'A senha deve ter pelo menos 6 caracteres.',
      passwordsDontMatch: 'As senhas não coincidem.',
      
      // Success Messages
      loginSuccess: 'Login realizado com sucesso!',
      accountCreated: 'Conta criada com sucesso!',
      productAdded: 'Produto adicionado aos favoritos!',
      productRemoved: 'Produto removido dos favoritos!',
      alertSet: 'Alerta de preço configurado com sucesso!',
      
      // Empty States
      noProducts: 'Nenhum produto encontrado.',
      noFavorites: 'Nenhum produto favorito ainda.',
      noComparisons: 'Nenhum produto para comparar.',
      noNotifications: 'Nenhuma notificação nova.',
      
      // Voice Search
      listeningPrompt: 'Ouvindo... Diga o nome do produto',
      voiceSearchError: 'Busca por voz não disponível.',
      speakNow: 'Fale agora',
      
      // Image Search
      imageSearchPrompt: 'Tire uma foto ou selecione da galeria',
      analyzing: 'Analisando imagem...',
      imageSearchError: 'Não foi possível analisar a imagem.',
      
      // Charts and Analytics
      priceChart: 'Gráfico de Preços',
      last7Days: 'Últimos 7 Dias',
      last30Days: 'Últimos 30 Dias',
      last90Days: 'Últimos 90 Dias',
      priceDrops: 'Quedas de Preço',
      priceIncreases: 'Aumentos de Preço',
      
      // Units
      currency_symbol: 'R$',
      days: 'dias',
      hours: 'horas',
      minutes: 'minutos',
      
      // Categories
      electronics: 'Eletrônicos',
      clothing: 'Roupas',
      homeGarden: 'Casa e Jardim',
      sports: 'Esportes',
      books: 'Livros',
      toys: 'Brinquedos',
      automotive: 'Automotivo',
      health: 'Saúde e Beleza',
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: Localization.locale.split('-')[0] || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;