export const CLINIC = {
  name: 'CADO',
  fullName: 'CADO · Centro Avanzado de Dolor Orofacial',
  address: 'Vivar #1580, Oficina 203, Edificio Espacio Parque, Calama',
  streetAddress: 'Vivar #1580, Oficina 203, Edificio Espacio Parque',
  mapsUrl: 'https://share.google/Af4IcUf6FfpfVmbTX',
  directionsUrl: 'https://www.google.com/maps/search/?api=1&query=Vivar%201580%2C%20Calama%2C%20Chile',
  mapEmbedUrl: 'https://maps.google.com/maps?q=Vivar%201580%2C%20Calama%2C%20Chile&output=embed',
  email: 'javierbeizaayala@gmail.com',
  phones: [
    { name: 'Dr. Javier Beiza', display: '+56 9 4465 7815', number: '56944657815' },
    { name: 'Dr. Juan Cruz Mandiola', display: '+56 9 9229 5910', number: '56992295910' },
    { name: 'Dr. Óscar Albanés Hidalgo', display: '+56 9 8444 8523', number: '56984448523' },
  ],
} as const;

export function whatsappUrl(message?: string, number: string = CLINIC.phones[0].number) {
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

export const JAVIER_PROFILE = '/equipo/dr-javier-beiza';
export const TES_URL = '/agendar';
export const SAV_URL = '/agendar?step=3#sav';
