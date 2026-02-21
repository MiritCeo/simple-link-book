export interface Service {
  id: string;
  name: string;
  category: string;
  duration: number; // minutes
  price: number;
  description?: string;
}

export interface Specialist {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  services: string[]; // service ids
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  specialistName: string;
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  visits: number;
  lastVisit: string;
  notes?: string;
}

export interface Salon {
  slug: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  description: string;
  accentColor?: string;
}

export const mockSalon: Salon = {
  slug: 'studio-bella',
  name: 'Studio Bella',
  address: 'ul. Kwiatowa 15, Warszawa',
  phone: '+48 500 123 456',
  hours: 'Pon-Pt 9:00-20:00, Sob 9:00-16:00',
  description: 'Profesjonalny salon fryzjerski i kosmetyczny w sercu Warszawy.',
};

export const mockServices: Service[] = [
  { id: '1', name: 'Strzyżenie damskie', category: 'Fryzjerstwo', duration: 45, price: 120, description: 'Konsultacja, mycie, strzyżenie, stylizacja' },
  { id: '2', name: 'Strzyżenie męskie', category: 'Fryzjerstwo', duration: 30, price: 70, description: 'Strzyżenie maszynką lub nożyczkami' },
  { id: '3', name: 'Koloryzacja', category: 'Fryzjerstwo', duration: 120, price: 250, description: 'Farbowanie całych włosów' },
  { id: '4', name: 'Balayage', category: 'Fryzjerstwo', duration: 180, price: 450, description: 'Naturalne rozjaśnienie z efektem sun-kissed' },
  { id: '5', name: 'Manicure hybrydowy', category: 'Paznokcie', duration: 60, price: 100, description: 'Opracowanie + lakier hybrydowy' },
  { id: '6', name: 'Pedicure', category: 'Paznokcie', duration: 75, price: 130, description: 'Pedicure klasyczny z malowaniem' },
  { id: '7', name: 'Henna brwi i rzęs', category: 'Brwi i rzęsy', duration: 30, price: 60 },
  { id: '8', name: 'Laminacja brwi', category: 'Brwi i rzęsy', duration: 45, price: 120 },
];

export const mockSpecialists: Specialist[] = [
  { id: '1', name: 'Anna Kowalska', role: 'Fryzjer stylista', services: ['1', '2', '3', '4'] },
  { id: '2', name: 'Marta Nowak', role: 'Fryzjer kolorystka', services: ['1', '3', '4'] },
  { id: '3', name: 'Karolina Wiśniewska', role: 'Stylistka paznokci', services: ['5', '6'] },
  { id: '4', name: 'Ewa Zielińska', role: 'Kosmetolog', services: ['7', '8'] },
];

export const mockAppointments: Appointment[] = [
  { id: '1', clientName: 'Joanna Majewska', clientPhone: '+48 501 234 567', serviceName: 'Strzyżenie damskie', specialistName: 'Anna Kowalska', date: '2026-02-21', time: '09:00', duration: 45, status: 'confirmed' },
  { id: '2', clientName: 'Katarzyna Wójcik', clientPhone: '+48 502 345 678', serviceName: 'Koloryzacja', specialistName: 'Marta Nowak', date: '2026-02-21', time: '10:00', duration: 120, status: 'in-progress' },
  { id: '3', clientName: 'Agnieszka Kamińska', clientPhone: '+48 503 456 789', serviceName: 'Manicure hybrydowy', specialistName: 'Karolina Wiśniewska', date: '2026-02-21', time: '11:00', duration: 60, status: 'scheduled' },
  { id: '4', clientName: 'Magdalena Lewandowska', clientPhone: '+48 504 567 890', serviceName: 'Balayage', specialistName: 'Anna Kowalska', date: '2026-02-21', time: '13:00', duration: 180, status: 'scheduled' },
  { id: '5', clientName: 'Aleksandra Dąbrowska', clientPhone: '+48 505 678 901', serviceName: 'Henna brwi i rzęs', specialistName: 'Ewa Zielińska', date: '2026-02-21', time: '14:00', duration: 30, status: 'scheduled' },
  { id: '6', clientName: 'Natalia Kozłowska', clientPhone: '+48 506 789 012', serviceName: 'Pedicure', specialistName: 'Karolina Wiśniewska', date: '2026-02-22', time: '09:00', duration: 75, status: 'scheduled' },
];

export const mockClients: Client[] = [
  { id: '1', name: 'Joanna Majewska', phone: '+48 501 234 567', email: 'joanna@example.com', visits: 12, lastVisit: '2026-02-14', notes: 'Preferuje ciepłe odcienie' },
  { id: '2', name: 'Katarzyna Wójcik', phone: '+48 502 345 678', visits: 8, lastVisit: '2026-02-10' },
  { id: '3', name: 'Agnieszka Kamińska', phone: '+48 503 456 789', email: 'agnieszka@example.com', visits: 5, lastVisit: '2026-02-07' },
  { id: '4', name: 'Magdalena Lewandowska', phone: '+48 504 567 890', visits: 3, lastVisit: '2026-01-28' },
  { id: '5', name: 'Aleksandra Dąbrowska', phone: '+48 505 678 901', email: 'ola@example.com', visits: 15, lastVisit: '2026-02-18', notes: 'Uczulenie na amoniak' },
  { id: '6', name: 'Natalia Kozłowska', phone: '+48 506 789 012', visits: 1, lastVisit: '2026-02-20' },
];

export const generateTimeSlots = (date: string): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let h = 9; h < 20; h++) {
    for (const m of ['00', '30']) {
      const time = `${h.toString().padStart(2, '0')}:${m}`;
      slots.push({ time, available: Math.random() > 0.35 });
    }
  }
  return slots;
};

export const statusLabels: Record<Appointment['status'], string> = {
  'scheduled': 'Zaplanowana',
  'confirmed': 'Potwierdzona',
  'in-progress': 'W trakcie',
  'completed': 'Zakończona',
  'cancelled': 'Anulowana',
  'no-show': 'Nieobecność',
};

export const statusColors: Record<Appointment['status'], string> = {
  'scheduled': 'bg-secondary text-secondary-foreground',
  'confirmed': 'bg-primary/10 text-primary',
  'in-progress': 'bg-warning/10 text-warning',
  'completed': 'bg-success/10 text-success',
  'cancelled': 'bg-destructive/10 text-destructive',
  'no-show': 'bg-muted text-muted-foreground',
};
