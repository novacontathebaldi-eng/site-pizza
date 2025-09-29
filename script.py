# Criar arquivo JSON com estrutura Firestore atualizada
import json

# Firestore rules atualizada para incluir coleções do menu
firestore_rules = """rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Coleção de usuários do portfólio (clientes da pizzaria)
    match /portfolio_users/{userId} {
      allow read, write: if true; // Temporário para desenvolvimento
    }
    
    // Coleção de configurações administrativas
    match /admin_settings/{document} {
      allow read, write: if true; // Temporário para desenvolvimento  
    }
    
    // Coleção de logs do sistema
    match /system_logs/{logId} {
      allow create: if true;
      allow read: if true; // Temporário para desenvolvimento
    }
    
    // Coleção de categorias do menu - NOVA
    match /menu_categories/{categoryId} {
      allow read: if true; // Público pode ler categorias
      allow write: if true; // Temporário - deve ser restrito a admin
    }
    
    // Coleção de itens do menu - NOVA  
    match /menu_items/{itemId} {
      allow read: if true; // Público pode ler itens do menu
      allow write: if true; // Temporário - deve ser restrito a admin
    }
    
    // Bloquear acesso a todas as outras coleções
    match /{document=**} {
      allow read, write: if false;
    }
  }
}"""

# Dados de exemplo para popular o Firestore
firestore_seed_data = {
    "menu_categories": {
        "pizzas-salgadas": {
            "name": "Pizzas Salgadas",
            "description": "Nossas deliciosas pizzas salgadas tradicionais",
            "order": 1,
            "active": True,
            "createdAt": "2024-01-01T00:00:00Z",
            "updatedAt": "2024-01-01T00:00:00Z"
        },
        "pizzas-doces": {
            "name": "Pizzas Doces", 
            "description": "Pizzas doces irresistíveis para sobremesa",
            "order": 2,
            "active": True,
            "createdAt": "2024-01-01T00:00:00Z",
            "updatedAt": "2024-01-01T00:00:00Z"
        },
        "bebidas": {
            "name": "Bebidas",
            "description": "Bebidas refrescantes para acompanhar sua pizza", 
            "order": 3,
            "active": True,
            "createdAt": "2024-01-01T00:00:00Z",
            "updatedAt": "2024-01-01T00:00:00Z"
        }
    },
    
    "menu_items": {
        "margherita": {
            "name": "Pizza Margherita",
            "description": "Molho de tomate, mozzarella, manjericão fresco e azeite de oliva",
            "categoryId": "pizzas-salgadas",
            "prices": {
                "pequena": 35.00,
                "media": 42.00, 
                "grande": 48.00
            },
            "imageUrl": "assets/pizza1.webp",
            "isAvailable": True,
            "displayOrder": 1,
            "extras": [
                {"name": "Borda Catupiry", "price": 5.00},
                {"name": "Azeitonas", "price": 3.00},
                {"name": "Orégano Extra", "price": 1.00}
            ],
            "createdAt": "2024-01-01T00:00:00Z",
            "updatedAt": "2024-01-01T00:00:00Z"
        },
        
        "calabresa": {
            "name": "Pizza Calabresa",
            "description": "Molho de tomate, calabresa fatiada, cebola roxa e azeitonas pretas",
            "categoryId": "pizzas-salgadas",
            "prices": {
                "pequena": 38.00,
                "media": 45.00,
                "grande": 52.00
            },
            "imageUrl": "assets/pizza2.webp", 
            "isAvailable": True,
            "displayOrder": 2,
            "extras": [
                {"name": "Borda Catupiry", "price": 5.00},
                {"name": "Cebola Extra", "price": 2.00},
                {"name": "Pimenta", "price": 1.50}
            ],
            "createdAt": "2024-01-01T00:00:00Z",
            "updatedAt": "2024-01-01T00:00:00Z"
        },
        
        "portuguesa": {
            "name": "Pizza Portuguesa",
            "description": "Molho de tomate, presunto, ovos, ervilha, cebola e azeitonas",
            "categoryId": "pizzas-salgadas",
            "prices": {
                "pequena": 42.00,
                "media": 49.00,
                "grande": 56.00
            },
            "imageUrl": "assets/pizza3.webp",
            "isAvailable": True,
            "displayOrder": 3,
            "extras": [
                {"name": "Borda Catupiry", "price": 5.00},
                {"name": "Ovo Extra", "price": 3.00},
                {"name": "Presunto Extra", "price": 4.00}
            ],
            "createdAt": "2024-01-01T00:00:00Z",
            "updatedAt": "2024-01-01T00:00:00Z"
        },
        
        "quatro-queijos": {
            "name": "Pizza Quatro Queijos",
            "description": "Molho branco, mozzarella, gorgonzola, parmesão e catupiry",
            "categoryId": "pizzas-salgadas",
            "prices": {
                "pequena": 45.00,
                "media": 52.00,
                "grande": 58.00
            },
            "imageUrl": "assets/pizza4.webp",
            "isAvailable": True, 
            "displayOrder": 4,
            "extras": [
                {"name": "Queijo Extra", "price": 6.00},
                {"name": "Nozes", "price": 4.00},
                {"name": "Mel", "price": 2.50}
            ],
            "createdAt": "2024-01-01T00:00:00Z",
            "updatedAt": "2024-01-01T00:00:00Z"
        },
        
        "chocolate": {
            "name": "Pizza de Chocolate",
            "description": "Massa doce, chocolate ao leite, morangos frescos e açúcar de confeiteiro",
            "categoryId": "pizzas-doces",
            "prices": {
                "pequena": 32.00,
                "media": 38.00,
                "grande": 45.00  
            },
            "imageUrl": "assets/pizza5.webp",
            "isAvailable": True,
            "displayOrder": 1,
            "extras": [
                {"name": "Chocolate Extra", "price": 4.00},
                {"name": "Morango Extra", "price": 3.00},
                {"name": "Leite Condensado", "price": 2.00}
            ],
            "createdAt": "2024-01-01T00:00:00Z",
            "updatedAt": "2024-01-01T00:00:00Z"
        },
        
        "coca-cola-2l": {
            "name": "Coca-Cola 2L",
            "description": "Refrigerante Coca-Cola 2 litros gelado",
            "categoryId": "bebidas", 
            "prices": {
                "unica": 8.00
            },
            "imageUrl": "assets/coca-cola.webp",
            "isAvailable": True,
            "displayOrder": 1,
            "extras": [],
            "createdAt": "2024-01-01T00:00:00Z",
            "updatedAt": "2024-01-01T00:00:00Z"
        },
        
        "guarana-2l": {
            "name": "Guaraná Antarctica 2L", 
            "description": "Refrigerante Guaraná Antarctica 2 litros gelado",
            "categoryId": "bebidas",
            "prices": {
                "unica": 8.00
            },
            "imageUrl": "assets/guarana.webp",
            "isAvailable": True,
            "displayOrder": 2,
            "extras": [],
            "createdAt": "2024-01-01T00:00:00Z",
            "updatedAt": "2024-01-01T00:00:00Z"
        }
    }
}

# Salvar arquivos
with open('firestore-rules-updated.txt', 'w', encoding='utf-8') as f:
    f.write(firestore_rules)

with open('firestore-seed-data.json', 'w', encoding='utf-8') as f:
    json.dump(firestore_seed_data, f, ensure_ascii=False, indent=2)

# Criar também um guia de implementação
implementation_guide = """
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
"""

with open('guia-implementacao.md', 'w', encoding='utf-8') as f:
    f.write(implementation_guide)

print("Arquivos de configuração criados com sucesso:")
print("1. firestore-rules-updated.txt - Regras atualizadas do Firestore")
print("2. firestore-seed-data.json - Dados de exemplo para popular o banco")  
print("3. guia-implementacao.md - Guia completo de implementação")
print("\n✅ Estrutura pronta para implementação!")