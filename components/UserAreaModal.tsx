import React, { useState, useEffect, useMemo, useRef } from 'react';
import firebase from 'firebase/compat/app';
import { UserProfile, Order, OrderStatus, Address } from '../types';
import { db } from '../services/firebase';
import * as firebaseService from '../services/firebaseService';
import defaultProfilePic from '../assets/perfil.png';
import userAreaBackground from '../assets/fundocliente.png';
import { OrderDetailsModal } from './OrderDetailsModal';
import { ImageCropperModal } from './ImageCropperModal';

const LOCALIDADES = ['Centro', 'Olaria', 'Vila Nova', 'Moxafongo', 'Cocal', 'Funil'];

const formatTimestamp = (timestamp: any, includeTime: boolean = false): string => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    };
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    return new Intl.DateTimeFormat('pt-BR', options).format(date);
};

const AddressForm: React.FC<{
    address: Partial<Address> | null;
    onSave: (address: Address) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
    existingAddresses: Address[];
}> = ({ address, onSave, onCancel, isSaving, existingAddresses }) => {
    const getInitialLabelSelection = (label: string | undefined): 'Casa' | 'Trabalho' | 'Outro' | '' => {
        if (label === 'Casa' || label === 'Trabalho') return label;
        if (label) return 'Outro';
        return '';
    };

    const [isNoNumber, setIsNoNumber] = useState(address?.number === 'S/N');
    const [formData, setFormData] = useState<Partial<Address>>({
        label: '', localidade: 'Centro', street: '', number: '', complement: '', isFavorite: false,
        bairro: '', cep: '29640-000', city: 'Santa Leopoldina',
        ...address
    });
    const [labelSelection, setLabelSelection] = useState<'Casa' | 'Trabalho' | 'Outro' | ''>(getInitialLabelSelection(address?.label));
    
    // NOVO: Estados para controlar o campo de rótulo personalizado e a mensagem
    const [showCustomLabelField, setShowCustomLabelField] = useState(getInitialLabelSelection(address?.label) === 'Outro');
    const [customLabelMessage, setCustomLabelMessage] = useState('');

    const handleLabelButtonClick = (selection: 'Casa' | 'Trabalho' | 'Outro') => {
        setLabelSelection(selection);
        setCustomLabelMessage(''); // Limpa a mensagem ao trocar de aba

        if (selection === 'Outro') {
            setShowCustomLabelField(true);
            // Se o rótulo atual era um dos presets, limpa para o usuário digitar um novo
            if (formData.label === 'Casa' || formData.label === 'Trabalho') {
                setFormData(prev => ({ ...prev, label: '' }));
            }
            return;
        }

        // Verifica se já existe um endereço com o mesmo rótulo (ignorando o que está sendo editado)
        const alreadyExists = existingAddresses.some(
            addr => addr.label === selection && addr.id !== formData.id
        );

        if (alreadyExists) {
            setShowCustomLabelField(true);
            setCustomLabelMessage(`Você já tem um endereço '${selection}'. Digite um nome específico para este novo endereço (ex: ${selection} de Praia).`);
            // Limpa o rótulo para forçar a inserção no campo personalizado
            if (formData.label === selection) {
                setFormData(prev => ({ ...prev, label: '' }));
            }
        } else {
            setShowCustomLabelField(false);
            setFormData(prev => ({ ...prev, label: selection }));
        }
    };

    useEffect(() => {
        setIsNoNumber(formData.number === 'S/N');
    }, [formData.number]);
    
    useEffect(() => {
        if (isNoNumber) {
            setFormData(prev => ({ ...prev, number: 'S/N' }));
        } else if (formData.number === 'S/N') {
            setFormData(prev => ({ ...prev, number: '' }));
        }
    }, [isNoNumber]);
    
    useEffect(() => {
        const isOther = formData.localidade === 'Outra';
        setFormData(prev => ({
            ...prev,
            cep: isOther ? '' : '29640-000',
            city: isOther ? '' : 'Santa Leopoldina'
        }));
    }, [formData.localidade]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validação para impedir rótulos duplicados
        const trimmedLabel = formData.label?.trim() || '';
        if (!trimmedLabel) {
            setCustomLabelMessage('Por favor, defina um apelido para o endereço.');
            return;
        }
        const isDuplicateLabel = existingAddresses.some(
            addr => addr.label.trim().toLowerCase() === trimmedLabel.toLowerCase() && addr.id !== formData.id
        );
        if (isDuplicateLabel) {
            setCustomLabelMessage('Este apelido já está em uso. Por favor, escolha outro.');
            return;
        }
        
        const isOtherLocality = formData.localidade === 'Outra';
        const finalAddress: Address = {
            id: formData.id || '',
            label: trimmedLabel,
            localidade: formData.localidade || '',
            street: formData.street || '',
            number: formData.number || '',
            complement: formData.complement || '',
            bairro: isOtherLocality ? formData.bairro : '',
            isDeliveryArea: LOCALIDADES.includes(formData.localidade || ''),
            city: isOtherLocality ? formData.city || '' : 'Santa Leopoldina',
            cep: isOtherLocality ? formData.cep || '' : '29640-000',
            state: 'ES',
            isFavorite: isOtherLocality ? false : formData.isFavorite || false,
        };
        onSave(finalAddress);
    };
    
    const totalAddresses = existingAddresses.length;
    const isOnlyAddress = totalAddresses === 1 && !!address?.id;
    const isOtherLocality = formData.localidade === 'Outra';
    const isFavoriteDisabled = isOtherLocality || isOnlyAddress;
    const showLabelInput = labelSelection === 'Outro' || showCustomLabelField;

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-gray-50 mt-4 animate-fade-in-up">
            <h5 className="font-bold">{formData.id ? 'Editar Endereço' : 'Novo Endereço'}</h5>
            
            <div>
                <label className="block text-sm font-semibold mb-2">Rótulo *</label>
                <div className="flex flex-col sm:flex-row justify-start gap-3">
                    <button
                        type="button"
                        onClick={() => handleLabelButtonClick('Casa')}
                        className={`flex-1 font-bold py-2 px-4 rounded-lg transition-all border-2 flex items-center justify-center gap-2 ${labelSelection === 'Casa' ? 'bg-accent text-white border-accent' : 'bg-white text-gray-700 border-gray-300 hover:border-accent'}`}>
                        <i className="fas fa-home fa-fw"></i> Casa
                    </button>
                    <button
                        type="button"
                        onClick={() => handleLabelButtonClick('Trabalho')}
                        className={`flex-1 font-bold py-2 px-4 rounded-lg transition-all border-2 flex items-center justify-center gap-2 ${labelSelection === 'Trabalho' ? 'bg-accent text-white border-accent' : 'bg-white text-gray-700 border-gray-300 hover:border-accent'}`}>
                        <i className="fas fa-briefcase fa-fw"></i> Trabalho
                    </button>
                    <button
                        type="button"
                        onClick={() => handleLabelButtonClick('Outro')}
                        className={`flex-1 font-bold py-2 px-4 rounded-lg transition-all border-2 flex items-center justify-center gap-2 ${labelSelection === 'Outro' ? 'bg-accent text-white border-accent' : 'bg-white text-gray-700 border-gray-300 hover:border-accent'}`}>
                        <i className="fas fa-tag fa-fw"></i> Outro
                    </button>
                </div>
                {showLabelInput && (
                    <div className="mt-3 animate-fade-in-up">
                        {customLabelMessage && (
                            <div className="mb-2 p-2 bg-blue-50 text-blue-800 border border-blue-200 text-xs rounded-md">
                                {customLabelMessage}
                            </div>
                        )}
                        <input
                            type="text"
                            value={formData.label}
                            onChange={e => setFormData({ ...formData, label: e.target.value })}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="Digite um apelido para o endereço"
                            required
                        />
                    </div>
                )}
            </div>

            <div>
                <label className="block text-sm font-semibold mb-1">Localidade *</label>
                <select value={formData.localidade} onChange={e => setFormData({ ...formData, localidade: e.target.value })} className="w-full px-3 py-2 border rounded-md bg-white" required>
                    <option value="" disabled>Selecione...</option>
                    {LOCALIDADES.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                     <option value="Outra">Outra (Fora da área de entrega)</option>
                </select>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-semibold mb-1">CEP</label>
                    <input type="text" value={formData.cep} onChange={e => setFormData({ ...formData, cep: e.target.value })} className="w-full px-3 py-2 border rounded-md disabled:bg-gray-200" required disabled={!isOtherLocality} />
                </div>
                <div className="col-span-2">
                    <label className="block text-sm font-semibold mb-1">Cidade</label>
                    <input type="text" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} className="w-full px-3 py-2 border rounded-md disabled:bg-gray-200" required disabled={!isOtherLocality} />
                </div>
            </div>
            
            {isOtherLocality && (
                <div>
                    <label className="block text-sm font-semibold mb-1">Bairro *</label>
                    <input type="text" value={formData.bairro} onChange={e => setFormData({ ...formData, bairro: e.target.value })} className="w-full px-3 py-2 border rounded-md" required={isOtherLocality} />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 items-end">
                <div>
                    <label className="block text-sm font-semibold mb-1">Rua *</label>
                    <input type="text" value={formData.street} onChange={e => setFormData({ ...formData, street: e.target.value })} className="w-full px-3 py-2 border rounded-md" required />
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-1">Número *</label>
                    <input type="text" value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} className="w-full px-3 py-2 border rounded-md" required disabled={isNoNumber} />
                </div>
            </div>
            <div className="flex justify-end -mt-2">
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={isNoNumber} onChange={e => setIsNoNumber(e.target.checked)} />
                    <span>Sem número</span>
                </label>
            </div>

            <div>
                <label className="block text-sm font-semibold mb-1">Complemento (opcional)</label>
                <input type="text" value={formData.complement} onChange={e => setFormData({ ...formData, complement: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
                <label className={`flex items-center gap-2 text-sm ${isFavoriteDisabled ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer'}`}>
                    <input type="checkbox" checked={formData.isFavorite || isOnlyAddress} onChange={e => !isFavoriteDisabled && setFormData({ ...formData, isFavorite: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent disabled:opacity-50" disabled={isFavoriteDisabled} />
                    Tornar este o endereço favorito
                </label>
                 {isOtherLocality && <p className="text-xs text-red-500 mt-1">Endereços fora da área de entrega não podem ser favoritos.</p>}
            </div>
            <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Cancelar</button>
                <button type="submit" disabled={isSaving} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 flex items-center justify-center min-w-[100px] disabled:bg-opacity-70">
                    {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save mr-2"></i>Salvar</>}
                </button>
            </div>
        </form>
    );
};


interface UserProfileTabProps {
    profile: UserProfile;
    user: firebase.User;
    onLogout: () => void;
    handleResendVerification: () => Promise<void>;
    handleProfileUpdate: (e: React.FormEvent) => Promise<void>;
    name: string;
    setName: (name: string) => void;
    phone: string;
    setPhone: (phone: string) => void;
    isSaving: boolean;
    addToast: (message: string, type: 'success' | 'error') => void;
}

const UserProfileTab: React.FC<UserProfileTabProps> = ({
    profile, user, onLogout, handleResendVerification, handleProfileUpdate,
    name, setName, phone, setPhone,
    isSaving, addToast,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isPhotoUploading, setIsPhotoUploading] = useState(false);
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) {
            return;
        }
        const file = e.target.files[0];
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            addToast('A imagem é muito grande. Use uma imagem com menos de 5MB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setImageToCrop(reader.result as string);
            setIsCropperOpen(true);
        };
        reader.readAsDataURL(file);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    
    const handleCropComplete = async (croppedImageBase64: string) => {
        setIsCropperOpen(false);
        setImageToCrop(null);
        setIsPhotoUploading(true);
        try {
            await firebaseService.manageProfilePicture(croppedImageBase64);
            addToast('Foto de perfil atualizada!', 'success');
        } catch (error) {
            console.error(error);
            addToast('Erro ao atualizar a foto.', 'error');
        } finally {
            setIsPhotoUploading(false);
        }
    };


    const handleRemovePhoto = async () => {
        if (!window.confirm('Tem certeza que deseja remover sua foto de perfil?')) {
            return;
        }
        setIsPhotoUploading(true);
        try {
            await firebaseService.manageProfilePicture(null);
            addToast('Foto de perfil removida.', 'success');
        } catch (error) {
            console.error(error);
            addToast('Erro ao remover a foto.', 'error');
        } finally {
            setIsPhotoUploading(false);
        }
    };
    
    return (
    <form onSubmit={handleProfileUpdate} className="space-y-4">
         <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50 p-4 rounded-lg border">
            <div className="relative w-24 h-24 flex-shrink-0">
                <img src={profile.photoURL || defaultProfilePic} alt="Foto de perfil" className="w-24 h-24 rounded-full object-cover" />
                {isPhotoUploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <i className="fas fa-spinner fa-spin text-white text-2xl"></i>
                    </div>
                )}
            </div>
            <div className="flex-grow text-center sm:text-left">
                <h3 className="font-bold text-xl">{profile.name}</h3>
                <p className="text-gray-600 text-sm">{profile.email}</p>
                <div className="flex gap-2 mt-2 justify-center sm:justify-start">
                    <button type="button" onClick={handleUploadClick} disabled={isPhotoUploading} className="bg-blue-100 text-blue-600 font-semibold py-1 px-3 rounded-lg text-xs hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed">
                        <i className="fas fa-upload mr-1"></i>Alterar Foto
                    </button>
                    {profile.photoURL && (
                        <button type="button" onClick={handleRemovePhoto} disabled={isPhotoUploading} className="bg-gray-200 text-gray-700 font-semibold py-1 px-3 rounded-lg text-xs hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed">
                            <i className="fas fa-trash mr-1"></i>Remover
                        </button>
                    )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/jpeg, image/png, image/webp" />
            </div>
            <button type="button" onClick={onLogout} className="ml-auto bg-red-100 text-red-600 font-semibold py-2 px-3 rounded-lg text-sm hover:bg-red-200 flex-shrink-0">
               <i className="fas fa-sign-out-alt mr-2"></i>Sair
            </button>
        </div>
         {!user.emailVerified && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-4 text-sm" role="alert">
                <p className="font-bold">Verifique seu e-mail!</p>
                <p>Enviamos um link de confirmação para você. Verifique sua caixa de entrada ou spam.</p>
                <button onClick={handleResendVerification} className="font-bold underline mt-2">Reenviar e-mail</button>
            </div>
        )}
        <div>
            <label className="block text-sm font-semibold mb-1">Nome Completo</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
        </div>
         <div>
            <label className="block text-sm font-semibold mb-1">Telefone/WhatsApp</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
        </div>
         
        <div className="text-right pt-2">
             <button type="submit" disabled={isSaving || isPhotoUploading} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 flex items-center justify-center min-w-[120px] disabled:bg-opacity-70">
                {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save mr-2"></i><span>Salvar Perfil</span></>}
            </button>
        </div>
        {imageToCrop && (
            <ImageCropperModal 
                isOpen={isCropperOpen}
                onClose={() => {
                    setIsCropperOpen(false);
                    setImageToCrop(null);
                }}
                imageSrc={imageToCrop}
                onCropComplete={handleCropComplete}
            />
        )}
    </form>
)};

interface MyOrdersTabProps {
    myOrders: Order[];
    isLoadingOrders: boolean;
    onViewDetails: (orderId: string) => void;
}

const MyOrdersTab: React.FC<MyOrdersTabProps> = ({ myOrders, isLoadingOrders, onViewDetails }) => {
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);

    const currentOrders = myOrders.filter(order =>
        ['pending', 'accepted', 'reserved', 'ready', 'awaiting-payment'].includes(order.status)
    );
    const archivedOrders = myOrders.filter(order =>
        ['completed', 'cancelled', 'deleted'].includes(order.status)
    );

    const renderOrderSummaryCard = (order: Order) => {
        const isReservation = order.customer.orderType === 'local';
        const orderTypeMap = { delivery: 'Entrega', pickup: 'Retirada', local: 'Consumo no Local' };

        const CompletedStatusBanner = () => {
            if (order.status !== 'completed') return null;

            const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
            const today = new Date();
            
            orderDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            const diffTime = today.getTime() - orderDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            let message: string;
            let iconClass: string;

            if (isReservation) { // 'local'
                if (diffDays >= 3) {
                    message = "O cheirinho do forno aquecendo ainda nos lembra da sua visita. Quando quiser reviver o momento, a casa é sua! Obrigado novamente!";
                    iconClass = 'fas fa-mug-hot';
                } else {
                    message = "Você faz nossa casa ficar mais alegre. Valeu pela visita e até a próxima rodada de sabor!";
                    iconClass = 'fas fa-glass-cheers';
                }
            } else { // 'delivery' or 'pickup'
                if (diffDays >= 1) {
                    message = "Partiu mais uma pizza hoje? A próxima pizza tá a um clique!";
                    iconClass = 'fas fa-pizza-slice';
                } else { // same day
                    message = "Pedido Finalizado. Bom apetite!";
                    iconClass = 'fas fa-pizza-slice';
                }
            }

            return (
                <div className="bg-green-50 border border-green-200 text-green-800 text-sm font-semibold p-3 rounded-lg flex items-center gap-3">
                    <i className={iconClass}></i>
                    <span>{message}</span>
                </div>
            );
        };


        return (
             <div key={order.id} className="bg-white border rounded-lg p-4 flex flex-col shadow-sm">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <p className="font-bold text-lg text-text-on-light">Pedido #{order.orderNumber}</p>
                        <p className="text-xs text-gray-500">{formatTimestamp(order.createdAt, true)}</p>
                    </div>
                    {!isReservation && order.total != null && <p className="font-bold text-xl text-accent">{order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
                </div>
                <div className="text-sm space-y-1 mb-4">
                     <p><strong>Cliente:</strong> {order.customer.name}</p>
                     <p><strong>Tipo:</strong> {orderTypeMap[order.customer.orderType]}</p>
                </div>
                
                <div className="mt-2 mb-4">
                    <CompletedStatusBanner />
                    {order.status === 'cancelled' && (
                        <div className="bg-red-50 border border-red-200 text-red-800 text-sm font-semibold p-3 rounded-lg flex items-center gap-3">
                            <i className="fas fa-ban"></i>
                            <span>Pedido Cancelado</span>
                        </div>
                    )}
                </div>

                 <button onClick={() => onViewDetails(order.id)} className="mt-auto w-full bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90">
                    <i className="fas fa-receipt mr-2"></i>Ver Detalhes do Pedido
                </button>
            </div>
        );
    };

    return (
        <div>
            {isLoadingOrders ? (
                <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-3xl text-accent"></i></div>
            ) : (
                <>
                    <h3 className="text-lg font-bold text-text-on-light mb-3">Pedidos em Andamento</h3>
                    {currentOrders.length === 0 ? (
                        <p className="text-center text-gray-500 py-8 px-4 bg-gray-50 rounded-lg">Você não tem pedidos em andamento.</p>
                    ) : (
                        <div className="space-y-3">
                            {currentOrders.map(order => renderOrderSummaryCard(order))}
                        </div>
                    )}

                    <div className="mt-8 border-t pt-6">
                        <button
                            onClick={() => setIsArchiveOpen(!isArchiveOpen)}
                            className="w-full flex justify-between items-center text-left p-4 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                            aria-expanded={isArchiveOpen}
                        >
                            <span className="text-lg font-bold text-text-on-light">Histórico de Pedidos</span>
                            <i className={`fas fa-chevron-down text-gray-600 transition-transform duration-300 ${isArchiveOpen ? 'rotate-180' : ''}`}></i>
                        </button>
                        
                        {isArchiveOpen && (
                            <div className="mt-4 space-y-3 animate-fade-in-up">
                                {archivedOrders.length === 0 ? (
                                    <p className="text-center text-gray-500 py-8 px-4">Seu histórico de pedidos está vazio.</p>
                                ) : (
                                     archivedOrders.map(order => renderOrderSummaryCard(order))
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

interface MyAddressesTabProps {
    profile: UserProfile;
    isAddressFormVisible: boolean;
    setIsAddressFormVisible: (visible: boolean) => void;
    editingAddress: Partial<Address> | null;
    setEditingAddress: (address: Partial<Address> | null) => void;
    handleSaveAddress: (address: Address) => Promise<void>;
    handleDeleteAddress: (addressId: string) => Promise<void>;
    isSaving: boolean;
}

const MyAddressesTab: React.FC<MyAddressesTabProps> = ({
    profile, isAddressFormVisible, setIsAddressFormVisible, editingAddress, setEditingAddress,
    handleSaveAddress, handleDeleteAddress, isSaving
}) => (
    <div>
        {(profile.addresses || []).map(addr => (
            <div key={addr.id} className="bg-gray-50 border rounded-lg p-3 mb-3 flex justify-between items-start">
                <div>
                    <p className="font-bold flex items-center gap-2">
                        {addr.label}
                        {addr.isFavorite && <span className="text-yellow-500 text-xs font-semibold flex items-center gap-1"><i className="fas fa-star"></i>Favorito</span>}
                    </p>
                    <p className="text-sm text-gray-600">{addr.street}, {addr.number} - {addr.bairro ? `${addr.bairro}, ` : ''}{addr.localidade}</p>
                    <p className="text-sm text-gray-600">{addr.city}, {addr.cep}</p>
                    {!addr.isDeliveryArea && <p className="text-xs text-red-500 font-semibold mt-1">Fora da área de entrega</p>}
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { setEditingAddress(addr); setIsAddressFormVisible(true); }} className="bg-blue-100 text-blue-600 w-8 h-8 rounded-md hover:bg-blue-200"><i className="fas fa-edit"></i></button>
                    <button onClick={() => handleDeleteAddress(addr.id)} className="bg-red-100 text-red-600 w-8 h-8 rounded-md hover:bg-red-200"><i className="fas fa-trash"></i></button>
                </div>
            </div>
        ))}
        {!isAddressFormVisible && (
            <button onClick={() => { setEditingAddress(null); setIsAddressFormVisible(true); }} className="mt-4 w-full bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90">
                <i className="fas fa-plus mr-2"></i>Adicionar Endereço
            </button>
        )}
        {isAddressFormVisible && <AddressForm 
            address={editingAddress} 
            onSave={handleSaveAddress} 
            onCancel={() => { setIsAddressFormVisible(false); setEditingAddress(null); }} 
            isSaving={isSaving} 
            existingAddresses={profile.addresses || []}
        />}
    </div>
);

// FIX: Added the missing UserAreaModalProps interface definition.
interface UserAreaModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: firebase.User | null;
    profile: UserProfile | null;
    onLogout: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
    initialTab?: 'profile' | 'orders' | 'addresses';
    showAddAddressForm?: boolean;
}

export const UserAreaModal: React.FC<UserAreaModalProps> = ({ isOpen, onClose, user, profile, onLogout, addToast, initialTab = 'orders', showAddAddressForm = false }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [myOrders, setMyOrders] = useState<Order[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(true);
    const [activeTab, setActiveTab] = useState(initialTab);

    const [editingAddress, setEditingAddress] = useState<Partial<Address> | null>(null);
    const [isAddressFormVisible, setIsAddressFormVisible] = useState(showAddAddressForm);
    
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const selectedOrderDetails = useMemo(() => myOrders.find(o => o.id === selectedOrderId) || null, [myOrders, selectedOrderId]);

    // This effect handles the opening and closing of the modal.
    // It sets the initial tab and visibility of the address form ONLY when `isOpen` changes from false to true.
    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
            setIsAddressFormVisible(showAddAddressForm);
        } else {
            // Reset state on close
            setActiveTab('orders'); // Default tab on close/re-open
            setIsAddressFormVisible(false);
            setEditingAddress(null);
            setSelectedOrderId(null);
        }
    }, [isOpen, initialTab, showAddAddressForm]);

    // This separate effect handles syncing form data with the profile data from props.
    // It runs when the modal is open and the profile data changes, without resetting the active tab.
    useEffect(() => {
        if (isOpen && profile) {
            setName(profile.name || '');
            setPhone(profile.phone || '');
        }
    }, [isOpen, profile]);


    useEffect(() => {
        if (!isOpen || !user || !db) {
            setMyOrders([]);
            return;
        }

        if (activeTab === 'orders') {
            setIsLoadingOrders(true);
            const query = db.collection('orders').where('userId', '==', user.uid).limit(25);
            const unsubscribe = query.onSnapshot(snapshot => {
                const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
                
                fetchedOrders.sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                    return dateB - dateA;
                });

                setMyOrders(fetchedOrders);
                setIsLoadingOrders(false);
            }, error => {
                console.error("Error fetching user orders:", error);
                addToast("Erro ao buscar seus pedidos.", 'error');
                setIsLoadingOrders(false);
            });
            return () => unsubscribe();
        } else {
            setIsLoadingOrders(false);
        }
    }, [isOpen, user, addToast, activeTab]);

    if (!isOpen || !user || !profile) return null;

    const handleResendVerification = async () => {
        try {
            await user.sendEmailVerification();
            addToast('E-mail de verificação reenviado! Verifique sua caixa de entrada e spam.', 'success');
        } catch (error: any) {
            console.error("Erro ao reenviar email de verificação:", error);
            let message = 'Erro ao reenviar e-mail. Tente mais tarde.';
            if (error.code === 'auth/too-many-requests') {
                message = 'Você solicitou o reenvio muitas vezes. Por favor, aguarde um pouco antes de tentar novamente.';
            }
            addToast(message, 'error');
        }
    };
    
    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await firebaseService.updateUserProfile(user.uid, { name, phone });
            addToast('Seu perfil foi salvo!', 'success');
        } catch (error) {
            addToast('Erro ao salvar seu perfil.', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleSaveAddress = async (address: Address) => {
        setIsSaving(true);
        try {
            if (address.id) {
                await firebaseService.updateAddress(user.uid, address);
                addToast('Endereço atualizado!', 'success');
            } else {
                await firebaseService.addAddress(user.uid, address);
                addToast('Endereço adicionado!', 'success');
            }
            setIsAddressFormVisible(false);
            setEditingAddress(null);
        } catch (error) {
            addToast('Erro ao salvar endereço.', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteAddress = async (addressId: string) => {
        if (window.confirm('Tem certeza que deseja excluir este endereço?')) {
            try {
                await firebaseService.deleteAddress(user.uid, addressId);
                addToast('Endereço excluído.', 'success');
            } catch (error) {
                addToast('Erro ao excluir endereço.', 'error');
            }
        }
    };

    return (
        <>
            <div
                className="fixed inset-0 bg-cover bg-center z-50 animate-fade-in-up"
                style={{ backgroundImage: `url(${userAreaBackground})` }}
            >
                <div className="w-full h-full flex flex-col">
                    <header className="sticky top-0 bg-brand-green-700 z-10 flex-shrink-0 shadow-md">
                        <div className="max-w-4xl mx-auto flex justify-between items-center p-4">
                            <h2 className="text-xl sm:text-2xl font-bold text-text-on-dark flex items-center gap-3">
                                <i className="fas fa-user-circle"></i>
                                <span>Área do Cliente</span>
                            </h2>
                            <button onClick={onClose} className="text-text-on-dark font-semibold py-2 px-3 rounded-lg hover:bg-brand-olive-600 transition-colors flex items-center gap-2">
                                <i className="fas fa-arrow-left"></i>
                                <span className="hidden sm:inline">Voltar</span>
                            </button>
                        </div>
                    </header>

                    <div className="flex-grow overflow-y-auto">
                        <div className="max-w-4xl mx-auto p-4 sm:p-6 my-4 sm:my-6 bg-brand-ivory-50/90 backdrop-blur-sm rounded-xl shadow-lg">
                            <div className="border-b mb-6">
                                <nav className="flex -mb-px space-x-4">
                                    <button onClick={() => setActiveTab('profile')} className={`py-2 px-3 font-semibold text-sm transition-colors ${activeTab === 'profile' ? 'border-b-2 border-accent text-accent' : 'text-gray-500 hover:text-gray-800'}`}>Perfil</button>
                                    <button onClick={() => setActiveTab('orders')} className={`py-2 px-3 font-semibold text-sm transition-colors ${activeTab === 'orders' ? 'border-b-2 border-accent text-accent' : 'text-gray-500 hover:text-gray-800'}`}>Meus Pedidos</button>
                                    <button onClick={() => setActiveTab('addresses')} className={`py-2 px-3 font-semibold text-sm transition-colors ${activeTab === 'addresses' ? 'border-b-2 border-accent text-accent' : 'text-gray-500 hover:text-gray-800'}`}>Meus Endereços</button>
                                </nav>
                            </div>
                            {activeTab === 'profile' && (
                                <UserProfileTab
                                    profile={profile}
                                    user={user}
                                    onLogout={onLogout}
                                    addToast={addToast}
                                    handleResendVerification={handleResendVerification}
                                    handleProfileUpdate={handleProfileUpdate}
                                    name={name}
                                    setName={setName}
                                    phone={phone}
                                    setPhone={setPhone}
                                    isSaving={isSaving}
                                />
                            )}
                            {activeTab === 'orders' && <MyOrdersTab myOrders={myOrders} isLoadingOrders={isLoadingOrders} onViewDetails={setSelectedOrderId} />}
                            {activeTab === 'addresses' && (
                                <MyAddressesTab
                                    profile={profile}
                                    isAddressFormVisible={isAddressFormVisible}
                                    setIsAddressFormVisible={setIsAddressFormVisible}
                                    editingAddress={editingAddress}
                                    setEditingAddress={setEditingAddress}
                                    handleSaveAddress={handleSaveAddress}
                                    handleDeleteAddress={handleDeleteAddress}
                                    isSaving={isSaving}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <OrderDetailsModal order={selectedOrderDetails} onClose={() => setSelectedOrderId(null)} />
        </>
    );
};