import React, { useState, useEffect } from 'react';
import { Plus, Minus, User, Building, Calendar, Stethoscope, UserCheck, Mail, Download, History, CheckCircle, Settings, Save, X, Edit3 } from 'lucide-react';

const ChargeCaptureApp = () => {
  // Load data from localStorage or use defaults
  const loadFromStorage = (key, defaultValue) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error loading ${key} from storage:`, error);
      return defaultValue;
    }
  };

  const [currentUser, setCurrentUser] = useState(() => 
    loadFromStorage('charge-capture-user', { role: 'clinician', name: 'Dr. Smith' })
  );
  const [selectedHospital, setSelectedHospital] = useState(() => 
    loadFromStorage('charge-capture-selected-hospital', 'main')
  );
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('hospitals');
  
  // Today's session data - loads today's data if it exists
  const [todaysPatients, setTodaysPatients] = useState(() => {
    const savedData = loadFromStorage('charge-capture-todays-patients', {});
    const today = new Date().toISOString().split('T')[0];
    const savedDate = loadFromStorage('charge-capture-last-session-date', '');
    
    // If it's a new day, reset today's data but keep patient lists
    if (savedDate !== today) {
      const resetData = {};
      Object.keys(savedData).forEach(hospitalId => {
        resetData[hospitalId] = (savedData[hospitalId] || []).map(patient => ({
          ...patient,
          todaysCodes: [] // Reset today's codes for new day
        }));
      });
      return resetData;
    }
    
    return savedData;
  });

  // Historical data
  const [historicalData, setHistoricalData] = useState(() => 
    loadFromStorage('charge-capture-history', [
      {
        date: '2025-09-18',
        hospital: 'main',
        hospitalName: 'Main Hospital',
        user: 'Dr. Smith',
        patients: [
          { name: 'John Doe', mrn: 'MRN001', codes: ['99213', '99214'] },
          { name: 'Jane Smith', mrn: 'MRN002', codes: ['99215'] }
        ],
        totalCodes: 3,
        emailSent: true
      },
      {
        date: '2025-09-17',
        hospital: 'satellite',
        hospitalName: 'Satellite Clinic',
        user: 'Dr. Smith',
        patients: [
          { name: 'Bob Johnson', mrn: 'MRN003', codes: ['99212', '99213'] }
        ],
        totalCodes: 2,
        emailSent: true
      }
    ])
  );
  
  const [newPatient, setNewPatient] = useState({ name: '', mrn: '' });
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showEndOfDay, setShowEndOfDay] = useState(false);
  
  // Configurable data - loaded from localStorage
  const [hospitals, setHospitals] = useState(() => 
    loadFromStorage('charge-capture-hospitals', [
      { id: 'main', name: 'Main Hospital' },
      { id: 'satellite', name: 'Satellite Clinic' }
    ])
  );

  const [standardCodes, setStandardCodes] = useState(() => 
    loadFromStorage('charge-capture-codes', [
      { code: '99212', description: 'Office Visit - Level 2' },
      { code: '99213', description: 'Office Visit - Level 3' },
      { code: '99214', description: 'Office Visit - Level 4' },
      { code: '99215', description: 'Office Visit - Level 5' },
      { code: '99221', description: 'Initial Hospital Care - Level 1' },
      { code: '99222', description: 'Initial Hospital Care - Level 2' },
      { code: '99223', description: 'Initial Hospital Care - Level 3' }
    ])
  );

  // Settings forms
  const [newHospital, setNewHospital] = useState({ id: '', name: '' });
  const [newCode, setNewCode] = useState({ code: '', description: '' });
  const [editingHospital, setEditingHospital] = useState(null);
  const [editingCode, setEditingCode] = useState(null);

  // Save data to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('charge-capture-user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('charge-capture-selected-hospital', selectedHospital);
  }, [selectedHospital]);

  useEffect(() => {
    localStorage.setItem('charge-capture-todays-patients', JSON.stringify(todaysPatients));
    localStorage.setItem('charge-capture-last-session-date', currentDate);
  }, [todaysPatients, currentDate]);

  useEffect(() => {
    localStorage.setItem('charge-capture-history', JSON.stringify(historicalData));
  }, [historicalData]);

  useEffect(() => {
    localStorage.setItem('charge-capture-hospitals', JSON.stringify(hospitals));
  }, [hospitals]);

  useEffect(() => {
    localStorage.setItem('charge-capture-codes', JSON.stringify(standardCodes));
  }, [standardCodes]);

  // Initialize patient data for hospitals that don't exist yet
  useEffect(() => {
    setTodaysPatients(prev => {
      const updated = { ...prev };
      hospitals.forEach(hospital => {
        if (!updated[hospital.id]) {
          updated[hospital.id] = [];
        }
      });
      return updated;
    });
  }, [hospitals]);

  const addPatient = () => {
    if (newPatient.name && newPatient.mrn) {
      const newId = Math.max(...Object.values(todaysPatients).flat().map(p => p.id), 0) + 1;
      setTodaysPatients(prev => ({
        ...prev,
        [selectedHospital]: [
          ...prev[selectedHospital],
          { id: newId, name: newPatient.name, mrn: newPatient.mrn, codes: [], todaysCodes: [] }
        ]
      }));
      setNewPatient({ name: '', mrn: '' });
      setShowAddPatient(false);
    }
  };

  // Hospital management functions
  const addHospital = () => {
    if (newHospital.id && newHospital.name && !hospitals.find(h => h.id === newHospital.id)) {
      setHospitals(prev => [...prev, { ...newHospital }]);
      setTodaysPatients(prev => ({ ...prev, [newHospital.id]: [] }));
      setNewHospital({ id: '', name: '' });
    }
  };

  const updateHospital = (oldId, updatedHospital) => {
    setHospitals(prev => prev.map(h => h.id === oldId ? updatedHospital : h));
    if (oldId !== updatedHospital.id) {
      setTodaysPatients(prev => {
        const newPatients = { ...prev };
        newPatients[updatedHospital.id] = newPatients[oldId] || [];
        delete newPatients[oldId];
        return newPatients;
      });
      if (selectedHospital === oldId) {
        setSelectedHospital(updatedHospital.id);
      }
    }
    setEditingHospital(null);
  };

  const removeHospital = (hospitalId) => {
    if (hospitals.length > 1) {
      setHospitals(prev => prev.filter(h => h.id !== hospitalId));
      setTodaysPatients(prev => {
        const newPatients = { ...prev };
        delete newPatients[hospitalId];
        return newPatients;
      });
      if (selectedHospital === hospitalId) {
        setSelectedHospital(hospitals[0].id);
      }
    }
  };

  // Code management functions
  const addCode = () => {
    if (newCode.code && newCode.description && !standardCodes.find(c => c.code === newCode.code)) {
      setStandardCodes(prev => [...prev, { ...newCode }]);
      setNewCode({ code: '', description: '' });
    }
  };

  const updateCode = (oldCode, updatedCode) => {
    setStandardCodes(prev => prev.map(c => c.code === oldCode ? updatedCode : c));
    // Update patient codes if the code changed
    if (oldCode !== updatedCode.code) {
      setTodaysPatients(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(hospitalId => {
          updated[hospitalId] = updated[hospitalId].map(patient => ({
            ...patient,
            codes: patient.codes.map(code => code === oldCode ? updatedCode.code : code),
            todaysCodes: patient.todaysCodes.map(code => code === oldCode ? updatedCode.code : code)
          }));
        });
        return updated;
      });
    }
    setEditingCode(null);
  };

  const removeCode = (codeToRemove) => {
    setStandardCodes(prev => prev.filter(c => c.code !== codeToRemove));
    // Remove from all patient records
    setTodaysPatients(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(hospitalId => {
        updated[hospitalId] = updated[hospitalId].map(patient => ({
          ...patient,
          codes: patient.codes.filter(code => code !== codeToRemove),
          todaysCodes: patient.todaysCodes.filter(code => code !== codeToRemove)
        }));
      });
      return updated;
    });
  };

  const removePatient = (patientId) => {
    setTodaysPatients(prev => ({
      ...prev,
      [selectedHospital]: prev[selectedHospital].filter(p => p.id !== patientId)
    }));
  };

  const toggleTodaysCode = (patientId, code) => {
    setTodaysPatients(prev => ({
      ...prev,
      [selectedHospital]: prev[selectedHospital].map(patient => {
        if (patient.id === patientId) {
          const hasCode = patient.todaysCodes.includes(code);
          return {
            ...patient,
            todaysCodes: hasCode 
              ? patient.todaysCodes.filter(c => c !== code)
              : [...patient.todaysCodes, code]
          };
        }
        return patient;
      })
    }));
  };

  const generateEndOfDayReport = () => {
    const currentPatients = todaysPatients[selectedHospital] || [];
    const patientsWithCodes = currentPatients.filter(p => p.todaysCodes.length > 0);
    const totalCodes = patientsWithCodes.reduce((sum, p) => sum + p.todaysCodes.length, 0);
    
    return {
      date: currentDate,
      hospital: selectedHospital,
      hospitalName: hospitals.find(h => h.id === selectedHospital)?.name,
      user: currentUser.name,
      patients: patientsWithCodes.map(p => ({
        name: p.name,
        mrn: p.mrn,
        codes: [...p.todaysCodes]
      })),
      totalCodes,
      emailSent: false
    };
  };

  const sendEndOfDayReport = () => {
    const report = generateEndOfDayReport();
    
    // Add to historical data
    setHistoricalData(prev => [report, ...prev]);
    
    // Reset today's codes
    setTodaysPatients(prev => ({
      ...prev,
      [selectedHospital]: prev[selectedHospital].map(patient => ({
        ...patient,
        codes: [...patient.codes, ...patient.todaysCodes],
        todaysCodes: []
      }))
    }));

    setShowEndOfDay(false);
    alert(`End-of-day report sent for ${report.hospitalName} on ${currentDate}!\n\nTotal patients seen: ${report.patients.length}\nTotal codes: ${report.totalCodes}`);
  };

  const exportToCSV = (data) => {
    const csvContent = [
      'Date,Hospital,Patient Name,MRN,Codes',
      ...data.flatMap(day => 
        day.patients.map(patient => 
          `${day.date},${day.hospitalName},"${patient.name}",${patient.mrn},"${patient.codes.join(', ')}"`
        )
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `charge-capture-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const currentPatients = todaysPatients[selectedHospital] || [];
  const todaysTotalCodes = currentPatients.reduce((sum, patient) => sum + patient.todaysCodes.length, 0);
  const patientsSeenToday = currentPatients.filter(p => p.todaysCodes.length > 0).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Stethoscope className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Daily Charge Capture</h1>
                <p className="text-sm text-gray-600">Session: {currentDate}</p>
                {/* Data Management Tab */}
                {activeSettingsTab === 'data' && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Data Storage Info</h4>
                      <p className="text-sm text-blue-700 mb-3">
                        Your data is stored locally in your browser. It persists between sessions but is only accessible on this device.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="bg-white p-3 rounded">
                          <div className="font-medium">Hospitals</div>
                          <div className="text-gray-600">{hospitals.length}</div>
                        </div>
                        <div className="bg-white p-3 rounded">
                          <div className="font-medium">Codes</div>
                          <div className="text-gray-600">{standardCodes.length}</div>
                        </div>
                        <div className="bg-white p-3 rounded">
                          <div className="font-medium">History</div>
                          <div className="text-gray-600">{historicalData.length} days</div>
                        </div>
                        <div className="bg-white p-3 rounded">
                          <div className="font-medium">Patients</div>
                          <div className="text-gray-600">{Object.values(todaysPatients).flat().length}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-medium mb-4">Backup & Export</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          onClick={() => {
                            const allData = {
                              hospitals,
                              standardCodes,
                              historicalData,
                              todaysPatients,
                              currentUser,
                              exportDate: new Date().toISOString()
                            };
                            const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `charge-capture-backup-${new Date().toISOString().split('T')[0]}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          Export All Data (JSON)
                        </button>
                        <button
                          onClick={() => exportToCSV(historicalData)}
                          className="px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Export History (CSV)
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-medium mb-4">Data Management</h4>
                      <div className="space-y-3">
                        <button
                          onClick={() => {
                            if (confirm('This will clear only historical data but keep your settings and current patients. Continue?')) {
                              setHistoricalData([]);
                              alert('Historical data cleared successfully.');
                            }
                          }}
                          className="w-full px-4 py-3 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-left"
                        >
                          Clear Historical Data Only
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('This will completely reset the app to default settings. All data will be lost. Are you sure?')) {
                              localStorage.removeItem('charge-capture-user');
                              localStorage.removeItem('charge-capture-selected-hospital');
                              localStorage.removeItem('charge-capture-todays-patients');
                              localStorage.removeItem('charge-capture-history');
                              localStorage.removeItem('charge-capture-hospitals');
                              localStorage.removeItem('charge-capture-codes');
                              localStorage.removeItem('charge-capture-last-session-date');
                              alert('All data cleared. Please refresh the page.');
                            }
                          }}
                          className="w-full px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-left"
                        >
                          Reset All Data (Danger Zone)
                        </button>
                      </div>
                    </div>

                    <div className="bg-gray-50 border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Tips for Data Safety</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• Export your data regularly as backup</li>
                        <li>• Data is only stored on this browser/device</li>
                        <li>• Clearing browser data will delete all information</li>
                        <li>• For multi-device access, consider upgrading to cloud storage</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <History className="h-4 w-4" />
                <span>History</span>
              </button>
              <div className="flex items-center space-x-2">
                {currentUser.role === 'clinician' ? (
                  <UserCheck className="h-5 w-5 text-green-600" />
                ) : (
                  <User className="h-5 w-5 text-blue-600" />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {currentUser.name} ({currentUser.role})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* History View */}
        {showHistory && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Historical Charge Capture</h2>
              <button
                onClick={() => exportToCSV(historicalData)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Export CSV</span>
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {historicalData.map((day, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">{day.date}</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-700">{day.hospitalName}</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-700">{day.user}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {day.emailSent && <CheckCircle className="h-4 w-4 text-green-600" />}
                      <span className="text-sm text-gray-600">
                        {day.patients.length} patients, {day.totalCodes} codes
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {day.patients.map(p => `${p.name} (${p.codes.join(', ')})`).join(' • ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hospital Selection & Today's Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center space-x-4">
              <Building className="h-5 w-5 text-gray-600" />
              <label className="text-sm font-medium text-gray-700">Hospital/Location:</label>
              <select 
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
              >
                {hospitals.map(hospital => (
                  <option key={hospital.id} value={hospital.id}>{hospital.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{currentPatients.length}</div>
                <div className="text-xs text-gray-600">Total Patients</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{patientsSeenToday}</div>
                <div className="text-xs text-gray-600">Seen Today</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{todaysTotalCodes}</div>
                <div className="text-xs text-gray-600">Codes Added</div>
              </div>
            </div>
          </div>
        </div>

        {/* Add Patient Section */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Patient List - {hospitals.find(h => h.id === selectedHospital)?.name}</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowAddPatient(!showAddPatient)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Patient</span>
              </button>
              {todaysTotalCodes > 0 && (
                <button
                  onClick={() => setShowEndOfDay(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  <span>End of Day</span>
                </button>
              )}
            </div>
          </div>

          {showAddPatient && (
            <div className="border-t pt-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Patient Name"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient(prev => ({ ...prev, name: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="MRN"
                  value={newPatient.mrn}
                  onChange={(e) => setNewPatient(prev => ({ ...prev, mrn: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={addPatient}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Add Patient
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Patients List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="divide-y divide-gray-200">
            {currentPatients.map(patient => (
              <div key={patient.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-4">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <h3 className="font-medium text-gray-900">{patient.name}</h3>
                      <p className="text-sm text-gray-500">MRN: {patient.mrn}</p>
                      {patient.todaysCodes.length > 0 && (
                        <p className="text-sm text-green-600 font-medium">
                          ✓ {patient.todaysCodes.length} code(s) added today
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removePatient(patient.id)}
                    className="flex items-center space-x-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                    <span className="text-sm">Remove</span>
                  </button>
                </div>

                {/* Today's Procedure Codes */}
                <div className="ml-9">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Add Today's Codes:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {standardCodes.map(({ code, description }) => {
                      const isSelected = patient.todaysCodes.includes(code);
                      return (
                        <button
                          key={code}
                          onClick={() => toggleTodaysCode(patient.id, code)}
                          className={`p-3 text-left border rounded-md transition-colors ${
                            isSelected
                              ? 'bg-green-50 border-green-200 text-green-900'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="font-mono text-sm font-semibold">{code}</div>
                          <div className="text-xs mt-1">{description}</div>
                        </button>
                      );
                    })}
                  </div>

                  {patient.todaysCodes.length > 0 && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                      <h5 className="text-sm font-medium text-green-800 mb-1">Today's Codes:</h5>
                      <div className="text-sm text-green-700">
                        {patient.todaysCodes.map(code => (
                          <span key={code} className="inline-block mr-3 mb-1 font-mono">
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {currentPatients.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No patients in this location. Add patients to start today's session.
              </div>
            )}
          </div>
        </div>

        {/* End of Day Modal */}
        {showEndOfDay && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">End of Day Report - {currentDate}</h3>
              
              {(() => {
                const report = generateEndOfDayReport();
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><strong>Hospital:</strong> {report.hospitalName}</div>
                      <div><strong>Provider:</strong> {report.user}</div>
                      <div><strong>Patients Seen:</strong> {report.patients.length}</div>
                      <div><strong>Total Codes:</strong> {report.totalCodes}</div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Patients & Codes:</h4>
                      {report.patients.map((patient, index) => (
                        <div key={index} className="text-sm border-l-2 border-green-400 pl-3 mb-2">
                          <div className="font-medium">{patient.name} ({patient.mrn})</div>
                          <div className="text-gray-600">Codes: {patient.codes.join(', ')}</div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={sendEndOfDayReport}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                      >
                        Send Report & Complete Day
                      </button>
                      <button
                        onClick={() => setShowEndOfDay(false)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-xl font-semibold">System Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-gray-100 rounded-md"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Settings Tabs */}
              <div className="flex border-b">
                <button
                  onClick={() => setActiveSettingsTab('hospitals')}
                  className={`px-6 py-3 font-medium ${
                    activeSettingsTab === 'hospitals'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Hospitals & Locations
                </button>
                <button
                  onClick={() => setActiveSettingsTab('codes')}
                  className={`px-6 py-3 font-medium ${
                    activeSettingsTab === 'codes'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Procedure Codes
                </button>
                <button
                  onClick={() => setActiveSettingsTab('data')}
                  className={`px-6 py-3 font-medium ${
                    activeSettingsTab === 'data'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Data Management
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {/* Hospitals Tab */}
                {activeSettingsTab === 'hospitals' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium mb-4">Add New Hospital/Location</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                          type="text"
                          placeholder="Hospital ID (e.g., 'downtown')"
                          value={newHospital.id}
                          onChange={(e) => setNewHospital(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Hospital Name"
                          value={newHospital.name}
                          onChange={(e) => setNewHospital(prev => ({ ...prev, name: e.target.value }))}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={addHospital}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Add Hospital
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-medium mb-4">Current Hospitals</h4>
                      <div className="space-y-3">
                        {hospitals.map(hospital => (
                          <div key={hospital.id} className="flex items-center justify-between p-4 border rounded-lg">
                            {editingHospital === hospital.id ? (
                              <div className="flex items-center space-x-3 flex-1">
                                <input
                                  type="text"
                                  value={hospital.id}
                                  onChange={(e) => setHospitals(prev => prev.map(h => 
                                    h.id === hospital.id ? { ...h, id: e.target.value } : h
                                  ))}
                                  className="px-3 py-2 border border-gray-300 rounded-md w-32"
                                />
                                <input
                                  type="text"
                                  value={hospital.name}
                                  onChange={(e) => setHospitals(prev => prev.map(h => 
                                    h.id === hospital.id ? { ...h, name: e.target.value } : h
                                  ))}
                                  className="px-3 py-2 border border-gray-300 rounded-md flex-1"
                                />
                                <button
                                  onClick={() => updateHospital(hospital.id, hospital)}
                                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setEditingHospital(null)}
                                  className="px-3 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between w-full">
                                <div>
                                  <div className="font-medium">{hospital.name}</div>
                                  <div className="text-sm text-gray-500">ID: {hospital.id}</div>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => setEditingHospital(hospital.id)}
                                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </button>
                                  {hospitals.length > 1 && (
                                    <button
                                      onClick={() => removeHospital(hospital.id)}
                                      className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                    >
                                      <Minus className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Codes Tab */}
                {activeSettingsTab === 'codes' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium mb-4">Add New Procedure Code</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                          type="text"
                          placeholder="Code (e.g., '99213')"
                          value={newCode.code}
                          onChange={(e) => setNewCode(prev => ({ ...prev, code: e.target.value }))}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Description"
                          value={newCode.description}
                          onChange={(e) => setNewCode(prev => ({ ...prev, description: e.target.value }))}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={addCode}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Add Code
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-medium mb-4">Current Procedure Codes</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {standardCodes.map(code => (
                          <div key={code.code} className="flex items-center justify-between p-4 border rounded-lg">
                            {editingCode === code.code ? (
                              <div className="flex items-center space-x-3 flex-1">
                                <input
                                  type="text"
                                  value={code.code}
                                  onChange={(e) => setStandardCodes(prev => prev.map(c => 
                                    c.code === code.code ? { ...c, code: e.target.value } : c
                                  ))}
                                  className="px-3 py-2 border border-gray-300 rounded-md w-24"
                                />
                                <input
                                  type="text"
                                  value={code.description}
                                  onChange={(e) => setStandardCodes(prev => prev.map(c => 
                                    c.code === code.code ? { ...c, description: e.target.value } : c
                                  ))}
                                  className="px-3 py-2 border border-gray-300 rounded-md flex-1"
                                />
                                <button
                                  onClick={() => updateCode(code.code, code)}
                                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setEditingCode(null)}
                                  className="px-3 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between w-full">
                                <div>
                                  <div className="font-mono font-medium">{code.code}</div>
                                  <div className="text-sm text-gray-600">{code.description}</div>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => setEditingCode(code.code)}
                                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => removeCode(code.code)}
                                    className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChargeCaptureApp;
