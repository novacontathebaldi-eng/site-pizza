import React from 'react';
import ReactDOM from 'react-dom';

interface ImagePreloaderProps {
    imageUrls: string[];
}

export const ImagePreloader: React.FC<ImagePreloaderProps> = ({ imageUrls }) => {
    return ReactDOM.createPortal(
        <>
            {imageUrls.map((url, index) => (
                <link key={index} rel="preload" as="image" href={url} />
            ))}
        </>,
        document.head
    );
};