const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Sample drug interaction database
const DRUG_INTERACTIONS = [
  {
    drug1: { name: 'warfarin', aliases: ['coumadin'] },
    drug2: { name: 'aspirin' },
    severity: 'high',
    description: 'Increased bleeding risk. Monitor INR closely.',
    recommendations: ['Monitor INR', 'Consider alternative']
  },
  {
    drug1: { name: 'ibuprofen' },
    drug2: { name: 'lisinopril' },
    severity: 'medium',
    description: 'Reduced blood pressure effect.',
    recommendations: ['Monitor BP']
  },
  {
    drug1: { name: 'simvastatin' },
    drug2: { name: 'amiodarone' },
    severity: 'high',
    description: 'Risk of muscle damage.',
    recommendations: ['Reduce statin dose']
  },
  {
    drug1: { name: 'aspirin' },
    drug2: { name: 'ibuprofen' },
    severity: 'medium',
    description: 'Reduced aspirin effectiveness.'
  }
];

const DRUG_ALIASES = {
  'advil': 'ibuprofen',
  'motrin': 'ibuprofen',
  'aleve': 'naproxen',
  'tylenol': 'acetaminophen',
  'viagra': 'sildenafil',
  'lipitor': 'atorvastatin'
};

const normalizeDrug = (name) => {
  name = name.toLowerCase().trim();
  return DRUG_ALIASES[name] || name;
};

// Search endpoint
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);

  const allDrugs = [
    ...DRUG_INTERACTIONS.map(i => i.drug1.name),
    ...DRUG_INTERACTIONS.map(i => i.drug2.name),
    ...Object.values(DRUG_ALIASES),
    'warfarin', 'aspirin', 'ibuprofen', 'lisinopril', 'simvastatin', 'amiodarone'
  ];

  const results = allDrugs
    .filter(drug => drug.includes(q.toLowerCase()))
    .slice(0, 10);

  res.json(results);
});

// Check interactions
app.post('/api/check', (req, res) => {
  try {
    const { drugs } = req.body;
    
    if (!Array.isArray(drugs) || drugs.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 drugs' });
    }

    const normalizedDrugs = drugs.map(normalizeDrug);
    const interactions = [];

    for (let i = 0; i < normalizedDrugs.length; i++) {
      for (let j = i + 1; j < normalizedDrugs.length; j++) {
        const drug1 = normalizedDrugs[i];
        const drug2 = normalizedDrugs[j];

        const interaction = DRUG_INTERACTIONS.find(int => 
          (int.drug1.name === drug1 && int.drug2.name === drug2) ||
          (int.drug1.name === drug2 && int.drug2.name === drug1)
        );

        if (interaction) {
          interactions.push({
            drugs: [drug1, drug2],
            ...interaction
          });
        }
      }
    }

    // Sort by severity
    interactions.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    res.json({
      success: true,
      drugs: normalizedDrugs,
      interactions,
      summary: interactions.length > 0 ? interactions[0].severity : 'none'
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});