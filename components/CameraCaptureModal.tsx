import React, { useState, useEffect, useRef } from 'react';

interface CameraCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (blob: Blob) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    useEffect(() => {
        const startStream = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } // Prioriza a câmera traseira
                });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error("Erro ao acessar a câmera: ", err);
                alert("Não foi possível acessar a câmera. Verifique as permissões no seu navegador.");
                onClose();
            }
        };

        if (isOpen) {
            setCapturedImage(null); // Reseta a imagem capturada ao abrir
            startStream();
        } else {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
            }
        }

        // Função de limpeza
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                const video = videoRef.current;
                canvasRef.current.width = video.videoWidth;
                canvasRef.current.height = video.videoHeight;
                context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                setCapturedImage(canvasRef.current.toDataURL('image/jpeg'));
            }
        }
    };

    const handleConfirmCapture = () => {
        if (canvasRef.current) {
            canvasRef.current.toBlob(blob => {
                if (blob) {
                    onCapture(blob);
                }
            }, 'image/jpeg', 0.95);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
            <div className="bg-gray-900 text-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col relative">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold"><i className="fas fa-camera mr-2"></i>Capturar Foto</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div className="p-4 flex-grow flex items-center justify-center bg-black">
                    <div className="relative w-full h-full">
                        <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-contain ${capturedImage ? 'hidden' : ''}`}></video>
                        {capturedImage && (
                             <img src={capturedImage} alt="Foto capturada" className="w-full h-full object-contain" />
                        )}
                        <canvas ref={canvasRef} className="hidden"></canvas>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-700 bg-gray-800/50 flex flex-col sm:flex-row justify-center items-center gap-4">
                    {capturedImage ? (
                        <>
                            <button onClick={() => setCapturedImage(null)} className="bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-500 w-full sm:w-auto">
                                <i className="fas fa-redo mr-2"></i>Tirar Outra
                            </button>
                            <button onClick={handleConfirmCapture} className="bg-accent text-white font-semibold py-3 px-6 rounded-lg hover:bg-opacity-90 w-full sm:w-auto">
                                <i className="fas fa-check mr-2"></i>Usar esta Foto
                            </button>
                        </>
                    ) : (
                        <button onClick={handleCapture} className="bg-blue-600 text-white font-bold py-4 px-8 rounded-full text-lg hover:bg-blue-500 flex items-center gap-3">
                            <i className="fas fa-camera-retro text-2xl"></i>
                            Capturar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
