import React, { useState, useEffect, useMemo } from 'react';
import { ReservationDetails } from '../types';

interface ReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmReservation: (details: ReservationDetails) => void;
    isProcessing: boolean;
}

const getSuggestedTimes = (selectedDate: Date | null) => {
    const suggestions: string[] = ['19:00', '19:30', '20:00', '20:30', '21:00'];
    if (!selectedDate) {
        return [];
    }

    const now = new Date();
    const isToday = selectedDate.getFullYear() === now.getFullYear() &&
                    selectedDate.getMonth() === now.getMonth() &&
                    selectedDate.getDate() === now.getDate();

    if (isToday) {
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        return suggestions.filter(time => {
            const [hour, minute] = time.split(':').map(Number);
            return hour > currentHour || (hour === currentHour && minute > currentMinutes);
        });
    }

    return suggestions;
};

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const ReservationModal: React.FC<ReservationModalProps> = ({ isOpen, onClose, onConfirmReservation, isProcessing }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [numberOfPeople, setNumberOfPeople] = useState<number | ''>('');
    const [reservationTime, setReservationTime] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    
    // Calendar state
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const suggestedTimes = useMemo(() => getSuggestedTimes(selectedDate), [selectedDate]);

    useEffect(() => {
        if (isOpen) {
            setName('');
            setPhone('');
            setNumberOfPeople('');
            setReservationTime('');
            setNotes('');
            setError('');
            setSelectedDate(null);
            setCurrentDate(new Date());
        }
    }, [isOpen]);

    // Reset time when date changes
    useEffect(() => {
        setReservationTime('');
    }, [selectedDate]);


    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!selectedDate) {
            setError('Por favor, selecione uma data para a reserva.');
            return;
        }

        if (!reservationTime) {
            setError('Por favor, selecione ou digite um horário para a reserva.');
            return;
        }

        if (!numberOfPeople || numberOfPeople < 1) {
            setError('Por favor, informe a quantidade de pessoas (mínimo 1).');
            return;
        }

        const [hour, minute] = reservationTime.split(':').map(Number);
        
        if (isNaN(hour) || isNaN(minute) || hour < 19 || hour >= 22) {
             setError('Horário inválido. Aceitamos reservas entre 19:00 e 21:30.');
            return;
        }

        onConfirmReservation({
            name,
            phone,
            numberOfPeople: Number(numberOfPeople),
            reservationDate: selectedDate.toISOString().split('T')[0], // YYYY-MM-DD
            reservationTime,
            notes
        });
    };
    
    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const calendarDays = [];

        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarDays.push(<div key={`empty-start-${i}`} className="p-2 text-center"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayDate = new Date(year, month, day);
            const dayOfWeek = dayDate.getDay();
            
            const isPast = dayDate < today;
            const isInvalidDay = dayOfWeek === 1 || dayOfWeek === 2; // Monday or Tuesday
            const isDisabled = isPast || isInvalidDay;

            const isSelected = selectedDate && dayDate.getTime() === selectedDate.getTime();

            calendarDays.push(
                <button
                    type="button"
                    key={day}
                    disabled={isDisabled}
                    onClick={() => !isDisabled && setSelectedDate(dayDate)}
                    className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors
                        ${isSelected ? 'bg-accent text-white' : ''}
                        ${!isSelected && !isDisabled ? 'hover:bg-accent/20' : ''}
                        ${isDisabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700'}
                    `}
                >
                    {day}
                </button>
            );
        }

        return (
             <div className="bg-gray-50 rounded-lg border p-4">
                <div className="flex justify-between items-center mb-3">
                    <button type="button" onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="w-8 h-8 hover:bg-gray-200 rounded-full">&lt;</button>
                    <div className="font-bold text-lg">{monthNames[month]} {year}</div>
                    <button type="button" onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="w-8 h-8 hover:bg-gray-200 rounded-full">&gt;</button>
                </div>
                <div className="grid grid-cols-7 gap-1 justify-items-center mb-2">
                    {dayNames.map(d => <div key={d} className="w-10 text-center font-medium text-xs text-gray-500">{d}</div>)}
                </div>
                 <div className="grid grid-cols-7 gap-1 justify-items-center">
                    {calendarDays}
                </div>
            </div>
        );
    }
    
    const formattedSelectedDate = selectedDate 
        ? new Intl.DateTimeFormat('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(selectedDate)
        : '';


    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-text-on-light"><i className="fas fa-calendar-check mr-2"></i>Fazer uma Reserva</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                <div className="overflow-y-auto p-6">
                    <p className="text-center text-gray-600 mb-6">Reserve sua mesa e garanta uma experiência incrível na Santa Sensação. Funcionamos de Quarta a Domingo, e nossas reservas são para o período das 19h às 21h.</p>
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
                           {renderCalendar()}

                           <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1">Quantidade de Pessoas *</label>
                                    <input 
                                        type="number" 
                                        value={numberOfPeople} 
                                        onChange={e => setNumberOfPeople(e.target.value === '' ? '' : parseInt(e.target.value, 10))} 
                                        min="1" 
                                        className="w-full px-3 py-2 border rounded-md" 
                                        placeholder="Qtd." 
                                        required />
                                </div>
                                
                                {selectedDate && (
                                     <div className="p-3 bg-gray-50 rounded-md border animate-fade-in-up">
                                        <label className="block text-sm font-semibold mb-2">Horário da Reserva *</label>
                                        <div className="text-center bg-blue-50 text-blue-800 font-semibold p-2 rounded-md mb-3 text-sm capitalize">
                                            {formattedSelectedDate}
                                        </div>
                                         <div className="flex flex-wrap items-center gap-2 mb-2">
                                            {suggestedTimes.length > 0 ? (
                                                suggestedTimes.map(time => (
                                                    <button type="button" key={time} onClick={() => setReservationTime(time)} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${reservationTime === time ? 'bg-accent text-white' : 'bg-accent/20 text-accent hover:bg-accent/30'}`}>
                                                        {time}
                                                    </button>
                                                ))
                                            ) : (
                                                <p className="text-xs text-gray-500">Nenhum horário disponível para hoje.</p>
                                            )}
                                         </div>
                                        <input type="text" value={reservationTime} onChange={e => setReservationTime(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="Ou digite o horário (ex: 20:15)" required />
                                    </div>
                                )}
                           </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-1">Observações (opcional)</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 border rounded-md" rows={2} placeholder="Ex: Preferência por mesa perto da janela, etc."/>
                        </div>

                        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

                         <button 
                            type="submit" 
                            disabled={isProcessing}
                            className="w-full bg-accent text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-opacity-90 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center min-h-[52px]"
                        >
                            {isProcessing ? (
                                <><i className="fas fa-spinner fa-spin mr-2"></i> Confirmando...</>
                            ) : (
                                <><i className="fab fa-whatsapp mr-2"></i> Confirmar Reserva</>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};