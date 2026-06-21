---
id: proto-007
title: "Co-Immunoprecipitation"
duration: 2 days
actions:
  [
    {
      "id": "act-060",
      "title": "Cell Lysis (NP-40)",
      "duration": "30 min",
      "status": "idle",
      "inputs": [
        "mature_bmdm"
      ],
      "outputs": [
        "np40_lysate"
      ],
      "inventoryRefs": [
        "inv-np40"
      ],
      "variables": []
    },
    {
      "id": "act-061",
      "title": "Protein A/G Bead Preclearing",
      "duration": "1 hr",
      "status": "idle",
      "inputs": [
        "np40_lysate"
      ],
      "outputs": [
        "precleared_lysate"
      ],
      "inventoryRefs": [
        "inv-proteinag-beads"
      ],
      "variables": []
    },
    {
      "id": "act-062",
      "title": "IP 항체 결합",
      "duration": "Overnight",
      "status": "idle",
      "inputs": [
        "precleared_lysate"
      ],
      "outputs": [
        "ip_complex"
      ],
      "inventoryRefs": [
        "inv-aim2-ab"
      ],
      "variables": [
        {
          "name": "ab_amount",
          "options": [
            "1ug",
            "2ug",
            "5ug"
          ],
          "default": "2ug"
        }
      ]
    },
    {
      "id": "act-063",
      "title": "Bead Capture & Wash",
      "duration": "3 hr",
      "status": "idle",
      "inputs": [
        "ip_complex"
      ],
      "outputs": [
        "washed_beads"
      ],
      "inventoryRefs": [
        "inv-proteinag-beads"
      ],
      "variables": [
        {
          "name": "wash_count",
          "options": [
            "3",
            "4",
            "5"
          ],
          "default": "4"
        }
      ]
    },
    {
      "id": "act-064",
      "title": "Elution & WB 진행",
      "duration": "30 min",
      "status": "idle",
      "inputs": [
        "washed_beads"
      ],
      "outputs": [
        "ip_eluate"
      ],
      "inventoryRefs": [],
      "variables": []
    }
  ]
---

단백질-단백질 상호작용 분석
