import React, { useState, useEffect, useRef } from 'react';

interface CameraModalProps {
    onCapture: (file: File) => void;
    onClose: () => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let activeStream: MediaStream | null = null;
        
        const startCamera = async () => {
            try {
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    const stream = await navigator.mediaDevices.getUserMedia({ 
                        video: { facingMode: 'environment' } // Prioritize back camera
                    });
                    activeStream = stream;
                    setStream(stream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } else {
                    setError("Seu navegador não suporta acesso à câmera.");
                }
            } catch (err) {
                console.error("Erro ao acessar a câmera:", err);
                setError("Não foi possível acessar a câmera. Verifique as permissões do seu navegador.");
            }
        };

        startCamera();

        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current && stream) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const context = canvas.getContext('2d');
            if(context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], `capture-${new Date().getTime()}.jpg`, { type: 'image/jpeg' });
                        onCapture(file);
                    }
                }, 'image/jpeg', 0.95);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-xl font-bold text-text-on-light"><i className="fas fa-camera mr-2"></i>Capturar Imagem</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="p-4 bg-black flex justify-center items-center">
                    {error ? (
                        <div className="text-center text-white p-8">
                            <i className="fas fa-exclamation-triangle text-3xl text-red-500 mb-3"></i>
                            <p>{error}</p>
                        </div>
                    ) : (
                         <video ref={videoRef} autoPlay playsInline className="w-full max-h-[60vh] rounded-lg" />
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                </div>
                 <div className="p-4 bg-gray-50 border-t flex justify-center">
                    <button
                        onClick={handleCapture}
                        disabled={!stream || !!error}
                        className="bg-accent text-white font-bold py-3 px-8 rounded-full text-lg hover:bg-opacity-90 transition-all transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-3"
                    >
                       <i className="fas fa-camera-retro"></i>
                       Tirar Foto
                    </button>
                </div>
            </div>
        </div>
    );
};
