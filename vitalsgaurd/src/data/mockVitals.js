export const patients = [
  {
    id: 'p1',
    name: 'Nisha G',
    age: 38,
    role: 'patient',
    vitals: [
      { time: '08:00', hr: 78, spo2: 98, temp: 36.6, bp: 120, status: 'stable' },
      { time: '10:00', hr: 82, spo2: 96, temp: 36.8, bp: 125, status: 'warning' },
      { time: '12:00', hr: 92, spo2: 94, temp: 37.4, bp: 135, status: 'critical' },
      { time: '14:00', hr: 90, spo2: 95, temp: 37.0, bp: 130, status: 'warning' }
    ],
    conditions: ['Circadian stress', 'Mild hypoxemia risk']
  },
  {
    id: 'p2',
    name: 'Arjun R',
    age: 46,
    role: 'patient',
    vitals: [
      { time: '08:00', hr: 76, spo2: 99, temp: 36.5, bp: 118, status: 'stable' },
      { time: '10:00', hr: 84, spo2: 94, temp: 37.8, bp: 128, status: 'critical' },
      { time: '12:00', hr: 88, spo2: 93, temp: 37.6, bp: 132, status: 'critical' },
      { time: '14:00', hr: 85, spo2: 96, temp: 37.8, bp: 124, status: 'warning' }
    ],
    conditions: ['ECG micro-variation signature', 'Possible early arrhythmia']
  },
  {
    id: 'p3',
    name: 'Sarah K',
    age: 29,
    role: 'patient',
    vitals: [
      { time: '08:00', hr: 72, spo2: 99, temp: 36.6, bp: 115, status: 'stable' },
      { time: '10:00', hr: 75, spo2: 98, temp: 36.7, bp: 117, status: 'stable' },
      { time: '12:00', hr: 78, spo2: 97, temp: 36.8, bp: 119, status: 'stable' }
    ],
    conditions: ['Post-op recovery']
  },
  {
    id: 'p4',
    name: 'Michael W',
    age: 62,
    role: 'patient',
    vitals: [
      { time: '08:00', hr: 88, spo2: 95, temp: 37.2, bp: 140, status: 'warning' },
      { time: '10:00', hr: 94, spo2: 92, temp: 37.5, bp: 155, status: 'critical' }
    ],
    conditions: ['Chronic hypertension', 'Diabetes Type II']
  },
  {
    id: 'p5',
    name: 'Emily D',
    age: 41,
    role: 'patient',
    vitals: [
      { time: '09:00', hr: 80, spo2: 98, temp: 37.0, bp: 122, status: 'stable' },
      { time: '11:00', hr: 82, spo2: 97, temp: 37.1, bp: 124, status: 'stable' }
    ],
    conditions: ['Asthma management']
  },
  {
    id: 'p6',
    name: 'Rahul S',
    age: 54,
    role: 'patient',
    vitals: [
      { time: '08:00', hr: 115, spo2: 91, temp: 38.2, bp: 165, status: 'critical' },
      { time: '10:00', hr: 110, spo2: 92, temp: 38.0, bp: 160, status: 'critical' }
    ],
    conditions: ['Acute Respiratory Distress']
  },
  {
    id: 'p7',
    name: 'Elena V',
    age: 67,
    role: 'patient',
    vitals: [
      { time: '09:00', hr: 68, spo2: 96, temp: 36.4, bp: 132, status: 'stable' },
      { time: '11:00', hr: 70, spo2: 95, temp: 36.5, bp: 135, status: 'warning' }
    ],
    conditions: ['Post-Coronary Care']
  },
  {
    id: 'p8',
    name: 'Kofi A',
    age: 49,
    role: 'patient',
    vitals: [
      { time: '08:00', hr: 85, spo2: 94, temp: 37.8, bp: 142, status: 'warning' },
      { time: '10:00', hr: 88, spo2: 92, temp: 38.5, bp: 148, status: 'critical' }
    ],
    conditions: ['Sepsis Protocol']
  },
  {
    id: 'p9',
    name: 'Hiroshi T',
    age: 73,
    role: 'patient',
    vitals: [
      { time: '07:00', hr: 62, spo2: 98, temp: 36.2, bp: 110, status: 'stable' },
      { time: '09:00', hr: 64, spo2: 97, temp: 36.3, bp: 112, status: 'stable' }
    ],
    conditions: ['Neuro-monitoring']
  },
  {
    id: 'p10',
    name: 'Fatima Z',
    age: 35,
    role: 'patient',
    vitals: [
      { time: '08:00', hr: 75, spo2: 99, temp: 36.8, bp: 118, status: 'stable' },
      { time: '10:00', hr: 85, spo2: 98, temp: 37.2, bp: 122, status: 'stable' }
    ],
    conditions: ['Antepartum Care']
  },
  {
    id: 'p11',
    name: 'Suresh M',
    age: 50,
    role: 'patient',
    vitals: [
      { time: '08:00', hr: 72, spo2: 98, temp: 36.6, bp: 120, status: 'stable' }
    ],
    conditions: ['Hypertension']
  },
  {
    id: 'p12',
    name: 'Lata P',
    age: 42,
    role: 'patient',
    vitals: [
      { time: '08:00', hr: 80, spo2: 96, temp: 37.0, bp: 125, status: 'stable' }
    ],
    conditions: ['Thyroid']
  },
  {
    id: 'p13',
    name: 'David O',
    age: 58,
    role: 'patient',
    vitals: [
      { time: '08:00', hr: 95, spo2: 92, temp: 38.0, bp: 150, status: 'critical' }
    ],
    conditions: ['Pneumonia']
  },
  {
    id: 'p14',
    name: 'Chen L',
    age: 31,
    role: 'patient',
    vitals: [
      { time: '08:00', hr: 68, spo2: 99, temp: 36.2, bp: 115, status: 'stable' }
    ],
    conditions: ['Anxiety Disorders']
  },
  {
    id: 'p15',
    name: 'Maria S',
    age: 45,
    role: 'patient',
    vitals: [
      { time: '08:00', hr: 82, spo2: 95, temp: 37.2, bp: 130, status: 'warning' }
    ],
    conditions: ['Gastritis']
  },
  {
    id: 'p16',
    name: 'Vikram K',
    age: 60,
    role: 'patient',
    vitals: [
      { time: '08:00', hr: 105, spo2: 90, temp: 38.8, bp: 170, status: 'critical' }
    ],
    conditions: ['Hypoglycemic Crisis']
  },
  {
    id: 'p17',
    name: 'Sofia J',
    age: 26,
    role: 'patient',
    vitals: [
      { time: '08:00', hr: 74, spo2: 98, temp: 36.7, bp: 118, status: 'stable' }
    ],
    conditions: ['Post-natal checkup']
  },
  {
    id: 'p18',
    name: 'Abhishek B',
    age: 52,
    role: 'patient',
    vitals: [
      { time: '08:00', hr: 88, spo2: 94, temp: 37.5, bp: 140, status: 'warning' }
    ],
    conditions: ['Chronic Bronchitis']
  },
  {
    id: 'p19',
    name: 'Tanya R',
    age: 39,
    role: 'patient',
    vitals: [
      { time: '08:00', hr: 76, spo2: 97, temp: 36.9, bp: 122, status: 'stable' }
    ],
    conditions: ['Routine Checkup']
  },
  {
    id: 'p20',
    name: 'Gregory H',
    age: 75,
    role: 'patient',
    vitals: [
      { time: '08:00', hr: 60, spo2: 93, temp: 35.8, bp: 105, status: 'warning' }
    ],
    conditions: ['Geriatric Monitoring']
  },
  {
    id: 'p21',
    name: 'Nandini V',
    age: 47,
    role: 'patient',
    vitals: [
      { time: '08:00', hr: 86, spo2: 95, temp: 37.3, bp: 136, status: 'warning' }
    ],
    conditions: ['Post-op respiratory watch']
  },
  {
    id: 'p22',
    name: 'Imran Q',
    age: 57,
    role: 'patient',
    vitals: [
      { time: '08:00', hr: 98, spo2: 91, temp: 38.1, bp: 152, status: 'critical' }
    ],
    conditions: ['COPD exacerbation']
  },
  {
    id: 'p23',
    name: 'Priya N',
    age: 33,
    role: 'patient',
    vitals: [
      { time: '08:00', hr: 72, spo2: 99, temp: 36.5, bp: 116, status: 'stable' }
    ],
    conditions: ['Observation only']
  },
  {
    id: 'p24',
    name: 'Oliver M',
    age: 64,
    role: 'patient',
    vitals: [
      { time: '08:00', hr: 90, spo2: 94, temp: 37.4, bp: 144, status: 'warning' }
    ],
    conditions: ['Cardiac telemetry']
  },
  {
    id: 'p25',
    name: 'Asha R',
    age: 44,
    role: 'patient',
    vitals: [
      { time: '08:00', hr: 78, spo2: 97, temp: 36.9, bp: 124, status: 'stable' }
    ],
    conditions: ['General ward follow-up']
  }
];
