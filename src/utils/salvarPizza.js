import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { firebaseDB } from '../config/services.js'

/**

Salva pizza com imagem no Firestore

@param {string} nome - Nome da pizza

@param {string} descricao - Descrição

@param {number} preco - Preço

@param {string} imagemUrl - URL da imagem (do Supabase)

@returns {Promise<string>} - ID do documento criado
*/
export async function salvarPizza(nome, descricao, preco, imagemUrl) {
try {
if (!nome || !preco || !imagemUrl) {
throw new Error('Nome, preço e imagem são obrigatórios')
}

// Referência da coleção
const pizzasRef = collection(firebaseDB, 'pizzas')

// Documento a inserir
const novaPizza = {
nome: nome,
descricao: descricao || '',
preco: parseFloat(preco),
imagemUrl: imagemUrl, // URL pública do Supabase
criadoEm: serverTimestamp(),
ativo: true
}

// Adiciona ao Firestore
const docRef = await addDoc(pizzasRef, novaPizza)

console.log('✅ Pizza salva com ID:', docRef.id)
return docRef.id

} catch (erro) {
console.error('❌ Erro ao salvar pizza:', erro)
throw erro
}
}

/**

Busca todas as pizzas

@returns {Promise<Array>}
*/
export async function buscarPizzas() {
try {
const pizzasRef = collection(firebaseDB, 'pizzas')
const { getDocs } = await import('firebase/firestore')
const snapshot = await getDocs(pizzasRef)

const pizzas = []
snapshot.forEach((doc) => {
pizzas.push({
id: doc.id,
...doc.data()
})
})

return pizzas

} catch (erro) {
console.error('❌ Erro ao buscar pizzas:', erro)
throw erro
}
}