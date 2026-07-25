export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", "All"];

export const initialRequests = [
  { 
    id: 1, 
    hospital: "St. Jude Medical Center", 
    authorName: "Dr. Sarah Jenkins",
    description: "Urgent need for A+ blood for a patient undergoing major cardiovascular surgery. Please donate if you are in the vicinity.",
    bloodGroup: "A+", 
    unitsFulfilled: 7, 
    unitsRequired: 10, 
    distance: 2.4, 
    urgent: true, 
    date: "2026-07-25T10:00:00Z",
    deadline: "2026-07-27T10:00:00Z",
    applicants: 12,
    status: 'open'
  },
  { 
    id: 2, 
    hospital: "Metropolitan Clinic", 
    authorName: "Nurse Michael Chen",
    description: "Critical shortage of O- blood for trauma patients. O- is the universal donor type and we are completely out.",
    bloodGroup: "O-", 
    unitsFulfilled: 2, 
    unitsRequired: 12, 
    distance: 4.8, 
    urgent: true, 
    date: "2026-07-24T14:30:00Z",
    deadline: "2026-07-26T18:00:00Z",
    applicants: 4,
    status: 'open'
  },
  { 
    id: 3, 
    hospital: "City Red Cross", 
    authorName: "Admin David Rodriguez",
    description: "Routine blood drive collection. Looking for B+ donors to replenish our local blood banks for the upcoming holiday season.",
    bloodGroup: "B+", 
    unitsFulfilled: 15, 
    unitsRequired: 20, 
    distance: 1.2, 
    urgent: false, 
    date: "2026-07-26T08:15:00Z",
    deadline: "2026-08-01T00:00:00Z",
    applicants: 18,
    status: 'open'
  },
  { 
    id: 4, 
    hospital: "Mercy General Hospital", 
    authorName: "Dr. Emily White",
    description: "Rare AB- blood needed for a pediatric patient with sickle cell anemia.",
    bloodGroup: "AB-", 
    unitsFulfilled: 1, 
    unitsRequired: 5, 
    distance: 8.5, 
    urgent: true, 
    date: "2026-07-22T09:00:00Z",
    deadline: "2026-07-25T00:00:00Z",
    applicants: 2,
    status: 'completed'
  },
  { 
    id: 5, 
    hospital: "Westside Trauma Center", 
    authorName: "Nurse James Wilson",
    description: "O+ blood required for a patient scheduled for an organ transplant next week.",
    bloodGroup: "O+", 
    unitsFulfilled: 8, 
    unitsRequired: 8, 
    distance: 3.1, 
    urgent: false, 
    date: "2026-07-20T11:45:00Z",
    deadline: "2026-07-30T00:00:00Z",
    applicants: 9,
    status: 'completed'
  },
  { 
    id: 6, 
    hospital: "East End Clinic", 
    authorName: "Dr. Linda Martinez",
    description: "A- blood urgently needed for emergency C-section patient.",
    bloodGroup: "A-", 
    unitsFulfilled: 0, 
    unitsRequired: 4, 
    distance: 12.0, 
    urgent: true, 
    date: "2026-07-25T16:20:00Z",
    deadline: "2026-07-26T20:00:00Z",
    applicants: 1,
    status: 'open'
  }
];

export const initialDonors = [
  { id: 1, name: 'Sarah Jenkins', units: 24, bloodType: 'O-' },
  { id: 2, name: 'Michael Chen', units: 18, bloodType: 'A+' },
  { id: 3, name: 'David Rodriguez', units: 15, bloodType: 'B+' },
  { id: 4, name: 'Emily White', units: 12, bloodType: 'AB-' },
  { id: 5, name: 'James Wilson', units: 10, bloodType: 'O+' }
];
