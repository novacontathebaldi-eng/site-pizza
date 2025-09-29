
# GUIA DE IMPLEMENTAÇÃO - PIZZARIA SANTA SENSAÇÃO

## 1. CONFIGURAÇÃO DO FIREBASE

### 1.1 Firestore Rules
Atualize as regras do Firestore com o conteúdo do arquivo `firestore-rules-updated.txt`

### 1.2 Dados Iniciais
Importe os dados de exemplo do arquivo `firestore-seed-data.json` para as seguintes coleções:
- menu_categories
- menu_items

## 2. ESTRUTURA DE ARQUIVOS

```
pizzaria-santa-sensacao/
├── assets/
│   ├── logo.png
│   ├── pizza1.webp
│   ├── pizza2.webp  
│   ├── pizza3.webp
│   ├── pizza4.webp
│   ├── pizza5.webp
│   └── ambiente.webp
├── index.html (página inicial)
├── login.html (sistema de login)
├── change-password.html (primeira alteração de senha)
├── settings.html (configurações do cliente)
├── admin.html (painel administrativo + nova aba Menu)
├── cardapio.html (cardápio público + pedidos)
├── firebase-config.js (configuração Firebase)
├── firebase-utils.js (utilitários Firebase)
└── style.css (estilos)
```

## 3. NOVAS FUNCIONALIDADES

### 3.1 Sistema de Pedidos
- Carrinho de compras no cardapio.html  
- Seleção de tamanhos e sabores
- Adição de extras
- Integração com WhatsApp para finalizar pedidos

### 3.2 Admin Panel - Aba Menu
- CRUD completo para categorias
- CRUD completo para itens do menu
- Interface similar às abas existentes
- Logs de todas as ações administrativas

## 4. DADOS DA PIZZARIA

Nome: Pizzaria Santa Sensação
Slogan: A pizza nº 1 do ES 🏅
Endereço: Porfilio Furtado, 178, Centro - Santa Leopoldina, ES
WhatsApp: +5527996500341
Instagram: @santasensacao.sl
Horário: De quarta a domingo a partir das 19hs

## 5. INTEGRAÇÃO WHATSAPP

Formato da mensagem de pedido:
```
Olá, Santa Sensação! 🍕

*MEU PEDIDO:*
- 1x Pizza Margherita (Grande) - R$ 48,00
- 1x Coca-Cola 2L - R$ 8,00

*Total: R$ 56,00*

*DADOS:*
Nome: [nome cliente]
Endereço: [endereço entrega]

*Forma de entrega:* Delivery
*Observações:* [observações opcionais]
```

URL: https://wa.me/5527996500341?text=[mensagem_codificada]

## 6. PRESERVAÇÃO DA ARQUITETURA EXISTENTE

IMPORTANTE: Manter toda a lógica de:
- Sistema de autenticação atual
- Estrutura das coleções portfolio_users, admin_settings, system_logs  
- Fluxo de login e change-password
- Firebase configuration e utils
- Apenas adaptar conteúdo e adicionar novas funcionalidades

## 7. ASSETS NECESSÁRIOS

Todas as imagens foram geradas e estão disponíveis:
- Logo da pizzaria (logo.png)
- 5 fotos de pizzas (pizza1.webp até pizza5.webp)
- Foto do ambiente (ambiente.webp)

## 8. PRÓXIMOS PASSOS

1. Implementar as páginas adaptadas mantendo a base existente
2. Adicionar nova aba "Menu" no admin.html
3. Criar cardapio.html com sistema de pedidos
4. Configurar integração WhatsApp
5. Testar todo o fluxo de autenticação e pedidos
6. Deploy e testes finais
