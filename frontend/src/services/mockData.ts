export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", "All"];

export const initialRequests = [
  { 
    id: 1, 
    hospital: "St. Jude Medical Center", 
    address: "101 Healthcare Blvd, Metropolis",
    ward: "ICU Block B, Room 402",
    authorName: "Dr. Sarah Jenkins",
    description: "Urgent need for A+ blood for a patient undergoing major cardiovascular surgery. Please donate if you are in the vicinity.",
    contact: { phone: "+1 (555) 123-4567", secondaryPhone: "+1 (555) 123-4568", email: "urgent@stjude.org" },
    bloodGroup: "A+", 
    unitsFulfilled: 7, 
    unitsRequired: 10, 
    distance: 2.4, 
    urgent: true, 
    date: "2026-07-25T10:00:00Z",
    deadline: "2026-07-27T10:00:00Z",
    applicants: 12,
    applications: [
      { donorId: 2, status: 'completed' },
      { donorId: 3, status: 'pending' }
    ],
    status: 'open'
  },
  { 
    id: 2, 
    hospital: "Metropolitan Clinic", 
    address: "205 West Avenue, Central City",
    ward: "Emergency Dept, Bed 12",
    authorName: "Nurse Michael Chen",
    description: "Critical shortage of O- blood for trauma patients. O- is the universal donor type and we are completely out.",
    contact: { phone: "+1 (555) 987-6543", secondaryPhone: "", email: "bloodbank@metro.org" },
    bloodGroup: "O-", 
    unitsFulfilled: 2, 
    unitsRequired: 12, 
    distance: 4.8, 
    urgent: true, 
    date: "2026-07-24T14:30:00Z",
    deadline: "2026-07-26T18:00:00Z",
    applicants: 4,
    applications: [],
    status: 'open'
  },
  { 
    id: 3, 
    hospital: "City Red Cross", 
    address: "500 Donation Square, Downtown",
    ward: "Main Blood Drive Hall",
    authorName: "Admin David Rodriguez",
    description: "Routine blood drive collection. Looking for B+ donors to replenish our local blood banks for the upcoming holiday season.",
    contact: { phone: "+1 (555) 333-2222", secondaryPhone: "+1 (555) 333-2223", email: "drives@cityredcross.org" },
    bloodGroup: "B+", 
    unitsFulfilled: 15, 
    unitsRequired: 20, 
    distance: 1.2, 
    urgent: false, 
    date: "2026-07-26T08:15:00Z",
    deadline: "2026-08-01T00:00:00Z",
    applicants: 18,
    applications: [
      { donorId: 4, status: 'accepted' }
    ],
    status: 'open'
  }
];

export const initialDonors = [
  { id: 1, name: 'Sarah Jenkins', units: 24, bloodType: 'O-', age: 26, occupation: 'Software Engineer', lastDonated: '2025-11-12', medicalDocUrl: 'mock-doc.pdf', phone: '+1 (555) 111-2222' },
  { id: 2, name: 'Michael Chen', units: 18, bloodType: 'A+', age: 31, occupation: 'Teacher', lastDonated: '2026-03-05', medicalDocUrl: 'mock-doc.pdf', phone: '+1 (555) 222-3333' },
  { id: 3, name: 'David Rodriguez', units: 15, bloodType: 'B+', age: 22, occupation: 'Student', lastDonated: '2026-01-20', medicalDocUrl: 'mock-doc.pdf', phone: '+1 (555) 333-4444' },
  { id: 4, name: 'Emily White', units: 12, bloodType: 'AB-', age: 28, occupation: 'Designer', lastDonated: '2025-09-15', medicalDocUrl: 'mock-doc.pdf', phone: '+1 (555) 444-5555' },
  { id: 5, name: 'James Wilson', units: 10, bloodType: 'O+', age: 45, occupation: 'Accountant', lastDonated: '2026-04-10', medicalDocUrl: 'mock-doc.pdf', phone: '+1 (555) 555-6666' }
];
