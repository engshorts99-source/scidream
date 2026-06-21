---
id: proto-006
title: "In Vivo 감염 모델"
duration: 14 days
actions:
  [
    {
      "id": "act-050",
      "title": "마우스 그룹 배정",
      "duration": "1 hr",
      "status": "in-progress",
      "inputs": [],
      "outputs": [
        "grouped_mice"
      ],
      "inventoryRefs": [
        "inv-mouse-c57",
        "inv-mouse-zbp1ko"
      ],
      "variables": [
        {
          "name": "n_per_group",
          "options": [
            "5",
            "8",
            "10"
          ],
          "default": "8"
        }
      ]
    },
    {
      "id": "act-051",
      "title": "비강내 바이러스 접종",
      "duration": "30 min",
      "status": "idle",
      "inputs": [
        "grouped_mice"
      ],
      "outputs": [
        "infected_mice"
      ],
      "inventoryRefs": [
        "inv-iav-pr8"
      ],
      "variables": [
        {
          "name": "dose_pfu",
          "options": [
            "50",
            "100",
            "500"
          ],
          "default": "100"
        }
      ]
    },
    {
      "id": "act-052",
      "title": "체중 및 생존률 모니터링",
      "duration": "14 days",
      "status": "idle",
      "inputs": [
        "infected_mice"
      ],
      "outputs": [
        "survival_data"
      ],
      "inventoryRefs": [],
      "variables": []
    }
  ]
---

마우스 바이러스 감염 및 모니터링
