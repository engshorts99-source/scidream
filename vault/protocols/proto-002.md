---
id: proto-002
title: "Western Blot"
duration: 2 days
actions:
  [
    {
      "id": "act-010",
      "title": "세포 Lysis (RIPA Buffer)",
      "duration": "30 min",
      "status": "complete",
      "inputs": [
        "mature_bmdm"
      ],
      "outputs": [
        "cell_lysate"
      ],
      "inventoryRefs": [
        "inv-ripa",
        "inv-protease-inhibitor"
      ],
      "variables": [
        {
          "name": "buffer_volume",
          "options": [
            "100ul",
            "200ul",
            "500ul"
          ],
          "default": "200ul"
        }
      ]
    },
    {
      "id": "act-011",
      "title": "BCA Protein Assay",
      "duration": "45 min",
      "status": "complete",
      "inputs": [
        "cell_lysate"
      ],
      "outputs": [
        "quantified_lysate"
      ],
      "inventoryRefs": [
        "inv-bca-kit"
      ],
      "variables": []
    },
    {
      "id": "act-012",
      "title": "SDS-PAGE Gel 전기영동",
      "duration": "1.5 hr",
      "status": "in-progress",
      "inputs": [
        "quantified_lysate"
      ],
      "outputs": [
        "separated_proteins"
      ],
      "inventoryRefs": [
        "inv-gel-4-20"
      ],
      "variables": [
        {
          "name": "gel_percentage",
          "options": [
            "4-20%",
            "10%",
            "12%"
          ],
          "default": "4-20%"
        },
        {
          "name": "loading_amount",
          "options": [
            "20ug",
            "30ug",
            "50ug"
          ],
          "default": "30ug"
        }
      ]
    },
    {
      "id": "act-013",
      "title": "PVDF Membrane Transfer",
      "duration": "1.5 hr",
      "status": "idle",
      "inputs": [
        "separated_proteins"
      ],
      "outputs": [
        "transferred_membrane"
      ],
      "inventoryRefs": [
        "inv-pvdf"
      ],
      "variables": [
        {
          "name": "transfer_method",
          "options": [
            "Wet",
            "Semi-dry"
          ],
          "default": "Wet"
        },
        {
          "name": "transfer_time",
          "options": [
            "60 min",
            "90 min",
            "120 min"
          ],
          "default": "90 min"
        }
      ]
    },
    {
      "id": "act-014",
      "title": "Blocking (5% BSA)",
      "duration": "1 hr",
      "status": "idle",
      "inputs": [
        "transferred_membrane"
      ],
      "outputs": [
        "blocked_membrane"
      ],
      "inventoryRefs": [
        "inv-bsa"
      ],
      "variables": [
        {
          "name": "blocking_agent",
          "options": [
            "5% BSA",
            "5% Skim Milk"
          ],
          "default": "5% BSA"
        }
      ]
    },
    {
      "id": "act-015",
      "title": "1차 항체 부착",
      "duration": "Overnight",
      "status": "idle",
      "inputs": [
        "blocked_membrane"
      ],
      "outputs": [
        "primary_ab_membrane"
      ],
      "inventoryRefs": [
        "inv-casp8-cst4927",
        "inv-gsdmd-abcam"
      ],
      "variables": [
        {
          "name": "dilution",
          "options": [
            "1:500",
            "1:1000",
            "1:2000"
          ],
          "default": "1:1000"
        },
        {
          "name": "temperature",
          "options": [
            "4°C",
            "RT"
          ],
          "default": "4°C"
        }
      ]
    },
    {
      "id": "act-016",
      "title": "2차 항체 부착",
      "duration": "1 hr",
      "status": "idle",
      "inputs": [
        "primary_ab_membrane"
      ],
      "outputs": [
        "secondary_ab_membrane"
      ],
      "inventoryRefs": [
        "inv-anti-rabbit-hrp"
      ],
      "variables": [
        {
          "name": "dilution",
          "options": [
            "1:2000",
            "1:5000",
            "1:10000"
          ],
          "default": "1:5000"
        }
      ]
    },
    {
      "id": "act-017",
      "title": "ECL 발광 및 이미징",
      "duration": "30 min",
      "status": "idle",
      "inputs": [
        "secondary_ab_membrane"
      ],
      "outputs": [
        "wb_image"
      ],
      "inventoryRefs": [
        "inv-ecl-substrate"
      ],
      "variables": [
        {
          "name": "exposure_time",
          "options": [
            "Auto",
            "30s",
            "1 min",
            "5 min"
          ],
          "default": "Auto"
        }
      ]
    }
  ]
---

단백질 발현 분석을 위한 웨스턴 블롯
