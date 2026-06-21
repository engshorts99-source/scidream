---
id: proto-003
title: "qPCR (Real-time PCR)"
duration: 1 day
actions:
  [
    {
      "id": "act-020",
      "title": "RNA 추출 (TRIzol)",
      "duration": "1 hr",
      "status": "complete",
      "inputs": [
        "mature_bmdm"
      ],
      "outputs": [
        "total_rna"
      ],
      "inventoryRefs": [
        "inv-trizol"
      ],
      "variables": []
    },
    {
      "id": "act-021",
      "title": "cDNA 합성",
      "duration": "1 hr",
      "status": "complete",
      "inputs": [
        "total_rna"
      ],
      "outputs": [
        "cdna"
      ],
      "inventoryRefs": [
        "inv-cdna-kit"
      ],
      "variables": [
        {
          "name": "rna_input",
          "options": [
            "500ng",
            "1ug",
            "2ug"
          ],
          "default": "1ug"
        }
      ]
    },
    {
      "id": "act-022",
      "title": "qPCR 반응 셋업",
      "duration": "30 min",
      "status": "complete",
      "inputs": [
        "cdna"
      ],
      "outputs": [
        "qpcr_plate"
      ],
      "inventoryRefs": [
        "inv-sybr-green"
      ],
      "variables": [
        {
          "name": "primer_set",
          "options": [
            "TLR2",
            "TLR4",
            "NLRP3",
            "cGAS",
            "STING",
            "ZBP1",
            "AIM2"
          ],
          "default": "ZBP1"
        }
      ]
    },
    {
      "id": "act-023",
      "title": "qPCR 런 및 분석",
      "duration": "2 hr",
      "status": "complete",
      "inputs": [
        "qpcr_plate"
      ],
      "outputs": [
        "ct_values"
      ],
      "inventoryRefs": [],
      "variables": []
    }
  ]
---

mRNA 발현 정량 분석
