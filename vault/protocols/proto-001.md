---
id: proto-001
title: "BMDM 추출 및 배양"
duration: 7 days
actions:
  [
    {
      "id": "act-001",
      "title": "마우스 희생 및 뼈 적출",
      "duration": "30 min",
      "status": "complete",
      "inputs": [],
      "outputs": [
        "femur_tibia"
      ],
      "inventoryRefs": [
        "inv-mouse-c57"
      ],
      "variables": [
        {
          "name": "mouse_strain",
          "options": [
            "C57BL/6",
            "BALB/c"
          ],
          "default": "C57BL/6"
        }
      ]
    },
    {
      "id": "act-002",
      "title": "골수 세포 Flushing",
      "duration": "20 min",
      "status": "complete",
      "inputs": [
        "femur_tibia"
      ],
      "outputs": [
        "bone_marrow_cells"
      ],
      "inventoryRefs": [
        "inv-rpmi",
        "inv-syringe-26g"
      ],
      "variables": [
        {
          "name": "media_volume",
          "options": [
            "5ml",
            "10ml"
          ],
          "default": "10ml"
        }
      ]
    },
    {
      "id": "act-003",
      "title": "RBC Lysis",
      "duration": "5 min",
      "status": "complete",
      "inputs": [
        "bone_marrow_cells"
      ],
      "outputs": [
        "bm_cells_lysed"
      ],
      "inventoryRefs": [
        "inv-acklysis"
      ],
      "variables": [
        {
          "name": "lysis_time",
          "options": [
            "3 min",
            "5 min"
          ],
          "default": "5 min"
        }
      ]
    },
    {
      "id": "act-004",
      "title": "1400rpm 원심분리",
      "duration": "5 min",
      "status": "complete",
      "inputs": [
        "bm_cells_lysed"
      ],
      "outputs": [
        "cell_pellet"
      ],
      "inventoryRefs": [],
      "variables": [
        {
          "name": "rpm",
          "options": [
            "1200",
            "1400",
            "1600"
          ],
          "default": "1400"
        },
        {
          "name": "time",
          "options": [
            "3 min",
            "5 min"
          ],
          "default": "5 min"
        }
      ]
    },
    {
      "id": "act-005",
      "title": "M-CSF 배지에 Seeding",
      "duration": "15 min",
      "status": "complete",
      "inputs": [
        "cell_pellet"
      ],
      "outputs": [
        "seeded_bmdm"
      ],
      "inventoryRefs": [
        "inv-mcsf",
        "inv-dmem"
      ],
      "variables": [
        {
          "name": "mcsf_conc",
          "options": [
            "20 ng/ml",
            "50 ng/ml"
          ],
          "default": "20 ng/ml"
        },
        {
          "name": "density",
          "options": [
            "1x10^6",
            "2x10^6"
          ],
          "default": "1x10^6"
        }
      ]
    },
    {
      "id": "act-006",
      "title": "Day 3 배지 교환",
      "duration": "10 min",
      "status": "complete",
      "inputs": [
        "seeded_bmdm"
      ],
      "outputs": [
        "day3_bmdm"
      ],
      "inventoryRefs": [
        "inv-mcsf",
        "inv-dmem"
      ],
      "variables": []
    },
    {
      "id": "act-007",
      "title": "Day 7 수확 및 Re-plating",
      "duration": "30 min",
      "status": "complete",
      "inputs": [
        "day3_bmdm"
      ],
      "outputs": [
        "mature_bmdm"
      ],
      "inventoryRefs": [
        "inv-trypsin"
      ],
      "variables": [
        {
          "name": "plate_format",
          "options": [
            "6-well",
            "12-well",
            "24-well",
            "96-well"
          ],
          "default": "12-well"
        }
      ]
    }
  ]
---

C57BL/6 마우스 대퇴골/경골에서 골수 세포 추출 및 M-CSF 분화
