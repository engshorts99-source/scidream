/**
 * Scidream v1.4 — Sample Dataset
 * Domain: Immunology / Innate Immunity / PANoptosis Research
 *
 * 6-Tier Hierarchy:
 *   Dream → Project → Manuscript → Figure → Experiment → Protocol → Action Fragment
 *   + Inventory Object (parallel resource preset)
 *
 * ID Prefixes:
 *   dream-  | proj-  | ms-  | fig-  | exp-  | proto-  | act-  | inv-
 */

export default {
  // ──────────────────────────────────────────────
  // TIER 1 — DREAM (Vision)
  // ──────────────────────────────────────────────
  dreams: [
    {
      id: 'dream-001',
      title: '모든 감염성 질환의 정복과 치료',
      description: '바이러스, 박테리아, 진균 감염에 대한 근본적 치료법 개발',
      status: 'active',
      createdAt: '2024-01-15',
      children: ['proj-001', 'proj-002']
    }
  ],

  // ──────────────────────────────────────────────
  // TIER 2 — PROJECT (Strategy)
  // ──────────────────────────────────────────────
  projects: [
    {
      id: 'proj-001',
      parentId: 'dream-001',
      title: '바이러스 면역학 연구',
      description: '선천면역 수용체(PRR)와 바이러스 리간드의 상호작용 규명',
      status: 'active',
      children: ['ms-010', 'ms-011']
    },
    {
      id: 'proj-002',
      parentId: 'dream-001',
      title: '세포사멸 기전 연구',
      description: 'PANoptosis 및 프로그래밍된 세포사멸 경로 분석',
      status: 'active',
      children: ['ms-012']
    }
  ],

  // ──────────────────────────────────────────────
  // TIER 3 — MANUSCRIPT (Dashboard)
  // ──────────────────────────────────────────────
  manuscripts: [
    {
      id: 'ms-010',
      parentId: 'proj-001',
      title: 'MS #10: Mapping ligand-PRR interaction landscapes',
      description: '다양한 병원체 유래 리간드와 패턴인식수용체 간의 상호작용 지도 작성',
      status: 'in-progress',
      journal: 'Nature Immunology',
      children: ['fig-001', 'fig-002', 'fig-003']
    },
    {
      id: 'ms-011',
      parentId: 'proj-001',
      title: 'MS #11: STING pathway in antiviral defense',
      description: 'cGAS-STING 경로의 항바이러스 방어 기전 연구',
      status: 'planning',
      journal: 'Cell Host & Microbe',
      children: ['fig-004']
    },
    {
      id: 'ms-012',
      parentId: 'proj-002',
      title: 'MS #12: ZBP1-driven PANoptosis in viral infection',
      description: 'ZBP1 매개 PANoptosis의 바이러스 감염 방어 역할',
      status: 'in-progress',
      journal: 'Immunity',
      children: ['fig-005', 'fig-006']
    }
  ],

  // ──────────────────────────────────────────────
  // TIER 4 — FIGURE (Result)
  // ──────────────────────────────────────────────
  figures: [
    {
      id: 'fig-001',
      parentId: 'ms-010',
      title: 'Figure 1. PRR Expression Profile in BMDMs',
      description: 'BMDM에서의 PRR 발현 프로파일 (qPCR + WB)',
      status: 'complete',
      children: ['exp-001']
    },
    {
      id: 'fig-002',
      parentId: 'ms-010',
      title: 'Figure 2. PANoptosis Markers Western Blot',
      description: 'GSDMD, Caspase-1, Caspase-8, MLKL 활성화 분석',
      status: 'in-progress',
      children: ['exp-002', 'exp-003']
    },
    {
      id: 'fig-003',
      parentId: 'ms-010',
      title: 'Figure 3. Ligand Screening Heatmap',
      description: '20종 리간드의 세포사멸 유도 스크리닝 결과',
      status: 'planning',
      children: ['exp-004']
    },
    {
      id: 'fig-004',
      parentId: 'ms-011',
      title: 'Figure 1. cGAS-STING Activation Kinetics',
      description: 'cGAS-STING 활성화 시간 경과 분석',
      status: 'planning',
      children: []
    },
    {
      id: 'fig-005',
      parentId: 'ms-012',
      title: 'Figure 1. ZBP1 KO vs WT Survival Curve',
      description: 'ZBP1 녹아웃 마우스 생존률 비교',
      status: 'in-progress',
      children: ['exp-005']
    },
    {
      id: 'fig-006',
      parentId: 'ms-012',
      title: 'Figure 2. AIM2 Inflammasome Assembly',
      description: 'AIM2 인플라마좀 복합체 형성 분석',
      status: 'planning',
      children: ['exp-006']
    }
  ],

  // ──────────────────────────────────────────────
  // TIER 5 — EXPERIMENT (Batch)
  // ──────────────────────────────────────────────
  experiments: [
    {
      id: 'exp-001',
      parentId: 'fig-001',
      title: 'WT BMDM qPCR Profiling',
      description: 'Wild-type C57BL/6 BMDM에서 PRR mRNA 발현 프로파일',
      status: 'complete',
      children: ['proto-001', 'proto-003']
    },
    {
      id: 'exp-002',
      parentId: 'fig-002',
      title: 'Zbp1/Aim2 KO 마우스 모델 Ligand 스크리닝',
      description: 'ZBP1, AIM2 단독 및 이중 녹아웃 BMDM에 다양한 리간드 처리 후 세포사멸 마커 분석',
      status: 'in-progress',
      children: ['proto-001', 'proto-002', 'proto-004']
    },
    {
      id: 'exp-003',
      parentId: 'fig-002',
      title: 'NLRP3 Inhibition with MCC950',
      description: 'MCC950 처리 후 Caspase-1 활성화 억제 확인',
      status: 'planning',
      children: ['proto-001', 'proto-002']
    },
    {
      id: 'exp-004',
      parentId: 'fig-003',
      title: '20-Ligand Panel Screening',
      description: 'LPS, Poly(I:C), Flagellin 등 20종 리간드 스크리닝',
      status: 'planning',
      children: ['proto-001', 'proto-005']
    },
    {
      id: 'exp-005',
      parentId: 'fig-005',
      title: 'ZBP1 KO Mouse IAV Challenge',
      description: 'ZBP1 녹아웃 마우스 인플루엔자 바이러스 감염 실험',
      status: 'in-progress',
      children: ['proto-006']
    },
    {
      id: 'exp-006',
      parentId: 'fig-006',
      title: 'AIM2 Co-IP and Confocal',
      description: 'AIM2-ASC 공동면역침전 및 공초점 현미경 분석',
      status: 'planning',
      children: ['proto-002', 'proto-007']
    }
  ],

  // ──────────────────────────────────────────────
  // TIER 6 — PROTOCOL (Tactics) + Action Fragments
  // ──────────────────────────────────────────────
  protocols: [
    {
      id: 'proto-001',
      title: 'BMDM 추출 및 배양',
      description: 'C57BL/6 마우스 대퇴골/경골에서 골수 세포 추출 및 M-CSF 분화',
      duration: '7 days',
      actions: [
        {
          id: 'act-001',
          title: '마우스 희생 및 뼈 적출',
          duration: '30 min',
          status: 'complete',
          inputs: [],
          outputs: ['femur_tibia'],
          inventoryRefs: ['inv-mouse-c57'],
          variables: [{ name: 'mouse_strain', options: ['C57BL/6', 'BALB/c'], default: 'C57BL/6' }]
        },
        {
          id: 'act-002',
          title: '골수 세포 Flushing',
          duration: '20 min',
          status: 'complete',
          inputs: ['femur_tibia'],
          outputs: ['bone_marrow_cells'],
          inventoryRefs: ['inv-rpmi', 'inv-syringe-26g'],
          variables: [{ name: 'media_volume', options: ['5ml', '10ml'], default: '10ml' }]
        },
        {
          id: 'act-003',
          title: 'RBC Lysis',
          duration: '5 min',
          status: 'complete',
          inputs: ['bone_marrow_cells'],
          outputs: ['bm_cells_lysed'],
          inventoryRefs: ['inv-acklysis'],
          variables: [{ name: 'lysis_time', options: ['3 min', '5 min'], default: '5 min' }]
        },
        {
          id: 'act-004',
          title: '1400rpm 원심분리',
          duration: '5 min',
          status: 'complete',
          inputs: ['bm_cells_lysed'],
          outputs: ['cell_pellet'],
          inventoryRefs: [],
          variables: [
            { name: 'rpm', options: ['1200', '1400', '1600'], default: '1400' },
            { name: 'time', options: ['3 min', '5 min'], default: '5 min' }
          ]
        },
        {
          id: 'act-005',
          title: 'M-CSF 배지에 Seeding',
          duration: '15 min',
          status: 'complete',
          inputs: ['cell_pellet'],
          outputs: ['seeded_bmdm'],
          inventoryRefs: ['inv-mcsf', 'inv-dmem'],
          variables: [
            { name: 'mcsf_conc', options: ['20 ng/ml', '50 ng/ml'], default: '20 ng/ml' },
            { name: 'density', options: ['1x10^6', '2x10^6'], default: '1x10^6' }
          ]
        },
        {
          id: 'act-006',
          title: 'Day 3 배지 교환',
          duration: '10 min',
          status: 'complete',
          inputs: ['seeded_bmdm'],
          outputs: ['day3_bmdm'],
          inventoryRefs: ['inv-mcsf', 'inv-dmem'],
          variables: []
        },
        {
          id: 'act-007',
          title: 'Day 7 수확 및 Re-plating',
          duration: '30 min',
          status: 'complete',
          inputs: ['day3_bmdm'],
          outputs: ['mature_bmdm'],
          inventoryRefs: ['inv-trypsin'],
          variables: [{ name: 'plate_format', options: ['6-well', '12-well', '24-well', '96-well'], default: '12-well' }]
        }
      ]
    },
    {
      id: 'proto-002',
      title: 'Western Blot',
      description: '단백질 발현 분석을 위한 웨스턴 블롯',
      duration: '2 days',
      actions: [
        {
          id: 'act-010',
          title: '세포 Lysis (RIPA Buffer)',
          duration: '30 min',
          status: 'complete',
          inputs: ['mature_bmdm'],
          outputs: ['cell_lysate'],
          inventoryRefs: ['inv-ripa', 'inv-protease-inhibitor'],
          variables: [{ name: 'buffer_volume', options: ['100ul', '200ul', '500ul'], default: '200ul' }]
        },
        {
          id: 'act-011',
          title: 'BCA Protein Assay',
          duration: '45 min',
          status: 'complete',
          inputs: ['cell_lysate'],
          outputs: ['quantified_lysate'],
          inventoryRefs: ['inv-bca-kit'],
          variables: []
        },
        {
          id: 'act-012',
          title: 'SDS-PAGE Gel 전기영동',
          duration: '1.5 hr',
          status: 'in-progress',
          inputs: ['quantified_lysate'],
          outputs: ['separated_proteins'],
          inventoryRefs: ['inv-gel-4-20'],
          variables: [
            { name: 'gel_percentage', options: ['4-20%', '10%', '12%'], default: '4-20%' },
            { name: 'loading_amount', options: ['20ug', '30ug', '50ug'], default: '30ug' }
          ]
        },
        {
          id: 'act-013',
          title: 'PVDF Membrane Transfer',
          duration: '1.5 hr',
          status: 'idle',
          inputs: ['separated_proteins'],
          outputs: ['transferred_membrane'],
          inventoryRefs: ['inv-pvdf'],
          variables: [
            { name: 'transfer_method', options: ['Wet', 'Semi-dry'], default: 'Wet' },
            { name: 'transfer_time', options: ['60 min', '90 min', '120 min'], default: '90 min' }
          ]
        },
        {
          id: 'act-014',
          title: 'Blocking (5% BSA)',
          duration: '1 hr',
          status: 'idle',
          inputs: ['transferred_membrane'],
          outputs: ['blocked_membrane'],
          inventoryRefs: ['inv-bsa'],
          variables: [{ name: 'blocking_agent', options: ['5% BSA', '5% Skim Milk'], default: '5% BSA' }]
        },
        {
          id: 'act-015',
          title: '1차 항체 부착',
          duration: 'Overnight',
          status: 'idle',
          inputs: ['blocked_membrane'],
          outputs: ['primary_ab_membrane'],
          inventoryRefs: ['inv-casp8-cst4927', 'inv-gsdmd-abcam'],
          variables: [
            { name: 'dilution', options: ['1:500', '1:1000', '1:2000'], default: '1:1000' },
            { name: 'temperature', options: ['4°C', 'RT'], default: '4°C' }
          ]
        },
        {
          id: 'act-016',
          title: '2차 항체 부착',
          duration: '1 hr',
          status: 'idle',
          inputs: ['primary_ab_membrane'],
          outputs: ['secondary_ab_membrane'],
          inventoryRefs: ['inv-anti-rabbit-hrp'],
          variables: [{ name: 'dilution', options: ['1:2000', '1:5000', '1:10000'], default: '1:5000' }]
        },
        {
          id: 'act-017',
          title: 'ECL 발광 및 이미징',
          duration: '30 min',
          status: 'idle',
          inputs: ['secondary_ab_membrane'],
          outputs: ['wb_image'],
          inventoryRefs: ['inv-ecl-substrate'],
          variables: [{ name: 'exposure_time', options: ['Auto', '30s', '1 min', '5 min'], default: 'Auto' }]
        }
      ]
    },
    {
      id: 'proto-003',
      title: 'qPCR (Real-time PCR)',
      description: 'mRNA 발현 정량 분석',
      duration: '1 day',
      actions: [
        {
          id: 'act-020',
          title: 'RNA 추출 (TRIzol)',
          duration: '1 hr',
          status: 'complete',
          inputs: ['mature_bmdm'],
          outputs: ['total_rna'],
          inventoryRefs: ['inv-trizol'],
          variables: []
        },
        {
          id: 'act-021',
          title: 'cDNA 합성',
          duration: '1 hr',
          status: 'complete',
          inputs: ['total_rna'],
          outputs: ['cdna'],
          inventoryRefs: ['inv-cdna-kit'],
          variables: [{ name: 'rna_input', options: ['500ng', '1ug', '2ug'], default: '1ug' }]
        },
        {
          id: 'act-022',
          title: 'qPCR 반응 셋업',
          duration: '30 min',
          status: 'complete',
          inputs: ['cdna'],
          outputs: ['qpcr_plate'],
          inventoryRefs: ['inv-sybr-green'],
          variables: [{ name: 'primer_set', options: ['TLR2', 'TLR4', 'NLRP3', 'cGAS', 'STING', 'ZBP1', 'AIM2'], default: 'ZBP1' }]
        },
        {
          id: 'act-023',
          title: 'qPCR 런 및 분석',
          duration: '2 hr',
          status: 'complete',
          inputs: ['qpcr_plate'],
          outputs: ['ct_values'],
          inventoryRefs: [],
          variables: []
        }
      ]
    },
    {
      id: 'proto-004',
      title: 'LDH Assay (세포사멸 측정)',
      description: 'LDH 방출 기반 세포사멸 정량',
      duration: '4 hr',
      actions: [
        {
          id: 'act-030',
          title: '상층액 수집',
          duration: '10 min',
          status: 'idle',
          inputs: ['mature_bmdm'],
          outputs: ['supernatant'],
          inventoryRefs: [],
          variables: []
        },
        {
          id: 'act-031',
          title: 'LDH 시약 반응',
          duration: '30 min',
          status: 'idle',
          inputs: ['supernatant'],
          outputs: ['ldh_reaction'],
          inventoryRefs: ['inv-ldh-kit'],
          variables: []
        },
        {
          id: 'act-032',
          title: '흡광도 측정 (490nm)',
          duration: '15 min',
          status: 'idle',
          inputs: ['ldh_reaction'],
          outputs: ['ldh_values'],
          inventoryRefs: [],
          variables: []
        }
      ]
    },
    {
      id: 'proto-005',
      title: 'ELISA (사이토카인 측정)',
      description: 'IL-1β, TNF-α, IL-18 등 사이토카인 정량',
      duration: '2 days',
      actions: [
        {
          id: 'act-040',
          title: 'Capture Ab 코팅',
          duration: 'Overnight',
          status: 'idle',
          inputs: [],
          outputs: ['coated_plate'],
          inventoryRefs: ['inv-elisa-il1b'],
          variables: [{ name: 'target', options: ['IL-1β', 'TNF-α', 'IL-18', 'IFN-β'], default: 'IL-1β' }]
        },
        {
          id: 'act-041',
          title: '샘플 및 Standard 로딩',
          duration: '2 hr',
          status: 'idle',
          inputs: ['coated_plate', 'supernatant'],
          outputs: ['loaded_plate'],
          inventoryRefs: [],
          variables: []
        },
        {
          id: 'act-042',
          title: 'Detection Ab + HRP',
          duration: '2 hr',
          status: 'idle',
          inputs: ['loaded_plate'],
          outputs: ['detected_plate'],
          inventoryRefs: [],
          variables: []
        },
        {
          id: 'act-043',
          title: 'TMB 발색 및 측정',
          duration: '30 min',
          status: 'idle',
          inputs: ['detected_plate'],
          outputs: ['elisa_values'],
          inventoryRefs: ['inv-tmb'],
          variables: []
        }
      ]
    },
    {
      id: 'proto-006',
      title: 'In Vivo 감염 모델',
      description: '마우스 바이러스 감염 및 모니터링',
      duration: '14 days',
      actions: [
        {
          id: 'act-050',
          title: '마우스 그룹 배정',
          duration: '1 hr',
          status: 'in-progress',
          inputs: [],
          outputs: ['grouped_mice'],
          inventoryRefs: ['inv-mouse-c57', 'inv-mouse-zbp1ko'],
          variables: [{ name: 'n_per_group', options: ['5', '8', '10'], default: '8' }]
        },
        {
          id: 'act-051',
          title: '비강내 바이러스 접종',
          duration: '30 min',
          status: 'idle',
          inputs: ['grouped_mice'],
          outputs: ['infected_mice'],
          inventoryRefs: ['inv-iav-pr8'],
          variables: [{ name: 'dose_pfu', options: ['50', '100', '500'], default: '100' }]
        },
        {
          id: 'act-052',
          title: '체중 및 생존률 모니터링',
          duration: '14 days',
          status: 'idle',
          inputs: ['infected_mice'],
          outputs: ['survival_data'],
          inventoryRefs: [],
          variables: []
        }
      ]
    },
    {
      id: 'proto-007',
      title: 'Co-Immunoprecipitation',
      description: '단백질-단백질 상호작용 분석',
      duration: '2 days',
      actions: [
        {
          id: 'act-060',
          title: 'Cell Lysis (NP-40)',
          duration: '30 min',
          status: 'idle',
          inputs: ['mature_bmdm'],
          outputs: ['np40_lysate'],
          inventoryRefs: ['inv-np40'],
          variables: []
        },
        {
          id: 'act-061',
          title: 'Protein A/G Bead Preclearing',
          duration: '1 hr',
          status: 'idle',
          inputs: ['np40_lysate'],
          outputs: ['precleared_lysate'],
          inventoryRefs: ['inv-proteinag-beads'],
          variables: []
        },
        {
          id: 'act-062',
          title: 'IP 항체 결합',
          duration: 'Overnight',
          status: 'idle',
          inputs: ['precleared_lysate'],
          outputs: ['ip_complex'],
          inventoryRefs: ['inv-aim2-ab'],
          variables: [{ name: 'ab_amount', options: ['1ug', '2ug', '5ug'], default: '2ug' }]
        },
        {
          id: 'act-063',
          title: 'Bead Capture & Wash',
          duration: '3 hr',
          status: 'idle',
          inputs: ['ip_complex'],
          outputs: ['washed_beads'],
          inventoryRefs: ['inv-proteinag-beads'],
          variables: [{ name: 'wash_count', options: ['3', '4', '5'], default: '4' }]
        },
        {
          id: 'act-064',
          title: 'Elution & WB 진행',
          duration: '30 min',
          status: 'idle',
          inputs: ['washed_beads'],
          outputs: ['ip_eluate'],
          inventoryRefs: [],
          variables: []
        }
      ]
    }
  ],

  // ──────────────────────────────────────────────
  // INVENTORY OBJECTS (Parallel Resource Presets)
  // ──────────────────────────────────────────────
  inventory: [
    { id: 'inv-mouse-c57', name: 'C57BL/6J Mouse', category: 'Animal', supplier: 'Jackson Lab', catalog: '000664', details: '6-8 weeks, male/female', storage: 'Animal facility' },
    { id: 'inv-mouse-zbp1ko', name: 'Zbp1⁻/⁻ Mouse (C57BL/6 bg)', category: 'Animal', supplier: 'In-house colony', catalog: 'N/A', details: 'ZBP1 knockout, backcrossed >10 gen', storage: 'Animal facility' },
    { id: 'inv-rpmi', name: 'RPMI 1640', category: 'Media', supplier: 'Gibco', catalog: '11875-093', details: '+10% FBS, +1% P/S', storage: '4°C' },
    { id: 'inv-dmem', name: 'DMEM High Glucose', category: 'Media', supplier: 'Gibco', catalog: '11965-092', details: '+10% FBS, +1% P/S, +M-CSF', storage: '4°C' },
    { id: 'inv-mcsf', name: 'M-CSF (Recombinant Mouse)', category: 'Cytokine', supplier: 'PeproTech', catalog: '315-02', details: 'Working: 20 ng/ml', storage: '-20°C' },
    { id: 'inv-syringe-26g', name: '26G Syringe', category: 'Consumable', supplier: 'BD', catalog: '309625', details: '1ml tuberculin syringe', storage: 'RT' },
    { id: 'inv-acklysis', name: 'ACK Lysis Buffer', category: 'Buffer', supplier: 'Gibco', catalog: 'A10492-01', details: 'RBC lysis, 1-5 min RT', storage: 'RT' },
    { id: 'inv-trypsin', name: 'Trypsin-EDTA 0.25%', category: 'Reagent', supplier: 'Gibco', catalog: '25200-056', details: 'Cell detachment, 3-5 min 37°C', storage: '4°C' },
    { id: 'inv-ripa', name: 'RIPA Lysis Buffer', category: 'Buffer', supplier: 'Thermo', catalog: '89900', details: '+1x HALT Protease/Phosphatase Inhibitor', storage: '4°C' },
    { id: 'inv-protease-inhibitor', name: 'HALT Protease/Phosphatase Inhibitor', category: 'Reagent', supplier: 'Thermo', catalog: '78440', details: '100x stock, add fresh', storage: '-20°C' },
    { id: 'inv-bca-kit', name: 'Pierce BCA Protein Assay Kit', category: 'Kit', supplier: 'Thermo', catalog: '23225', details: '562nm absorbance', storage: 'RT' },
    { id: 'inv-gel-4-20', name: 'Mini-PROTEAN TGX Gel 4-20%', category: 'Consumable', supplier: 'Bio-Rad', catalog: '4561096', details: '15-well, gradient gel', storage: '4°C' },
    { id: 'inv-pvdf', name: 'PVDF Membrane 0.2μm', category: 'Consumable', supplier: 'Bio-Rad', catalog: '1620177', details: 'Methanol activation required', storage: 'RT' },
    { id: 'inv-bsa', name: 'BSA Fraction V', category: 'Reagent', supplier: 'Sigma', catalog: 'A7906', details: '5% in TBST for blocking', storage: '4°C' },
    { id: 'inv-casp8-cst4927', name: 'Caspase-8 Antibody', category: 'Antibody', supplier: 'Cell Signaling Technology', catalog: '#4927', details: 'Rabbit polyclonal, 1:1000 dilution, 57 kDa (full) / 43,18 kDa (cleaved)', storage: '-20°C' },
    { id: 'inv-gsdmd-abcam', name: 'GSDMD Antibody', category: 'Antibody', supplier: 'Abcam', catalog: 'ab209845', details: 'Rabbit monoclonal [EPR19828], 1:1000, 53 kDa (full) / 31 kDa (N-terminal)', storage: '-20°C' },
    { id: 'inv-anti-rabbit-hrp', name: 'Anti-Rabbit IgG HRP', category: 'Antibody', supplier: 'Cell Signaling Technology', catalog: '#7074', details: '2nd antibody, 1:5000 dilution', storage: '-20°C' },
    { id: 'inv-ecl-substrate', name: 'SuperSignal West Pico PLUS', category: 'Reagent', supplier: 'Thermo', catalog: '34580', details: 'ECL chemiluminescent substrate', storage: '4°C' },
    { id: 'inv-trizol', name: 'TRIzol Reagent', category: 'Reagent', supplier: 'Invitrogen', catalog: '15596026', details: 'RNA extraction, phenol-based', storage: '4°C' },
    { id: 'inv-cdna-kit', name: 'High-Capacity cDNA RT Kit', category: 'Kit', supplier: 'Applied Biosystems', catalog: '4368814', details: 'Random primers, 1ug RNA input', storage: '-20°C' },
    { id: 'inv-sybr-green', name: 'PowerUp SYBR Green Master Mix', category: 'Reagent', supplier: 'Applied Biosystems', catalog: 'A25742', details: '2x master mix', storage: '-20°C' },
    { id: 'inv-ldh-kit', name: 'CytoTox 96 Non-Radio Cytotoxicity Assay', category: 'Kit', supplier: 'Promega', catalog: 'G1780', details: 'LDH release, 490nm', storage: '-20°C' },
    { id: 'inv-elisa-il1b', name: 'Mouse IL-1β ELISA Kit', category: 'Kit', supplier: 'R&D Systems', catalog: 'DY401', details: 'DuoSet ELISA', storage: '-20°C' },
    { id: 'inv-tmb', name: 'TMB Substrate Solution', category: 'Reagent', supplier: 'BD', catalog: '555214', details: 'OptEIA TMB, stop with H2SO4', storage: '4°C' },
    { id: 'inv-iav-pr8', name: 'Influenza A/PR/8/34 (H1N1)', category: 'Virus', supplier: 'ATCC', catalog: 'VR-95', details: 'Mouse-adapted, lethal dose ~100 PFU i.n.', storage: '-80°C' },
    { id: 'inv-np40', name: 'NP-40 Lysis Buffer', category: 'Buffer', supplier: 'Thermo', catalog: 'FNN0021', details: '1% NP-40, 150mM NaCl, 50mM Tris pH 7.4', storage: '4°C' },
    { id: 'inv-proteinag-beads', name: 'Protein A/G Magnetic Beads', category: 'Reagent', supplier: 'Thermo', catalog: '88802', details: 'Pierce Protein A/G, 25ul/rxn', storage: '4°C' },
    { id: 'inv-aim2-ab', name: 'AIM2 Antibody (IP grade)', category: 'Antibody', supplier: 'Cell Signaling Technology', catalog: '#63660', details: 'Rabbit mAb, IP/WB, 1:50 for IP', storage: '-20°C' }
  ]
};
