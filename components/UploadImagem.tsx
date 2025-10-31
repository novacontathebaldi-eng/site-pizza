import React, { useState, ChangeEvent } from 'react';
import { uploadImagem } from '@/src/utils/uploadImagem.js';

export function UploadImagem() {
    const [status, setStatus] = useState('');
    const [url, setUrl] = useState('');
    const [preview, setPreview] = useState('');
    const [loading, setLoading] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const arquivo = e.target.files?.[0];
        if (!arquivo) return;

        try {
            setLoading(true);
            setStatus('⏳ Enviando imagem...');
            setUrl('');
            setPreview('');
            setCopySuccess(false);

            // Create a temporary URL for instant preview
            const objectUrl = URL.createObjectURL(arquivo);
            setPreview(objectUrl);

            const novaUrl = await uploadImagem(arquivo);

            // It's good practice to revoke the object URL after use
            URL.revokeObjectURL(objectUrl);
            setUrl(novaUrl);
            setPreview(novaUrl); // Now set the permanent URL as preview
            setStatus('✅ Upload concluído com sucesso!');
        } catch (erro: any) {
            setStatus(`❌ Erro: ${erro.message}`);
            setPreview(''); // Clear preview on error
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!url) return;
        navigator.clipboard.writeText(url).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    return (
        <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="font-semibold text-lg mb-2">📸 Upload de Imagem</h4>
            <p className="text-gray-600 mb-3 text-sm">
                Envie uma imagem para o nosso armazenamento e use a URL gerada para cadastrar produtos ou personalizar o site.
            </p>

            <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed rounded-lg">
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    disabled={loading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30 disabled:opacity-50"
                />

                {loading && (
                    <div className="flex items-center gap-2 text-gray-600">
                        <i className="fas fa-spinner fa-spin"></i>
                        <span>{status}</span>
                    </div>
                )}

                {!loading && status && (
                    <p className={`text-sm font-semibold ${status.startsWith('❌') ? 'text-red-600' : 'text-green-600'}`}>{status}</p>
                )}
            </div>

            {preview && !loading && (
                <div className="mt-4">
                    <p className="font-semibold text-sm mb-2">Prévia:</p>
                    <img src={preview} alt="Prévia da imagem enviada" className="max-w-xs w-full rounded-lg shadow-md mx-auto" />
                </div>
            )}

            {url && !loading && (
                <div className="mt-4 space-y-2">
                     <p className="font-semibold text-sm">URL Pública:</p>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={url} 
                            readOnly 
                            className="w-full bg-gray-100 p-2 pr-10 border rounded-md text-sm text-blue-700"
                        />
                         <button onClick={handleCopy} title="Copiar URL" className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-500 hover:text-gray-800">
                             <i className={`fas ${copySuccess ? 'fa-check text-green-500' : 'fa-copy'}`}></i>
                         </button>
                    </div>
                     <p className="text-xs text-gray-500">Clique no ícone para copiar a URL.</p>
                </div>
            )}
        </div>
    );
}