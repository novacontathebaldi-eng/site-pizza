import React, { useRef } from 'react';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';

interface ImageCropperModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string;
    onCropComplete: (croppedImage: string) => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ isOpen, onClose, imageSrc, onCropComplete }) => {
    const cropperRef = useRef<ReactCropperElement>(null);

    if (!isOpen) {
        return null;
    }

    const handleCrop = () => {
        const cropper = cropperRef.current?.cropper;
        if (cropper) {
            // Get cropped image as a data URL (base64)
            const croppedCanvas = cropper.getCroppedCanvas({
                width: 256,
                height: 256,
                imageSmoothingQuality: 'high',
            });
            onCropComplete(croppedCanvas.toDataURL('image/jpeg', 0.9));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-text-on-light"><i className="fas fa-crop-alt mr-2"></i>Ajustar Foto</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="p-4 bg-gray-100">
                    <Cropper
                        ref={cropperRef}
                        src={imageSrc}
                        style={{ height: 400, width: '100%' }}
                        // Cropper.js options
                        aspectRatio={1 / 1}
                        viewMode={1}
                        guides={true}
                        dragMode="move"
                        background={false}
                        autoCropArea={0.8}
                    />
                </div>
                <div className="p-4 bg-gray-50 border-t flex justify-end">
                    <button
                        onClick={handleCrop}
                        className="bg-accent text-white font-bold py-2 px-6 rounded-lg hover:bg-opacity-90 transition-all"
                    >
                        <i className="fas fa-save mr-2"></i>Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};
