import React, { useState, useEffect } from 'react';
// FIX: The ReservationDetails interface is now imported from the central types file
// to ensure consistency and avoid duplicate type definitions.
import { ReservationDetails } from '../types';

interface ReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmReservation: (details: ReservationDetails) => void;
}

const getSuggestedTimes = () => {
    const suggestions: string[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    // Horários de reserva: 19:00, 19:30, 20:00, 20:30, 21:00
    for (let hour = 19; hour <= 21; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            // Não sugere horários que já passaram no dia atual
            if (hour > currentHour || (hour === currentHour && minute > currentMinutes)) {
                 suggestions.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
            }
        }
    }
    return suggestions;
};

export const ReservationModal: React.FC<ReservationModalProps> = ({ isOpen, onClose, onConfirmReservation }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [numberOfPeople, setNumberOfPeople] = useState(2);
    const [reservationTime, setReservationTime] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    
    const suggestedTimes = getSuggestedTimes();

    useEffect(() => {
        if (isOpen) {
            setName('');
            setPhone('');
            setNumberOfPeople(2);
            setReservationTime('');
            setNotes('');
            setError('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!reservationTime) {
            setError('Por favor, selecione ou digite um horário para a reserva.');
            return;
        }

        const [hour, minute] = reservationTime.split(':').map(Number);
        
        if (isNaN(hour) || isNaN(minute) || hour < 19 || hour > 21 || (hour === 21 && minute > 0)) {
            setError('Horário inválido. Aceitamos reservas entre 19:00 e 21:00.');
            return;
        }

        onConfirmReservation({
            name,
            phone,
            numberOfPeople,
            reservationTime,
            notes
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-calendar-check mr-2"></i>Fazer uma Reserva</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-6">
                    <p className="text-center text-gray-600 mb-6">Reserve sua mesa e garanta uma experiência incrível na Santa Sensação. Nossas reservas são para o período das 19h às 21h.</p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1">Nome Completo *</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Telefone/WhatsApp *</label>
                                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1">Quantidade de Pessoas *</label>
                                <input type="number" value={numberOfPeople} onChange={e => setNumberOfPeople(parseInt(e.target.value, 10) || 1)} min="1" className="w-full px-3 py-2 border rounded-md" required />
                            </div>
                             <div className="p-3 bg-gray-50 rounded-md border">
                                 <label className="block text-sm font-semibold mb-2">Horário da Reserva *</label>
                                 <div className="flex flex-wrap items-center gap-2 mb-2">
                                    {suggestedTimes.map(time => (
                                        <button type="button" key={time} onClick={() => setReservationTime(time)} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${reservationTime === time ? 'bg-accent text-white' : 'bg-accent/20 text-accent hover:bg-accent/30'}`}>
                                            {time}
                                        </button>
                                    ))}
                                 </div>
                                <input type="text" value={reservationTime} onChange={e => setReservationTime(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="Ou digite o horário (ex: 20:15)" required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Observações (opcional)</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 border rounded-md" rows={2} placeholder="Ex: Preferência por mesa perto da janela, etc."/>
                        </div>

                        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

                         <button 
                            type="submit" 
                            className="w-full bg-accent text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-opacity-90 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            <i className="fab fa-whatsapp mr-2"></i>
                            Confirmar Reserva
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};